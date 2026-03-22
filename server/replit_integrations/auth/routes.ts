import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./googleAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user (supports both Google OAuth and Replit Auth)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Accept terms and conditions
  app.post("/api/auth/accept-terms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const user = await authStorage.acceptTerms(userId);
      
      // Update session if needed
      if (req.user) {
        req.user.termsAccepted = true;
        req.user.termsAcceptedAt = user.termsAcceptedAt;
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error accepting terms:", error);
      res.status(500).json({ message: "Failed to accept terms" });
    }
  });
}
