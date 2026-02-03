import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { z } from "zod";
import crypto from "crypto";
import { 
  insertUserProfileSchema, 
  insertLoadSchema, 
  insertBidSchema, 
  insertTruckSchema,
  insertDocumentSchema,
  insertMessageSchema,
  insertReviewSchema,
  insertDisputeSchema,
  LOAD_STATUSES,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  DISPUTE_STATUSES
} from "@shared/schema";
import type { LoadStatus, BidStatus, DocumentStatus, DisputeStatus } from "@shared/schema";
import { calculateCommission } from "@shared/schema";

// Extend shared schemas for API validation
const createProfileSchema = insertUserProfileSchema.omit({ userId: true }).extend({
  role: z.enum(["shipper", "transporter", "admin"]),
});

const createLoadSchema = insertLoadSchema.omit({ shipperId: true, status: true }).extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  pickupDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  distanceKm: z.string().optional().nullable(),
  basePrice: z.string().optional().nullable(),
  shipperTip: z.string().optional().nullable(),
  totalPrice: z.string().optional().nullable(),
});

const createBidSchema = insertBidSchema.omit({ loadId: true, transporterId: true, status: true });

const createTruckSchema = insertTruckSchema.omit({ ownerId: true });

// Document validation - includes all POD document types and payment proof
// fileUrl can be a full URL or a relative path like /objects/...
const createDocumentSchema = insertDocumentSchema.omit({ userId: true, status: true, verifiedBy: true, verifiedAt: true, rejectionReason: true }).extend({
  documentType: z.enum(["id_document", "drivers_license", "vehicle_registration", "insurance", "proof_of_delivery", "invoice", "delivery_note", "shipment_note", "waybill", "signed_pod", "payment_proof", "other"]),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File path is required"),
});

// POD submission validation
const podSubmissionSchema = z.object({
  notes: z.string().optional(),
});

const verifyDocumentSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().optional(),
});

// Message validation
const createMessageSchema = insertMessageSchema.omit({ senderId: true, isRead: true }).extend({
  receiverId: z.string().min(1, "Receiver is required"),
  content: z.string().min(1, "Message content is required"),
});

