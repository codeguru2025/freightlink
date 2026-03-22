import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getSession } from "./auth/googleAuth";
import passport from "passport";

// In DigitalOcean, internal requests between services or to the DB 
// often use self-signed certificates. We need to tell Node to allow them.
if (process.env.NODE_ENV === "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const app = express();
// Trust proxy settings MUST be set before ANY session/auth middleware
app.set("trust proxy", 1); 

// Log database connection info (masked for security)
const dbUrl = process.env.DATABASE_URL || "";
const maskedDbUrl = dbUrl.replace(/:([^@]+)@/, ":****@");
console.log(`[DB] Connecting to: ${maskedDbUrl}`);

// Check for required tables at startup and bootstrap if missing
import { sql } from "drizzle-orm";
import { db } from "./db";

async function bootstrapDatabase() {
  try {
    console.log("[DB] Startup check: verifying database tables...");
    
    // Ensure pgcrypto extension is available for gen_random_uuid()
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // If the table exists but has wrong columns, we might need to recreate it
    // For this deployment, we'll ensure the correct schema exists.
    try {
      await db.execute(sql`SELECT first_name FROM users LIMIT 1`);
    } catch (err) {
      console.log("[DB] 'users' table is missing columns, recreating...");
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
    
    // Ensure sessions table is correct
    try {
      await db.execute(sql`SELECT sess FROM sessions LIMIT 1`);
    } catch (err) {
      console.log("[DB] 'sessions' table is incorrect, recreating...");
      await db.execute(sql`DROP TABLE IF EXISTS "sessions" CASCADE`);
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar PRIMARY KEY,
        "sess" jsonb NOT NULL,
        "expire" timestamp NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");
    `);

    const result = await db.execute(sql`SELECT count(*) FROM users`);
    console.log(`[DB] Startup check: Database is ready. 'users' table contains ${result.rows[0].count} users.`);
  } catch (e: any) {
    console.error(`[DB] Startup check ERROR: Failed to bootstrap database: ${e.message}`);
    if (e.detail) console.error(`[DB] Error Detail: ${e.detail}`);
    if (e.hint) console.error(`[DB] Error Hint: ${e.hint}`);
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

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
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
  httpServer.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
