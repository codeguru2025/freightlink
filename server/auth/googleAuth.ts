import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { storage } from "../storage";
import { pool } from "../db";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool, // Use the existing pool with SSL settings
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(profile: Profile) {
  const email = profile.emails?.[0]?.value || "";
  const firstName = profile.name?.givenName || profile.displayName?.split(" ")[0] || "";
  const lastName = profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" ") || "";
  const profileImageUrl = profile.photos?.[0]?.value || "";

  const user = await authStorage.upsertUser({
    id: profile.id,
    email,
    firstName,
    lastName,
    profileImageUrl,
  });

  return user;
}

export async function setupAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  const callbackURL = `${baseUrl}/api/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await upsertUser(profile);
          done(null, {
            ...user,
            accessToken,
            refreshToken,
          });
        } catch (error) {
          console.error("Error in Google Strategy verify callback:", error);
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    // Just store the user ID in the session
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await authStorage.getUser(id);
      if (user) {
        done(null, user);
      } else {
        done(null, false);
      }
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  // Login route - redirects to Google
  app.get("/api/login", passport.authenticate("google", {
    scope: ["profile", "email"],
  }));

  // Callback route - handles Google response
  app.get("/api/callback", (req, res, next) => {
    passport.authenticate("google", (err: any, user: any, info: any) => {
      if (err) {
        console.error("OAuth callback authentication error:", err);
        return res.redirect("/");
      }
      if (!user) {
        console.error("OAuth callback - no user found:", info);
        return res.redirect("/");
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Passport req.logIn error:", loginErr);
          return res.redirect("/");
        }
        console.log("OAuth login successful for user:", user.id || user.email);
        return res.redirect("/");
      });
    })(req, res, next);
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });

  // Admin login route - validates against stored secrets
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminUsername || !adminPassword) {
      return res.status(500).json({ message: "Admin credentials not configured" });
    }
    
    if (username === adminUsername && password === adminPassword) {
      // Create admin user session
      const adminUserId = "admin-system-user";
      
      // Upsert admin user in auth storage
      await authStorage.upsertUser({
        id: adminUserId,
        email: "admin@freightlink.zw",
        firstName: "System",
        lastName: "Admin",
        profileImageUrl: "",
      });
      
      // Ensure admin profile exists with admin role
      const existingProfile = await storage.getProfile(adminUserId);
      if (!existingProfile) {
        await storage.createProfile({
          userId: adminUserId,
          role: "admin",
          companyName: "FreightLink ZW",
          phoneNumber: "",
          city: "Harare",
        });
      }
      
      // Log in the admin user
      const adminUser = {
        id: adminUserId,
        email: "admin@freightlink.zw",
        firstName: "System",
        lastName: "Admin",
        profileImageUrl: "",
      };
      
      req.login(adminUser, (err) => {
        if (err) {
          console.error("Admin login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        return res.json({ success: true, user: adminUser });
      });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export const hasAcceptedTerms: RequestHandler = (req: any, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Allow admin user and the accept-terms route
  if (req.user?.id === "admin-system-user" || req.path === "/api/auth/accept-terms" || req.path === "/api/auth/user") {
    return next();
  }
  
  if (req.user?.termsAccepted) {
    return next();
  }
  
  return res.status(403).json({ message: "Terms and conditions must be accepted" });
};
