import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { z } from "zod";
import { 
  insertUserProfileSchema, 
  insertLoadSchema, 
  insertBidSchema, 
  insertTruckSchema,
  LOAD_STATUSES
} from "@shared/schema";
import type { LoadStatus, BidStatus } from "@shared/schema";

// Extend shared schemas for API validation
const createProfileSchema = insertUserProfileSchema.omit({ userId: true }).extend({
  role: z.enum(["shipper", "transporter", "admin"]),
});

const createLoadSchema = insertLoadSchema.omit({ shipperId: true, status: true }).extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  pickupDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
});

const createBidSchema = insertBidSchema.omit({ loadId: true, transporterId: true, status: true });

const createTruckSchema = insertTruckSchema.omit({ ownerId: true });

const updateJobStatusSchema = z.object({
  status: z.enum(LOAD_STATUSES),
});

const updateTruckSchema = z.object({
  isAvailable: z.boolean(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to get user ID from request
  const getUserId = (req: any): string | null => {
    return req.user?.claims?.sub || null;
  };

  // Profile routes
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const existing = await storage.getProfile(userId);
      if (existing) {
        return res.status(400).json({ message: "Profile already exists" });
      }

      const validationResult = createProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const { role, companyName, phoneNumber, city } = validationResult.data;
      
      const profile = await storage.createProfile({
        userId,
        role: role || "shipper",
        companyName: companyName || null,
        phoneNumber: phoneNumber || null,
        city: city || null,
      });

      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  // Stats route
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const stats = await storage.getStats(userId, profile.role as 'shipper' | 'transporter' | 'admin');
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Loads routes
  app.get("/api/loads", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const loads = profile.role === "shipper" 
        ? await storage.getLoads(userId)
        : await storage.getLoads();

      res.json(loads);
    } catch (error) {
      console.error("Error fetching loads:", error);
      res.status(500).json({ message: "Failed to fetch loads" });
    }
  });

  app.get("/api/loads/recent", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const loads = await storage.getLoads(userId);
      res.json(loads.slice(0, 5));
    } catch (error) {
      console.error("Error fetching recent loads:", error);
      res.status(500).json({ message: "Failed to fetch recent loads" });
    }
  });

  app.get("/api/marketplace", isAuthenticated, async (req, res) => {
    try {
      const loads = await storage.getAvailableLoads();
      res.json(loads);
    } catch (error) {
      console.error("Error fetching marketplace loads:", error);
      res.status(500).json({ message: "Failed to fetch marketplace loads" });
    }
  });

  app.get("/api/loads/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const load = await storage.getLoadWithBids(id);
      
      if (!load) {
        return res.status(404).json({ message: "Load not found" });
      }

      // Only show bids to the load owner (shipper) - authorization fix
      const isOwner = load.shipperId === userId;
      if (!isOwner) {
        // Remove sensitive bid data and shipper details for non-owners
        const { bids, shipper, ...loadWithoutBids } = load;
        return res.json({
          ...loadWithoutBids,
          bids: undefined,
          shipper: undefined,
        });
      }

      res.json(load);
    } catch (error) {
      console.error("Error fetching load:", error);
      res.status(500).json({ message: "Failed to fetch load" });
    }
  });

  app.post("/api/loads", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== "shipper") {
        return res.status(403).json({ message: "Only shippers can post loads" });
      }

      const validationResult = createLoadSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const {
        title,
        description,
        cargoType,
        weight,
        weightUnit,
        originCity,
        originAddress,
        destinationCity,
        destinationAddress,
        pickupDate,
        deliveryDate,
        budget,
        currency,
        specialInstructions,
      } = validationResult.data;

      const load = await storage.createLoad({
        shipperId: userId,
        title,
        description: description || null,
        cargoType: cargoType || "general",
        weight: weight,
        weightUnit: weightUnit || "kg",
        originCity,
        originAddress: originAddress || null,
        destinationCity,
        destinationAddress: destinationAddress || null,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        budget: budget || null,
        currency: currency || "USD",
        specialInstructions: specialInstructions || null,
        status: "posted",
      });

      res.status(201).json(load);
    } catch (error) {
      console.error("Error creating load:", error);
      res.status(500).json({ message: "Failed to create load" });
    }
  });

  // Bids routes
  app.get("/api/bids", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const bids = await storage.getBids(userId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  app.post("/api/loads/:loadId/bids", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== "transporter") {
        return res.status(403).json({ message: "Only transporters can place bids" });
      }

      const { loadId } = req.params;
      const load = await storage.getLoad(loadId);
      
      if (!load) {
        return res.status(404).json({ message: "Load not found" });
      }

      if (load.status !== "posted") {
        return res.status(400).json({ message: "This load is no longer accepting bids" });
      }

      const validationResult = createBidSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const { amount, currency, estimatedDays, truckId, notes } = validationResult.data;

      const bid = await storage.createBid({
        loadId,
        transporterId: userId,
        amount,
        currency: currency || "USD",
        estimatedDays: estimatedDays || null,
        truckId: truckId || null,
        notes: notes || null,
        status: "pending",
      });

      res.status(201).json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  app.post("/api/bids/:id/accept", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const bid = await storage.getBid(id);
      
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      const load = await storage.getLoad(bid.loadId);
      if (!load || load.shipperId !== userId) {
        return res.status(403).json({ message: "Only the load owner can accept bids" });
      }

      if (bid.status !== "pending") {
        return res.status(400).json({ message: "This bid cannot be accepted" });
      }

      // Accept this bid
      await storage.updateBidStatus(id, "accepted");
      
      // Reject other bids for this load
      const otherBids = await storage.getBidsForLoad(bid.loadId);
      for (const otherBid of otherBids) {
        if (otherBid.id !== id && otherBid.status === "pending") {
          await storage.updateBidStatus(otherBid.id, "rejected");
        }
      }

      // Update load status
      await storage.updateLoadStatus(bid.loadId, "accepted");

      // Create job
      const job = await storage.createJob({
        loadId: bid.loadId,
        bidId: bid.id,
        shipperId: load.shipperId,
        transporterId: bid.transporterId,
        agreedAmount: bid.amount,
        currency: bid.currency || "USD",
        status: "accepted",
      });

      res.json({ bid: await storage.getBid(id), job });
    } catch (error) {
      console.error("Error accepting bid:", error);
      res.status(500).json({ message: "Failed to accept bid" });
    }
  });

  app.post("/api/bids/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const bid = await storage.getBid(id);
      
      if (!bid) {
        return res.status(404).json({ message: "Bid not found" });
      }

      const load = await storage.getLoad(bid.loadId);
      if (!load || load.shipperId !== userId) {
        return res.status(403).json({ message: "Only the load owner can reject bids" });
      }

      if (bid.status !== "pending") {
        return res.status(400).json({ message: "This bid cannot be rejected" });
      }

      const updated = await storage.updateBidStatus(id, "rejected");
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting bid:", error);
      res.status(500).json({ message: "Failed to reject bid" });
    }
  });

  // Jobs routes
  app.get("/api/jobs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const jobs = await storage.getJobs(userId, profile.role as 'shipper' | 'transporter');
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/active", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const jobs = await storage.getJobs(userId, profile.role as 'shipper' | 'transporter');
      const activeJobs = jobs.filter(j => ['accepted', 'in_transit'].includes(j.status));
      res.json(activeJobs);
    } catch (error) {
      console.error("Error fetching active jobs:", error);
      res.status(500).json({ message: "Failed to fetch active jobs" });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.patch("/api/jobs/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      const validationResult = updateJobStatusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const { status } = validationResult.data;

      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Check authorization
      if (job.shipperId !== userId && job.transporterId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this job" });
      }

      const updated = await storage.updateJobStatus(id, status as LoadStatus);
      res.json(updated);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ message: "Failed to update job status" });
    }
  });

  // Trucks routes
  app.get("/api/trucks", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const trucks = await storage.getTrucks(userId);
      res.json(trucks);
    } catch (error) {
      console.error("Error fetching trucks:", error);
      res.status(500).json({ message: "Failed to fetch trucks" });
    }
  });

  app.post("/api/trucks", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== "transporter") {
        return res.status(403).json({ message: "Only transporters can add trucks" });
      }

      const validationResult = createTruckSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const { registrationNumber, truckType, capacity, capacityUnit } = validationResult.data;

      const truck = await storage.createTruck({
        ownerId: userId,
        registrationNumber,
        truckType,
        capacity,
        capacityUnit: capacityUnit || "tons",
      });

      res.status(201).json(truck);
    } catch (error) {
      console.error("Error creating truck:", error);
      res.status(500).json({ message: "Failed to create truck" });
    }
  });

  app.patch("/api/trucks/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const truck = await storage.getTruck(id);
      
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }

      if (truck.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this truck" });
      }

      const validationResult = updateTruckSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const { isAvailable } = validationResult.data;
      const updated = await storage.updateTruck(id, { isAvailable });
      res.json(updated);
    } catch (error) {
      console.error("Error updating truck:", error);
      res.status(500).json({ message: "Failed to update truck" });
    }
  });

  return httpServer;
}
