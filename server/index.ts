import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getSession } from "./auth/googleAuth";
import passport from "passport";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// --- 1. ENVIRONMENT VALIDATION (Maintainability) ---
const REQUIRED_ENV = [
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SESSION_SECRET",
  "APP_URL",
  "DO_SPACES_ENDPOINT",
  "DO_SPACES_KEY",
  "DO_SPACES_SECRET",
  "DO_SPACES_BUCKET"
];

const missingEnv = REQUIRED_ENV.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(", ")}`);
  // In production, we might want to exit, but let's just log for now to avoid bricking the app if user is still configuring
  if (process.env.NODE_ENV === "production") {
    console.warn("[WARN] Application starting with missing production environment variables.");
  }
}

// In DigitalOcean, internal requests between services or to the DB 
// often use self-signed certificates. We need to tell Node to allow them.
if (process.env.NODE_ENV === "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const app = express();

// --- 2. SECURITY (Security & Scalability) ---
// Trust proxy settings MUST be set before ANY session/auth middleware
app.set("trust proxy", 1); 

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT?.replace('https://', '')}`],
      connectSrc: ["'self'", "https://accounts.google.com", "*.digitaloceanspaces.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some third-party scripts/images
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
  skip: (req) => req.path.startsWith("/static") || req.path.startsWith("/assets"), // Don't rate limit static files
});

// Apply rate limiter to all requests
app.use(limiter);

// Log database connection info (masked for security)
const dbUrl = process.env.DATABASE_URL || "";
const maskedDbUrl = dbUrl.replace(/:([^@]+)@/, ":****@");
console.log(`[DB] Connecting to: ${maskedDbUrl}`);

// Check for required tables at startup and bootstrap if missing
import { sql } from "drizzle-orm";
import { db } from "./db";

