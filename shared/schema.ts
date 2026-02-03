import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, pgEnum, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["shipper", "transporter", "admin"]);
export const loadStatusEnum = pgEnum("load_status", ["posted", "bidding", "accepted", "in_transit", "delivered", "cancelled"]);
export const bidStatusEnum = pgEnum("bid_status", ["pending", "accepted", "rejected", "withdrawn"]);
export const cargoTypeEnum = pgEnum("cargo_type", ["general", "perishable", "hazardous", "fragile", "livestock", "machinery", "bulk", "containerized"]);
export const documentTypeEnum = pgEnum("document_type", ["id_document", "drivers_license", "vehicle_registration", "insurance", "proof_of_delivery", "invoice", "delivery_note", "shipment_note", "waybill", "signed_pod", "payment_proof", "other"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "pod_submitted", "pod_confirmed", "payment_requested", "paid"]);
export const documentStatusEnum = pgEnum("document_status", ["pending", "verified", "rejected"]);
export const disputeStatusEnum = pgEnum("dispute_status", ["open", "under_review", "resolved", "closed"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "commission_deduction", "refund", "withdrawal"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "cancelled"]);

// User Profiles - extends auth users with role-specific data
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  role: userRoleEnum("role").notNull().default("shipper"),
  companyName: varchar("company_name"),
  phoneNumber: varchar("phone_number"),
  address: text("address"),
  city: varchar("city"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_profiles_user_id").on(table.userId),
  index("idx_user_profiles_role").on(table.role),
]);

// Trucks - for transporters
export const trucks = pgTable("trucks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  registrationNumber: varchar("registration_number").notNull(),
  truckType: varchar("truck_type").notNull(),
  capacity: decimal("capacity", { precision: 10, scale: 2 }).notNull(),
  capacityUnit: varchar("capacity_unit").default("tons"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_trucks_owner").on(table.ownerId),
]);

// Loads - posted by shippers
export const loads = pgTable("loads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipperId: varchar("shipper_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  cargoType: cargoTypeEnum("cargo_type").notNull().default("general"),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  weightUnit: varchar("weight_unit").default("tonnes"), // Changed default to tonnes
  originCity: varchar("origin_city").notNull(),
  originAddress: text("origin_address"),
  destinationCity: varchar("destination_city").notNull(),
  destinationAddress: text("destination_address"),
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }), // Distance in km (user entered or estimated)
  pickupDate: timestamp("pickup_date"),
  deliveryDate: timestamp("delivery_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }), // Kept for backward compatibility, now app-calculated base price
  basePrice: decimal("base_price", { precision: 12, scale: 2 }), // App-calculated base transport price
  shipperTip: decimal("shipper_tip", { precision: 12, scale: 2 }).default("0"), // Optional increase by shipper
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }), // basePrice + shipperTip
  currency: varchar("currency").default("USD"),
  status: loadStatusEnum("status").notNull().default("posted"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_loads_shipper").on(table.shipperId),
  index("idx_loads_status").on(table.status),
  index("idx_loads_origin").on(table.originCity),
  index("idx_loads_destination").on(table.destinationCity),
]);

// Bids - submitted by transporters
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull(),
  transporterId: varchar("transporter_id").notNull(),
  truckId: varchar("truck_id"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  estimatedDays: integer("estimated_days"),
  notes: text("notes"),
  status: bidStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bids_load").on(table.loadId),
  index("idx_bids_transporter").on(table.transporterId),
  index("idx_bids_status").on(table.status),
]);

// Jobs - accepted bids become jobs
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loadId: varchar("load_id").notNull().unique(),
  bidId: varchar("bid_id").notNull().unique(),
  shipperId: varchar("shipper_id").notNull(),
  transporterId: varchar("transporter_id").notNull(),
  agreedAmount: decimal("agreed_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  status: loadStatusEnum("status").notNull().default("accepted"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  pickupConfirmedAt: timestamp("pickup_confirmed_at"),
  deliveryConfirmedAt: timestamp("delivery_confirmed_at"),
  podSubmittedAt: timestamp("pod_submitted_at"),
  podConfirmedAt: timestamp("pod_confirmed_at"),
  paymentRequestedAt: timestamp("payment_requested_at"),
  paidAt: timestamp("paid_at"),
  podNotes: text("pod_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_jobs_shipper").on(table.shipperId),
  index("idx_jobs_transporter").on(table.transporterId),
  index("idx_jobs_status").on(table.status),
  index("idx_jobs_payment_status").on(table.paymentStatus),
]);

// Documents - for verification and proof of delivery
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  jobId: varchar("job_id"),
  documentType: documentTypeEnum("document_type").notNull(),
  fileName: varchar("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  status: documentStatusEnum("status").notNull().default("pending"),
  verifiedBy: varchar("verified_by"),
  verifiedAt: timestamp("verified_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_documents_user").on(table.userId),
  index("idx_documents_job").on(table.jobId),
  index("idx_documents_status").on(table.status),
]);

// Messages - for communication between users
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  jobId: varchar("job_id"),
  loadId: varchar("load_id"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_messages_sender").on(table.senderId),
  index("idx_messages_receiver").on(table.receiverId),
  index("idx_messages_job").on(table.jobId),
]);

// Reviews - ratings after job completion
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull(),
  revieweeId: varchar("reviewee_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_reviews_job").on(table.jobId),
  index("idx_reviews_reviewee").on(table.revieweeId),
]);