// Review validation
const createReviewSchema = insertReviewSchema.omit({ reviewerId: true }).extend({
  revieweeId: z.string().min(1, "Reviewee is required"),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

// Dispute validation
const createDisputeSchema = insertDisputeSchema.omit({ raisedById: true, status: true, resolution: true, resolvedById: true, resolvedAt: true }).extend({
  jobId: z.string().min(1, "Job is required"),
  againstId: z.string().min(1, "User is required"),
  reason: z.string().min(3, "Reason is required"),
  description: z.string().min(10, "Description is required"),
});

const updateDisputeSchema = z.object({
  status: z.enum(["open", "under_review", "resolved", "closed"]),
  resolution: z.string().optional(),
});

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
  
  // Setup object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Helper to get user ID from request (supports both Google OAuth and Replit Auth)
  const getUserId = (req: any): string | null => {
    return req.user?.id || req.user?.claims?.sub || null;
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

  // Update profile
  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const existing = await storage.getProfile(userId);
      if (!existing) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const updateSchema = z.object({
        companyName: z.string().optional(),
        phoneNumber: z.string().optional(),
        city: z.string().optional(),
        address: z.string().optional(),
      });

      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const profile = await storage.updateProfile(userId, validationResult.data);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
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
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const profile = await storage.getProfile(userId);
      
      // For transporters, filter loads based on wallet balance (commission coverage)
      if (profile?.role === "transporter") {
        const loads = await storage.getAvailableLoadsForTransporter(userId);
        const wallet = await storage.getOrCreateWallet(userId);
        return res.json({
          loads,
          walletBalance: wallet.balance,
          currency: wallet.currency,
          commissionRate: 0.10,
          message: loads.length === 0 
            ? "No loads available within your wallet balance. Top up your wallet to see more loads."
            : undefined
        });
      }

      // For shippers and admin, show all available loads
      const loads = await storage.getAvailableLoads();
      res.json({ loads });
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
        distanceKm,
        basePrice,
        shipperTip,
        totalPrice,
      } = validationResult.data;

      const load = await storage.createLoad({
        shipperId: userId,
        title,
        description: description || null,
        cargoType: cargoType || "general",
        weight: weight,
        weightUnit: weightUnit || "tonnes",
        originCity,
        originAddress: originAddress || null,
        destinationCity,
        destinationAddress: destinationAddress || null,
        distanceKm: distanceKm || null,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        basePrice: basePrice || null,
        shipperTip: shipperTip || "0",
        totalPrice: totalPrice || null,
        budget: budget || totalPrice || null, // For backward compatibility
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

      // Enforce minimum bid at base price (totalPrice includes shipper tip)
      const minimumBid = parseFloat(load.totalPrice || load.basePrice || load.budget || "0");
      const bidAmount = parseFloat(amount);
      if (minimumBid > 0 && bidAmount < minimumBid) {
        return res.status(400).json({ 
          message: `Bid must be at least $${minimumBid.toFixed(2)} (the minimum price for this consignment)` 
        });
      }

      // Calculate commission
      const tonnes = parseFloat(load.weight) || 0;
      const distanceKm = parseFloat(load.distanceKm || "0") || 0;
      const commission = calculateCommission(tonnes, distanceKm);

      // Pre-check balance before attempting atomic operation (for better error messages)
      if (commission > 0) {
        const availableBalance = await storage.getAvailableBalance(userId);
        
        if (availableBalance < commission) {
          return res.status(400).json({ 
            message: `Insufficient wallet balance to place bid. Required commission: $${commission.toFixed(2)}. Available balance: $${availableBalance.toFixed(2)}. Please top up your wallet before bidding.`,
            requiredCommission: commission,
            availableBalance: availableBalance,
            shortfall: commission - availableBalance
          });
        }
      }

      // Use atomic bid creation with commission reservation
      const bid = await storage.createBidWithReservation({
        loadId,
        transporterId: userId,
        amount,
        currency: currency || "USD",
        estimatedDays: estimatedDays || null,
        truckId: truckId || null,
        notes: notes || null,
        status: "pending",
      }, commission);

      res.status(201).json({ 
        ...bid, 
        commissionReserved: commission > 0 ? commission : 0 
      });
    } catch (error: any) {
      console.error("Error creating bid:", error);
      // Return specific error messages from atomic operation
      if (error.message === "Wallet not found") {
        return res.status(400).json({ message: "Please set up your wallet before placing bids" });
      }
      if (error.message === "Insufficient wallet balance") {
        return res.status(400).json({ message: "Insufficient wallet balance. Please top up before bidding." });
      }
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
      
      // Pre-flight checks (for better error messages before atomic operation)
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

      if (load.status !== "posted") {
        return res.status(400).json({ message: "This load has already been assigned. Bid acceptance is no longer possible." });
      }

      // Use atomic bid acceptance (handles all steps in a transaction)
      const result = await storage.acceptBidAtomic(id, bid.loadId);

      res.json({ 
        bid: result.bid, 
        job: result.job, 
        commissionDeducted: result.commissionDeducted,
        otherBidsRejected: result.otherBidsRejected
      });
    } catch (error: any) {
      console.error("Error accepting bid:", error);
      // Return specific error messages from atomic operation
      if (error.message === "Load already accepted or not found") {
        return res.status(400).json({ message: "This load has already been assigned. Bid acceptance is no longer possible." });
      }
      if (error.message === "Bid not found or does not match load") {
        return res.status(404).json({ message: "Bid not found" });
      }
      if (error.message === "Bid already processed") {
        return res.status(400).json({ message: "This bid has already been processed" });
      }
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

      // Release the reserved commission for this bid (using the stored amount)
      const bidReservedCommission = parseFloat(bid.reservedCommission || "0");
      if (bidReservedCommission > 0) {
        await storage.releaseReservedCommission(bid.transporterId, bidReservedCommission);
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

      // Commission deduction disabled for testing phase
      // Will be enabled in production with Paynow integration
      // TODO: Enable when going live with payments

      const updated = await storage.updateJobStatus(id, status as LoadStatus);
      res.json(updated);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ message: "Failed to update job status" });
    }
  });

  // POD (Proof of Delivery) routes
  app.get("/api/jobs/:id/pod-documents", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.shipperId !== userId && job.transporterId !== userId) {
        const profile = await storage.getProfile(userId);
        if (profile?.role !== "admin") {
          return res.status(403).json({ message: "Not authorized" });
        }
      }

      const podDocuments = await storage.getPodDocuments(id);
      res.json(podDocuments);
    } catch (error) {
      console.error("Error fetching POD documents:", error);
      res.status(500).json({ message: "Failed to fetch POD documents" });
    }
  });

  app.post("/api/jobs/:id/submit-pod", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Only transporter can submit POD
      if (job.transporterId !== userId) {
        return res.status(403).json({ message: "Only the transporter can submit POD" });
      }

      // Job must be delivered
      if (job.status !== "delivered") {
        return res.status(400).json({ message: "Job must be marked as delivered before submitting POD" });
      }

      // Validate optional notes with Zod
      const validationResult = podSubmissionSchema.safeParse(req.body || {});
      const { notes } = validationResult.success ? validationResult.data : { notes: undefined };
      const updated = await storage.submitPod(id, notes);
      res.json(updated);
    } catch (error) {
      console.error("Error submitting POD:", error);
      res.status(500).json({ message: "Failed to submit POD" });
    }
  });

  app.post("/api/jobs/:id/confirm-pod", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Only shipper can confirm POD
      if (job.shipperId !== userId) {
        return res.status(403).json({ message: "Only the shipper can confirm POD" });
      }

      // POD must be submitted first
      if (job.paymentStatus !== "pod_submitted") {
        return res.status(400).json({ message: "POD must be submitted before confirmation" });
      }

      const updated = await storage.confirmPod(id);
      res.json(updated);
    } catch (error) {
      console.error("Error confirming POD:", error);
      res.status(500).json({ message: "Failed to confirm POD" });
    }
  });

  app.post("/api/jobs/:id/request-payment", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Only transporter can request payment
      if (job.transporterId !== userId) {
        return res.status(403).json({ message: "Only the transporter can request payment" });
      }

      // POD must be confirmed first
      if (job.paymentStatus !== "pod_confirmed") {
        return res.status(400).json({ message: "POD must be confirmed before requesting payment" });
      }

      const updated = await storage.requestPayment(id);
      res.json(updated);
    } catch (error) {
      console.error("Error requesting payment:", error);
      res.status(500).json({ message: "Failed to request payment" });
    }
  });

  app.post("/api/jobs/:id/mark-paid", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Only shipper can mark as paid
      if (job.shipperId !== userId) {
        return res.status(403).json({ message: "Only the shipper can mark payment as complete" });
      }

      // Payment must be requested first
      if (job.paymentStatus !== "payment_requested") {
        return res.status(400).json({ message: "Payment must be requested before marking as paid" });
      }

      // Verify payment proof document exists for this job
      const jobDocs = await storage.getDocumentsByJob(id);
      const hasPaymentProof = jobDocs.some(d => d.documentType === "payment_proof" && d.userId === userId);
      if (!hasPaymentProof) {
        return res.status(400).json({ message: "Payment proof must be uploaded before marking as paid" });
      }

      const updated = await storage.markAsPaid(id);
      res.json(updated);
    } catch (error) {
      console.error("Error marking job as paid:", error);
      res.status(500).json({ message: "Failed to mark job as paid" });
    }
  });

  app.get("/api/pod-jobs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.role !== "shipper" && profile.role !== "transporter") {
        return res.status(403).json({ message: "Only shippers and transporters can access POD jobs" });
      }

      const { paymentStatus } = req.query;
      const jobs = await storage.getJobsByPaymentStatus(
        userId,
        profile.role as 'shipper' | 'transporter',
        paymentStatus as any
      );
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching POD jobs:", error);
      res.status(500).json({ message: "Failed to fetch POD jobs" });
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

  // Admin routes
  const requireAdmin = async (req: any, res: any, next: any) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const profile = await storage.getProfile(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/loads", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allLoads = await storage.getAllLoads();
      res.json(allLoads);
    } catch (error) {
      console.error("Error fetching all loads:", error);
      res.status(500).json({ message: "Failed to fetch loads" });
    }
  });

  app.get("/api/admin/jobs", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allJobs = await storage.getAllJobs();
      res.json(allJobs);
    } catch (error) {
      console.error("Error fetching all jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/admin/reports", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const reports = await storage.getAdminReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching admin reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/admin/transactions", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allTransactions = await storage.getAllWalletTransactions();
      res.json(allTransactions);
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Documents routes
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const docs = await storage.getDocuments(userId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/jobs/:jobId/documents", isAuthenticated, async (req, res) => {
    try {
      const docs = await storage.getDocumentsByJob(req.params.jobId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching job documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const validationResult = createDocumentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }
      
      const doc = await storage.createDocument({ ...validationResult.data, userId });
      res.status(201).json(doc);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get("/api/admin/documents/pending", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const docs = await storage.getAllPendingDocuments();
      res.json(docs);
    } catch (error) {
      console.error("Error fetching pending documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/admin/documents/all", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const docs = await storage.getAllDocuments();
      res.json(docs);
    } catch (error) {
      console.error("Error fetching all documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.patch("/api/admin/documents/:id/verify", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      const validationResult = verifyDocumentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }
      
      const { status, rejectionReason } = validationResult.data;
      const doc = await storage.updateDocumentStatus(req.params.id, status as DocumentStatus, userId, rejectionReason);
      res.json(doc);
    } catch (error) {
      console.error("Error updating document status:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Messages routes
  app.get("/api/messages/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messages/:partnerId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const msgs = await storage.getMessages(userId, req.params.partnerId);
      await storage.markMessagesAsRead(userId, req.params.partnerId);
      res.json(msgs);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const validationResult = createMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }
      
      const message = await storage.createMessage({ ...validationResult.data, senderId: userId });
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Reviews routes
  app.get("/api/users/:userId/reviews", isAuthenticated, async (req, res) => {
    try {
      const reviews = await storage.getReviewsForUser(req.params.userId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get("/api/users/:userId/rating", isAuthenticated, async (req, res) => {
    try {
      const rating = await storage.getUserRating(req.params.userId);
      res.json(rating);
    } catch (error) {
      console.error("Error fetching rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  app.get("/api/jobs/:jobId/reviews", isAuthenticated, async (req, res) => {
    try {
      const reviews = await storage.getReviewsByJob(req.params.jobId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching job reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/jobs/:jobId/reviews", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const validationResult = createReviewSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }
      
      const { rating, comment, revieweeId } = validationResult.data;
      const review = await storage.createReview({
        jobId: req.params.jobId,
        reviewerId: userId,
        revieweeId,
        rating,
        comment,
      });
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Disputes routes
  app.get("/api/disputes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getProfile(userId);
      const disputes = profile?.role === 'admin' 
        ? await storage.getDisputes() 
        : await storage.getDisputes(userId);
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  app.get("/api/disputes/:id", isAuthenticated, async (req, res) => {
    try {
      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) return res.status(404).json({ message: "Dispute not found" });
      res.json(dispute);
    } catch (error) {
      console.error("Error fetching dispute:", error);
      res.status(500).json({ message: "Failed to fetch dispute" });
    }
  });

  app.post("/api/disputes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const validationResult = createDisputeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }
      
      const dispute = await storage.createDispute({ ...validationResult.data, raisedById: userId });
      res.status(201).json(dispute);
    } catch (error) {
      console.error("Error creating dispute:", error);
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  app.patch("/api/admin/disputes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      const validationResult = updateDisputeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }
      
      const { status, resolution } = validationResult.data;
      const dispute = await storage.updateDisputeStatus(req.params.id, status as DisputeStatus, resolution, userId);
      res.json(dispute);
    } catch (error) {
      console.error("Error updating dispute:", error);
      res.status(500).json({ message: "Failed to update dispute" });
    }
  });

  // ============ WALLET ROUTES ============

  // Get wallet balance and info
  app.get("/api/wallet", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const wallet = await storage.getOrCreateWallet(userId);
      const availableBalance = await storage.getAvailableBalance(userId);
      
      res.json({
        ...wallet,
        availableBalance: availableBalance.toString(),
      });
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  // Get wallet transactions
  app.get("/api/wallet/transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const transactions = await storage.getWalletTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Top-up wallet validation schema with enhanced security
  const topupSchema = z.object({
    amount: z.number()
      .min(1, "Minimum top-up is $1")
      .max(10000, "Maximum top-up is $10,000"),
    phone: z.string().optional(),
    method: z.enum(["ecocash", "onemoney", "innbucks", "omari", "visa_mastercard"]).default("ecocash"),
  }).refine((data) => {
    // Phone required for mobile money methods only
    if (["ecocash", "onemoney", "innbucks", "omari"].includes(data.method)) {
      if (!data.phone) return false;
      return /^(0|263|\+263)?(77|78|71|73|78)[0-9]{7}$/.test(data.phone);
    }
    return true;
  }, {
    message: "Valid Zimbabwe phone number required for mobile money payments",
    path: ["phone"],
  });

  // Normalize phone number to international format
  function normalizeZimbabwePhone(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("263")) return cleaned;
    if (cleaned.startsWith("0")) return "263" + cleaned.slice(1);
    return "263" + cleaned;
  }

  // Initiate wallet top-up via Paynow/EcoCash with enhanced security
  app.post("/api/wallet/topup", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Get user email for Paynow
    const user = req.user as any;
    const userEmail = user?.email || "customer@freightlinkzw.com";

    try {
      // Validate request body first
      const validationResult = topupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validationResult.error.errors.map(e => e.message)
        });
      }

      const { amount, method } = validationResult.data;
      const isMobileMoney = ["ecocash", "onemoney", "innbucks", "omari"].includes(method);
      const phone = isMobileMoney && validationResult.data.phone 
        ? normalizeZimbabwePhone(validationResult.data.phone) 
        : undefined;
      
      // Get or create wallet
      const wallet = await storage.getOrCreateWallet(userId);

      // Check if Paynow credentials are configured
      const integrationId = process.env.PAYNOW_ID || process.env.PAYNOW_INTEGRATION_ID;
      const integrationKey = process.env.PAYNOW_KEY || process.env.PAYNOW_INTEGRATION_KEY;

      // Create unique reference with timestamp and random component
      const randomSuffix = crypto.randomBytes(4).toString("hex");
      const reference = `FLZW-${userId.slice(-8)}-${Date.now()}-${randomSuffix}`;

      // TEST MODE: If Paynow is not configured, simulate instant top-up
      if (!integrationId || !integrationKey) {
        // Use atomic method for test mode too
        const atomicResult = await storage.createPendingDepositAtomic(
          userId, wallet.id, amount, reference, `${method} (Test Mode)`
        );
        
        if (atomicResult.rateLimited) {
          console.warn(`[SECURITY] Rate limit exceeded for user ${userId}`);
          return res.status(429).json({ 
            message: "Too many payment attempts. Please try again in a few minutes."
          });
        }
        
        if (atomicResult.hasPending) {
          return res.status(400).json({ 
            message: "You have a payment in progress. Please wait for it to complete or try again in a few minutes."
          });
        }
        
        if (atomicResult.dailyLimitExceeded) {
          return res.status(400).json({ 
            message: "Daily deposit limit of $50,000 exceeded."
          });
        }
        
        // Update to completed and credit wallet
        await storage.updateTransactionStatus(atomicResult.transaction!.id, "completed", undefined);
        await storage.updateWalletBalance(userId, amount);

        console.log(`[TEST MODE] Wallet top-up: User ${userId}, Amount $${amount}, Ref ${reference}`);
        
        return res.json({
          success: true,
          reference,
          transactionId: atomicResult.transaction!.id,
          testMode: true,
          message: `Test mode: $${amount.toFixed(2)} credited to your wallet instantly.`
        });
      }

      // PRODUCTION MODE: Use atomic pending transaction creation
      const atomicResult = await storage.createPendingDepositAtomic(
        userId, wallet.id, amount, reference, method
      );
      
      if (atomicResult.rateLimited) {
        console.warn(`[SECURITY] Rate limit exceeded for user ${userId}`);
        return res.status(429).json({ 
          message: "Too many payment attempts. Please try again in a few minutes."
        });
      }
      
      if (atomicResult.hasPending) {
        return res.status(400).json({ 
          message: "You have a payment in progress. Please wait for it to complete or try again in a few minutes."
        });
      }
      
      if (atomicResult.dailyLimitExceeded) {
        return res.status(400).json({ 
          message: "Daily deposit limit of $50,000 exceeded."
        });
      }
      
      const transaction = atomicResult.transaction!;

      // PRODUCTION MODE: Use Paynow for real payments
      const { Paynow } = await import("paynow");
      const paynow = new Paynow(integrationId, integrationKey);
      
      // Set URLs for callbacks
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN;
      const baseUrl = domain ? `https://${domain}` : "https://localhost:5000";
      paynow.resultUrl = `${baseUrl}/api/wallet/paynow-webhook`;
      paynow.returnUrl = `${baseUrl}/wallet?topup=success`;

      // Create payment with user email (required by Paynow)
      const payment = paynow.createPayment(reference, userEmail);
      payment.add("FreightLink ZW Wallet Top-up", amount);

      console.log(`[PAYMENT] Initiating Paynow payment: User ${userId}, Amount $${amount}, Phone ${phone || 'N/A'}, Method ${method}, Ref ${reference}`);

      // Send payment request based on method type
      let response;
      if (isMobileMoney && phone) {
        // Mobile money payment (EcoCash, OneMoney, InnBucks, O'Mari)
        response = await paynow.sendMobile(payment, phone, method);
      } else {
        // Card payment (Visa/Mastercard) - redirects to Paynow payment page
        response = await paynow.send(payment);
      }

      if (response.success) {
        console.log(`[PAYMENT] Paynow payment initiated successfully: Ref ${reference}`);
        
        if (isMobileMoney) {
          res.json({
            success: true,
            reference,
            transactionId: transaction.id,
            instructions: response.instructions,
            pollUrl: response.pollUrl,
            message: `Please complete the payment on your ${
              method === 'ecocash' ? 'EcoCash' : 
              method === 'onemoney' ? 'OneMoney' : 
              method === 'innbucks' ? 'InnBucks' : 
              'O\'Mari'
            } phone.`
          });
        } else {
          // Card payment - redirect to payment page
          res.json({
            success: true,
            reference,
            transactionId: transaction.id,
            redirectUrl: response.redirectUrl,
            pollUrl: response.pollUrl,
            message: "Redirecting to secure payment page..."
          });
        }
      } else {
        // Mark transaction as failed
        await storage.updateTransactionStatus(transaction.id, "failed", undefined);
        
        console.error(`[PAYMENT] Paynow payment failed: Ref ${reference}, Error: ${response.error}`);
        
        res.status(400).json({ 
          success: false, 
          message: response.error || "Payment initiation failed. Please try again."
        });
      }
    } catch (error: any) {
      console.error("[PAYMENT] Error initiating top-up:", error?.message || error);
      res.status(500).json({ message: "Failed to initiate payment. Please try again." });
    }
  });

  // Paynow webhook for payment confirmation with MANDATORY security verification
  // Uses raw body for hash verification as per Paynow documentation
  app.post("/api/wallet/paynow-webhook", async (req, res) => {
    try {
      const { reference, status, amount, paynowreference, hash } = req.body;
      const integrationKey = process.env.PAYNOW_KEY || process.env.PAYNOW_INTEGRATION_KEY;
      const isProduction = !!integrationKey;

      console.log("[WEBHOOK] Paynow webhook received:", { reference, status, amount, paynowreference });

      // Security: Validate required fields
      if (!reference || !status) {
        console.error("[WEBHOOK] Missing required fields");
        return res.status(400).send("Missing required fields");
      }

      // CRITICAL: In production, REQUIRE hash verification - reject unsigned requests
      if (isProduction) {
        if (!hash) {
          console.error("[WEBHOOK] SECURITY: Missing hash in production - rejecting unsigned request");
          return res.status(403).send("Signature required");
        }
        
        // SECURITY: Require raw body for accurate hash verification
        if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
          console.error("[WEBHOOK] SECURITY: Raw body not available - cannot verify hash securely");
          return res.status(400).send("Invalid request format");
        }
        
        // Paynow official hash algorithm: 
        // 1. Concatenate ALL values (except hash) in the ORDER received
        // 2. Append integration key
        // 3. SHA512 hash → uppercase hex
        // Using raw body to preserve exact field order
        const rawString = req.rawBody.toString('utf-8');
        const pairs = rawString.split('&');
        const values: string[] = [];
        
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key !== 'hash') {
            // Normalize "+" to space before URL decoding (urlencoded form data)
            values.push(decodeURIComponent((value || '').replace(/\+/g, ' ')));
          }
        }
        const dataToHash = values.join('') + integrationKey;
        
        const expectedHash = crypto.createHash('sha512').update(dataToHash).digest('hex').toUpperCase();
        
        // Use timing-safe comparison to prevent timing attacks
        const hashMatch = hash.length === expectedHash.length && 
          crypto.timingSafeEqual(Buffer.from(hash.toUpperCase()), Buffer.from(expectedHash));
        
        if (!hashMatch) {
          console.error("[WEBHOOK] SECURITY: Invalid hash signature - possible tampering attempt");
          return res.status(403).send("Invalid signature");
        }
        
        console.log("[WEBHOOK] Hash verification passed");
      } else {
        console.warn("[WEBHOOK] Test mode - skipping hash verification");
      }

      // Security: Validate reference format (must match our pattern)
      if (!reference.startsWith("FLZW-")) {
        console.error("[WEBHOOK] Invalid reference format:", reference);
        return res.status(400).send("Invalid reference format");
      }

      const transaction = await storage.getTransactionByReference(reference);
      if (!transaction) {
        console.error("[WEBHOOK] Transaction not found for reference:", reference);
        return res.status(404).send("Transaction not found");
      }

      // Security: Prevent double-processing of completed transactions
      if (transaction.status === "completed") {
        console.warn("[WEBHOOK] Transaction already completed:", reference);
        return res.status(200).send("Already processed");
      }

      // Security: Verify amount matches (if provided)
      if (amount && Math.abs(Number(amount) - Number(transaction.amount)) > 0.01) {
        console.error("[WEBHOOK] Amount mismatch - expected:", transaction.amount, "received:", amount);
        return res.status(400).send("Amount mismatch");
      }

      const normalizedStatus = status.toLowerCase();
      
      if (normalizedStatus === "paid") {
        // Update transaction status
        await storage.updateTransactionStatus(transaction.id, "completed", paynowreference);
        
        // Credit wallet
        await storage.updateWalletBalance(transaction.userId, Number(transaction.amount));
        
        console.log(`[WEBHOOK] Wallet credited: User ${transaction.userId}, Amount $${transaction.amount}, Ref ${reference}`);
      } else if (normalizedStatus === "cancelled" || normalizedStatus === "failed") {
        await storage.updateTransactionStatus(transaction.id, "failed", paynowreference);
        console.log(`[WEBHOOK] Payment failed: User ${transaction.userId}, Ref ${reference}, Status ${status}`);
      } else {
        console.log(`[WEBHOOK] Intermediate status: ${status} for ${reference}`);
      }

      res.status(200).send("OK");
    } catch (error: any) {
      console.error("[WEBHOOK] Error processing Paynow webhook:", error?.message || error);
      res.status(500).send("Error");
    }
  });

  // Check payment status (poll transaction)
  app.get("/api/wallet/transactions/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const transactions = await storage.getWalletTransactions(userId);
      const transaction = transactions.find(t => t.id === req.params.id);

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      res.json({
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        completedAt: transaction.completedAt
      });
    } catch (error) {
      console.error("Error checking transaction status:", error);
      res.status(500).json({ message: "Failed to check status" });
    }
  });

  return httpServer;
}