async function bootstrapDatabase() {
  try {
    console.log("[DB] Startup check: verifying database tables and enums...");
    
    // Ensure pgcrypto extension is available for gen_random_uuid()
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // 1. Ensure all Enums exist
    const enums = [
      { name: 'user_role', values: ['shipper', 'transporter', 'admin'] },
      { name: 'load_status', values: ['posted', 'bidding', 'accepted', 'in_transit', 'delivered', 'cancelled'] },
      { name: 'bid_status', values: ['pending', 'accepted', 'rejected', 'withdrawn'] },
      { name: 'cargo_type', values: ['general', 'perishable', 'hazardous', 'fragile', 'livestock', 'machinery', 'bulk', 'containerized'] },
      { name: 'document_type', values: ['id_document', 'drivers_license', 'vehicle_registration', 'insurance', 'proof_of_delivery', 'invoice', 'delivery_note', 'shipment_note', 'waybill', 'signed_pod', 'payment_proof', 'other'] },
      { name: 'payment_status', values: ['pending', 'pod_submitted', 'pod_confirmed', 'payment_requested', 'paid'] },
      { name: 'document_status', values: ['pending', 'verified', 'rejected'] },
      { name: 'dispute_status', values: ['open', 'under_review', 'resolved', 'closed'] },
      { name: 'transaction_type', values: ['deposit', 'commission_deduction', 'refund', 'withdrawal'] },
      { name: 'transaction_status', values: ['pending', 'completed', 'failed', 'cancelled'] }
    ];

    for (const e of enums) {
      await db.execute(sql`
        DO $$ BEGIN
          CREATE TYPE ${sql.raw(e.name)} AS ENUM (${sql.raw(e.values.map(v => `'${v}'`).join(', '))});
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `);
    }

    // 2. Users Table (Core Auth)
    try {
      await db.execute(sql`SELECT first_name FROM users LIMIT 1`);
    } catch (err) {
      console.log("[DB] 'users' table schema mismatch, recreating...");
      await db.execute(sql`DROP TABLE IF EXISTS "users" CASCADE`);
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar UNIQUE,
        "first_name" varchar,
        "last_name" varchar,
        "profile_image_url" varchar,
        "terms_accepted" boolean DEFAULT false,
        "terms_accepted_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    
    // 3. Sessions Table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar PRIMARY KEY,
        "sess" jsonb NOT NULL,
        "expire" timestamp NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");
    `);

    // 4. User Profiles
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_profiles" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" varchar NOT NULL UNIQUE,
        "role" user_role NOT NULL DEFAULT 'shipper',
        "company_name" varchar,
        "phone_number" varchar,
        "address" text,
        "city" varchar,
        "is_verified" boolean DEFAULT false,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_user_profiles_user_id" ON "user_profiles" ("user_id");
    `);

    // 5. Trucks
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "trucks" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" varchar NOT NULL,
        "registration_number" varchar NOT NULL,
        "truck_type" varchar NOT NULL,
        "capacity" decimal(10, 2) NOT NULL,
        "capacity_unit" varchar DEFAULT 'tons',
        "is_available" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_trucks_owner" ON "trucks" ("owner_id");
    `);

    // 6. Loads
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "loads" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "shipper_id" varchar NOT NULL,
        "title" varchar NOT NULL,
        "description" text,
        "cargo_type" cargo_type NOT NULL DEFAULT 'general',
        "weight" decimal(10, 2) NOT NULL,
        "weight_unit" varchar DEFAULT 'tonnes',
        "origin_city" varchar NOT NULL,
        "origin_address" text,
        "destination_city" varchar NOT NULL,
        "destination_address" text,
        "distance_km" decimal(10, 2),
        "pickup_date" timestamp,
        "delivery_date" timestamp,
        "budget" decimal(12, 2),
        "base_price" decimal(12, 2),
        "shipper_tip" decimal(12, 2) DEFAULT 0,
        "total_price" decimal(12, 2),
        "currency" varchar DEFAULT 'USD',
        "status" load_status NOT NULL DEFAULT 'posted',
        "special_instructions" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 7. Bids
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "bids" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "load_id" varchar NOT NULL,
        "transporter_id" varchar NOT NULL,
        "truck_id" varchar,
        "amount" decimal(12, 2) NOT NULL,
        "currency" varchar DEFAULT 'USD',
        "estimated_days" integer,
        "notes" text,
        "reserved_commission" decimal(12, 2) DEFAULT 0,
        "status" bid_status NOT NULL DEFAULT 'pending',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 8. Jobs
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "jobs" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "load_id" varchar NOT NULL UNIQUE,
        "bid_id" varchar NOT NULL UNIQUE,
        "shipper_id" varchar NOT NULL,
        "transporter_id" varchar NOT NULL,
        "agreed_amount" decimal(12, 2) NOT NULL,
        "currency" varchar DEFAULT 'USD',
        "status" load_status NOT NULL DEFAULT 'accepted',
        "payment_status" payment_status NOT NULL DEFAULT 'pending',
        "pickup_confirmed_at" timestamp,
        "delivery_confirmed_at" timestamp,
        "pod_submitted_at" timestamp,
        "pod_confirmed_at" timestamp,
        "payment_requested_at" timestamp,
        "paid_at" timestamp,
        "pod_notes" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 9. Documents
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" varchar NOT NULL,
        "job_id" varchar,
        "document_type" document_type NOT NULL,
        "file_name" varchar NOT NULL,
        "file_url" text NOT NULL,
        "file_size" integer,
        "status" document_status NOT NULL DEFAULT 'pending',
        "verified_by" varchar,
        "verified_at" timestamp,
        "rejection_reason" text,
        "created_at" timestamp DEFAULT now()
      );
    `);

    // 10. Messages
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "sender_id" varchar NOT NULL,
        "receiver_id" varchar NOT NULL,
        "job_id" varchar,
        "load_id" varchar,
        "content" text NOT NULL,
        "is_read" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now()
      );
    `);

    // 11. Wallets & Transactions
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "wallets" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" varchar NOT NULL UNIQUE,
        "balance" decimal(12, 2) NOT NULL DEFAULT 0,
        "reserved_balance" decimal(12, 2) NOT NULL DEFAULT 0,
        "currency" varchar DEFAULT 'USD',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
      
      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "wallet_id" varchar NOT NULL,
        "user_id" varchar NOT NULL,
        "type" transaction_type NOT NULL,
        "amount" decimal(12, 2) NOT NULL,
        "currency" varchar DEFAULT 'USD',
        "status" transaction_status NOT NULL DEFAULT 'pending',
        "reference" varchar,
        "job_id" varchar,
        "paynow_poll_url" text,
        "paynow_reference" varchar,
        "description" text,
        "created_at" timestamp DEFAULT now(),
        "completed_at" timestamp
      );
    `);

    // 12. Reviews
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "job_id" varchar NOT NULL,
        "reviewer_id" varchar NOT NULL,
        "reviewee_id" varchar NOT NULL,
        "rating" integer NOT NULL,
        "comment" text,
        "created_at" timestamp DEFAULT now()
      );
    `);

    // 13. Disputes
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "disputes" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "job_id" varchar NOT NULL,
        "raised_by_id" varchar NOT NULL,
        "against_id" varchar NOT NULL,
        "reason" text NOT NULL,
        "description" text NOT NULL,
        "status" dispute_status NOT NULL DEFAULT 'open',
        "resolution" text,
        "resolved_by_id" varchar,
        "resolved_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    const result = await db.execute(sql`SELECT count(*) FROM users`);
    console.log(`[DB] Startup check: All application tables and enums are ready. 'users' table contains ${result.rows[0].count} users.`);
  } catch (e: any) {
    console.error(`[DB] Startup check ERROR: Failed to bootstrap database: ${e.message}`);
    if (e.detail) console.error(`[DB] Error Detail: ${e.detail}`);
  }
}

bootstrapDatabase();

// Satisfy Express view engine requirement if it ever tries to render a view (prevents startup crash)
app.set("view engine", "html");
app.engine("html", (path: string, options: any, callback: any) => {
  callback(null, ""); 
});

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Session must be initialized before ANY other middleware that uses it
app.use(getSession());
app.use(passport.initialize());
app.use(passport.session());

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Capture raw body for urlencoded requests (needed for Paynow webhook hash verification)
app.use(
  express.urlencoded({ 
    extended: false,
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Debug middleware to log session state for API calls
app.use("/api", (req: any, _res, next) => {
  if (req.path !== "/auth/user") { // Don't spam user endpoint logs
    console.log(`[API] ${req.method} ${req.path} - Authenticated: ${req.isAuthenticated()}, SessionID: ${req.sessionID || 'none'}`);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // --- 3. ERROR HANDLING (Maintainability & Usability) ---
    console.error(`[ERROR] ${new Date().toISOString()} :: ${status} :: ${message}`, err);

    if (res.headersSent) {
      return next(err);
    }

    // Hide stack traces in production for security
    const response = {
      message,
      ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
    };

    return res.status(status).json(response);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const PORT = 5000;
  const server = httpServer.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });

  // --- 4. GRACEFUL SHUTDOWN (Operability) ---
  const gracefulShutdown = () => {
    console.log("[SERVER] Received shutdown signal. Closing HTTP server...");
    server.close(() => {
      console.log("[SERVER] HTTP server closed. Exiting process.");
      process.exit(0);
    });

    // Force close after 10s if it takes too long
    setTimeout(() => {
      console.error("[SERVER] Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
})();