// Disputes - for handling issues
export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  raisedById: varchar("raised_by_id").notNull(),
  againstId: varchar("against_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  status: disputeStatusEnum("status").notNull().default("open"),
  resolution: text("resolution"),
  resolvedById: varchar("resolved_by_id"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_disputes_job").on(table.jobId),
  index("idx_disputes_raised_by").on(table.raisedById),
  index("idx_disputes_status").on(table.status),
]);

// Wallets - transporter wallet for commission payments
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: varchar("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wallets_user").on(table.userId),
]);

// Wallet Transactions - track all wallet movements
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  userId: varchar("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  status: transactionStatusEnum("status").notNull().default("pending"),
  reference: varchar("reference"),
  jobId: varchar("job_id"),
  paynowPollUrl: text("paynow_poll_url"),
  paynowReference: varchar("paynow_reference"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_wallet_transactions_wallet").on(table.walletId),
  index("idx_wallet_transactions_user").on(table.userId),
  index("idx_wallet_transactions_status").on(table.status),
  index("idx_wallet_transactions_reference").on(table.reference),
]);

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  trucks: many(trucks),
  loadsAsShipper: many(loads),
  bidsAsTransporter: many(bids),
}));

export const trucksRelations = relations(trucks, ({ one }) => ({
  owner: one(userProfiles, {
    fields: [trucks.ownerId],
    references: [userProfiles.userId],
  }),
}));

export const loadsRelations = relations(loads, ({ one, many }) => ({
  shipper: one(userProfiles, {
    fields: [loads.shipperId],
    references: [userProfiles.userId],
  }),
  bids: many(bids),
  job: one(jobs),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  load: one(loads, {
    fields: [bids.loadId],
    references: [loads.id],
  }),
  transporter: one(userProfiles, {
    fields: [bids.transporterId],
    references: [userProfiles.userId],
  }),
  truck: one(trucks, {
    fields: [bids.truckId],
    references: [trucks.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  load: one(loads, {
    fields: [jobs.loadId],
    references: [loads.id],
  }),
  bid: one(bids, {
    fields: [jobs.bidId],
    references: [bids.id],
  }),
  shipper: one(userProfiles, {
    fields: [jobs.shipperId],
    references: [userProfiles.userId],
  }),
  transporter: one(userProfiles, {
    fields: [jobs.transporterId],
    references: [userProfiles.userId],
  }),
}));

// Insert schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTruckSchema = createInsertSchema(trucks).omit({
  id: true,
  createdAt: true,
});

export const insertLoadSchema = createInsertSchema(loads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Truck = typeof trucks.$inferSelect;
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Load = typeof loads.$inferSelect;
export type InsertLoad = z.infer<typeof insertLoadSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

// Enums for frontend
export const USER_ROLES = ["shipper", "transporter", "admin"] as const;
export const LOAD_STATUSES = ["posted", "bidding", "accepted", "in_transit", "delivered", "cancelled"] as const;
export const BID_STATUSES = ["pending", "accepted", "rejected", "withdrawn"] as const;
export const CARGO_TYPES = ["general", "perishable", "hazardous", "fragile", "livestock", "machinery", "bulk", "containerized"] as const;

export type UserRole = typeof USER_ROLES[number];
export type LoadStatus = typeof LOAD_STATUSES[number];
export type BidStatus = typeof BID_STATUSES[number];
export type CargoType = typeof CARGO_TYPES[number];
export const DOCUMENT_TYPES = ["id_document", "drivers_license", "vehicle_registration", "insurance", "proof_of_delivery", "invoice", "delivery_note", "shipment_note", "waybill", "signed_pod", "other"] as const;
export const DOCUMENT_STATUSES = ["pending", "verified", "rejected"] as const;
export const DISPUTE_STATUSES = ["open", "under_review", "resolved", "closed"] as const;
export const PAYMENT_STATUSES = ["pending", "pod_submitted", "pod_confirmed", "payment_requested", "paid"] as const;
export const POD_DOCUMENT_TYPES = ["proof_of_delivery", "invoice", "delivery_note", "shipment_note", "waybill", "signed_pod"] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];
export type DocumentStatus = typeof DOCUMENT_STATUSES[number];
export type DisputeStatus = typeof DISPUTE_STATUSES[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export type PodDocumentType = typeof POD_DOCUMENT_TYPES[number];
export const TRANSACTION_TYPES = ["deposit", "commission_deduction", "refund", "withdrawal"] as const;
export const TRANSACTION_STATUSES = ["pending", "completed", "failed", "cancelled"] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];
export type TransactionStatus = typeof TRANSACTION_STATUSES[number];

// Pricing Configuration (ride-hailing style)
// Rate per tonne-km for base price calculation: $0.50 per tonne per km
export const BASE_RATE_PER_TONNE_KM = 0.50;
// Commission rate per tonne-km: $0.05 per tonne per km (10% of base rate)
export const COMMISSION_RATE_PER_TONNE_KM = 0.05;
// Legacy percentage-based commission rate (kept for backward compatibility)
export const COMMISSION_RATE = 0.10;

// Helper functions for pricing calculations
export function calculateBasePrice(tonnes: number, distanceKm: number): number {
  return tonnes * distanceKm * BASE_RATE_PER_TONNE_KM;
}

export function calculateCommission(tonnes: number, distanceKm: number): number {
  return tonnes * distanceKm * COMMISSION_RATE_PER_TONNE_KM;
}
