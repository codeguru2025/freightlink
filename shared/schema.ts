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
  weightUnit: varchar("weight_unit").default("kg"),
  originCity: varchar("origin_city").notNull(),
  originAddress: text("origin_address"),
  destinationCity: varchar("destination_city").notNull(),
  destinationAddress: text("destination_address"),
  pickupDate: timestamp("pickup_date"),
  deliveryDate: timestamp("delivery_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
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
  pickupConfirmedAt: timestamp("pickup_confirmed_at"),
  deliveryConfirmedAt: timestamp("delivery_confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_jobs_shipper").on(table.shipperId),
  index("idx_jobs_transporter").on(table.transporterId),
  index("idx_jobs_status").on(table.status),
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

// Enums for frontend
export const USER_ROLES = ["shipper", "transporter", "admin"] as const;
export const LOAD_STATUSES = ["posted", "bidding", "accepted", "in_transit", "delivered", "cancelled"] as const;
export const BID_STATUSES = ["pending", "accepted", "rejected", "withdrawn"] as const;
export const CARGO_TYPES = ["general", "perishable", "hazardous", "fragile", "livestock", "machinery", "bulk", "containerized"] as const;

export type UserRole = typeof USER_ROLES[number];
export type LoadStatus = typeof LOAD_STATUSES[number];
export type BidStatus = typeof BID_STATUSES[number];
export type CargoType = typeof CARGO_TYPES[number];
