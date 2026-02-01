import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
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

  await authStorage.upsertUser({
    id: profile.id,
    email,
    firstName,
    lastName,
    profileImageUrl,
  });

  return {
    id: profile.id,
    email,
    firstName,
    lastName,
    profileImageUrl,
  };
}

export async function setupAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // We'll set up strategies dynamically per hostname
  const registeredStrategies = new Set<string>();

  const ensureStrategy = (hostname: string) => {
    const strategyName = `google:${hostname}`;
    if (!registeredStrategies.has(strategyName)) {
      const callbackURL = `https://${hostname}/api/callback`;
      
      passport.use(
        strategyName,
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
              done(error as Error);
            }
          }
        )
      );
      registeredStrategies.add(strategyName);
    }
    return strategyName;
  };

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // Login route - redirects to Google
  app.get("/api/login", (req, res, next) => {
    const strategyName = ensureStrategy(req.hostname);
    passport.authenticate(strategyName, {
      scope: ["profile", "email"],
    })(req, res, next);
  });

  // Callback route - handles Google response
  app.get("/api/callback", (req, res, next) => {
    const strategyName = ensureStrategy(req.hostname);
    passport.authenticate(strategyName, {
      successRedirect: "/",
      failureRedirect: "/api/login",
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
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
