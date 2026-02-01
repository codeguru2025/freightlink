import { 
  userProfiles, 
  trucks, 
  loads, 
  bids, 
  jobs,
  users,
  type UserProfile, 
  type InsertUserProfile,
  type Truck,
  type InsertTruck,
  type Load,
  type InsertLoad,
  type Bid,
  type InsertBid,
  type Job,
  type InsertJob,
  type LoadStatus,
  type BidStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, sql, gte } from "drizzle-orm";

export interface IStorage {
  // User Profiles
  getProfile(userId: string): Promise<UserProfile | undefined>;
  createProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;

  // Trucks
  getTrucks(ownerId: string): Promise<Truck[]>;
  getTruck(id: string): Promise<Truck | undefined>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  updateTruck(id: string, data: Partial<InsertTruck>): Promise<Truck | undefined>;

  // Loads
  getLoads(shipperId?: string): Promise<Load[]>;
  getAvailableLoads(): Promise<Load[]>;
  getLoad(id: string): Promise<Load | undefined>;
  getLoadWithBids(id: string): Promise<(Load & { bids?: Bid[]; shipper?: UserProfile }) | undefined>;
  createLoad(load: InsertLoad): Promise<Load>;
  updateLoad(id: string, data: Partial<InsertLoad>): Promise<Load | undefined>;
  updateLoadStatus(id: string, status: LoadStatus): Promise<Load | undefined>;

  // Bids
  getBids(transporterId?: string): Promise<(Bid & { load?: Load })[]>;
  getBidsForLoad(loadId: string): Promise<(Bid & { transporter?: UserProfile })[]>;
  getBid(id: string): Promise<Bid | undefined>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBidStatus(id: string, status: BidStatus): Promise<Bid | undefined>;

  // Jobs
  getJobs(userId: string, role: 'shipper' | 'transporter'): Promise<(Job & { load?: Load })[]>;
  getJob(id: string): Promise<(Job & { load?: Load }) | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJobStatus(id: string, status: LoadStatus): Promise<Job | undefined>;

  // Stats
  getStats(userId: string, role: 'shipper' | 'transporter' | 'admin'): Promise<{
    totalLoads: number;
    activeJobs: number;
    totalBids: number;
    completedJobs: number;
  }>;

  // Admin functions
  getAllUsers(): Promise<(UserProfile & { email?: string })[]>;
  getAllLoads(): Promise<(Load & { shipper?: UserProfile })[]>;
  getAllJobs(): Promise<(Job & { load?: Load })[]>;
  getAdminReports(): Promise<{
    loadsByStatus: { status: string; count: number }[];
    recentActivity: { date: string; loads: number; bids: number; jobs: number }[];
    topRoutes: { origin: string; destination: string; count: number }[];
    usersByRole: { role: string; count: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User Profiles
  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  // Trucks
  async getTrucks(ownerId: string): Promise<Truck[]> {
    return await db.select().from(trucks).where(eq(trucks.ownerId, ownerId)).orderBy(desc(trucks.createdAt));
  }

  async getTruck(id: string): Promise<Truck | undefined> {
    const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
    return truck || undefined;
  }

  async createTruck(truck: InsertTruck): Promise<Truck> {
    const [created] = await db.insert(trucks).values(truck).returning();
    return created;
  }

  async updateTruck(id: string, data: Partial<InsertTruck>): Promise<Truck | undefined> {
    const [updated] = await db.update(trucks).set(data).where(eq(trucks.id, id)).returning();
    return updated || undefined;
  }

  // Loads
  async getLoads(shipperId?: string): Promise<Load[]> {
    if (shipperId) {
      return await db.select().from(loads).where(eq(loads.shipperId, shipperId)).orderBy(desc(loads.createdAt));
    }
    return await db.select().from(loads).orderBy(desc(loads.createdAt));
  }

  async getAvailableLoads(): Promise<Load[]> {
    return await db
      .select()
      .from(loads)
      .where(eq(loads.status, "posted"))
      .orderBy(desc(loads.createdAt));
  }

  async getLoad(id: string): Promise<Load | undefined> {
    const [load] = await db.select().from(loads).where(eq(loads.id, id));
    return load || undefined;
  }

  async getLoadWithBids(id: string): Promise<(Load & { bids?: (Bid & { transporter?: UserProfile })[]; shipper?: UserProfile }) | undefined> {
    const [load] = await db.select().from(loads).where(eq(loads.id, id));
    if (!load) return undefined;

    const loadBids = await db.select().from(bids).where(eq(bids.loadId, id)).orderBy(desc(bids.createdAt));
    
    const bidsWithTransporter = await Promise.all(
      loadBids.map(async (bid) => {
        const [transporter] = await db.select().from(userProfiles).where(eq(userProfiles.userId, bid.transporterId));
        return { ...bid, transporter: transporter || undefined };
      })
    );

    const [shipper] = await db.select().from(userProfiles).where(eq(userProfiles.userId, load.shipperId));

    return { ...load, bids: bidsWithTransporter, shipper: shipper || undefined };
  }

  async createLoad(load: InsertLoad): Promise<Load> {
    const [created] = await db.insert(loads).values(load).returning();
    return created;
  }

  async updateLoad(id: string, data: Partial<InsertLoad>): Promise<Load | undefined> {
    const [updated] = await db
      .update(loads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(loads.id, id))
      .returning();
    return updated || undefined;
  }

  async updateLoadStatus(id: string, status: LoadStatus): Promise<Load | undefined> {
    const [updated] = await db
      .update(loads)
      .set({ status, updatedAt: new Date() })
      .where(eq(loads.id, id))
      .returning();
    return updated || undefined;
  }

  // Bids
  async getBids(transporterId?: string): Promise<(Bid & { load?: Load })[]> {
    const bidList = transporterId
      ? await db.select().from(bids).where(eq(bids.transporterId, transporterId)).orderBy(desc(bids.createdAt))
      : await db.select().from(bids).orderBy(desc(bids.createdAt));

    const bidsWithLoad = await Promise.all(
      bidList.map(async (bid) => {
        const [load] = await db.select().from(loads).where(eq(loads.id, bid.loadId));
        return { ...bid, load: load || undefined };
      })
    );

    return bidsWithLoad;
  }

  async getBidsForLoad(loadId: string): Promise<(Bid & { transporter?: UserProfile })[]> {
    const bidList = await db.select().from(bids).where(eq(bids.loadId, loadId)).orderBy(desc(bids.createdAt));
    
    const bidsWithTransporter = await Promise.all(
      bidList.map(async (bid) => {
        const [transporter] = await db.select().from(userProfiles).where(eq(userProfiles.userId, bid.transporterId));
        return { ...bid, transporter: transporter || undefined };
      })
    );

    return bidsWithTransporter;
  }

  async getBid(id: string): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid || undefined;
  }

  async createBid(bid: InsertBid): Promise<Bid> {
    const [created] = await db.insert(bids).values(bid).returning();
    return created;
  }

  async updateBidStatus(id: string, status: BidStatus): Promise<Bid | undefined> {
    const [updated] = await db
      .update(bids)
      .set({ status, updatedAt: new Date() })
      .where(eq(bids.id, id))
      .returning();
    return updated || undefined;
  }

  // Jobs
  async getJobs(userId: string, role: 'shipper' | 'transporter'): Promise<(Job & { load?: Load })[]> {
    const jobList = role === 'shipper'
      ? await db.select().from(jobs).where(eq(jobs.shipperId, userId)).orderBy(desc(jobs.createdAt))
      : await db.select().from(jobs).where(eq(jobs.transporterId, userId)).orderBy(desc(jobs.createdAt));

    const jobsWithLoad = await Promise.all(
      jobList.map(async (job) => {
        const [load] = await db.select().from(loads).where(eq(loads.id, job.loadId));
        return { ...job, load: load || undefined };
      })
    );

    return jobsWithLoad;
  }

  async getJob(id: string): Promise<(Job & { load?: Load }) | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return undefined;

    const [load] = await db.select().from(loads).where(eq(loads.id, job.loadId));
    return { ...job, load: load || undefined };
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [created] = await db.insert(jobs).values(job).returning();
    return created;
  }

  async updateJobStatus(id: string, status: LoadStatus): Promise<Job | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === 'in_transit') {
      updateData.pickupConfirmedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveryConfirmedAt = new Date();
    }

    const [updated] = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, id))
      .returning();
    
    if (updated) {
      await db.update(loads).set({ status, updatedAt: new Date() }).where(eq(loads.id, updated.loadId));
    }

    return updated || undefined;
  }

  // Stats
  async getStats(userId: string, role: 'shipper' | 'transporter' | 'admin'): Promise<{
    totalLoads: number;
    activeJobs: number;
    totalBids: number;
    completedJobs: number;
  }> {
    if (role === 'admin') {
      const totalLoadsResult = await db.select({ count: sql<number>`count(*)` }).from(loads);
      const activeJobsResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(inArray(jobs.status, ['accepted', 'in_transit']));
      const totalBidsResult = await db.select({ count: sql<number>`count(*)` }).from(bids);
      const completedJobsResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.status, 'delivered'));

      return {
        totalLoads: Number(totalLoadsResult[0]?.count) || 0,
        activeJobs: Number(activeJobsResult[0]?.count) || 0,
        totalBids: Number(totalBidsResult[0]?.count) || 0,
        completedJobs: Number(completedJobsResult[0]?.count) || 0,
      };
    }

    if (role === 'shipper') {
      const totalLoadsResult = await db.select({ count: sql<number>`count(*)` }).from(loads).where(eq(loads.shipperId, userId));
      const activeJobsResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.shipperId, userId), inArray(jobs.status, ['accepted', 'in_transit'])));
      
      const userLoads = await db.select({ id: loads.id }).from(loads).where(eq(loads.shipperId, userId));
      const loadIds = userLoads.map(l => l.id);
      let totalBidsCount = 0;
      if (loadIds.length > 0) {
        const totalBidsResult = await db.select({ count: sql<number>`count(*)` }).from(bids).where(inArray(bids.loadId, loadIds));
        totalBidsCount = Number(totalBidsResult[0]?.count) || 0;
      }
      
      const completedJobsResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.shipperId, userId), eq(jobs.status, 'delivered')));

      return {
        totalLoads: Number(totalLoadsResult[0]?.count) || 0,
        activeJobs: Number(activeJobsResult[0]?.count) || 0,
        totalBids: totalBidsCount,
        completedJobs: Number(completedJobsResult[0]?.count) || 0,
      };
    }

    // Transporter
    const totalBidsResult = await db.select({ count: sql<number>`count(*)` }).from(bids).where(eq(bids.transporterId, userId));
    const activeJobsResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.transporterId, userId), inArray(jobs.status, ['accepted', 'in_transit'])));
    const completedJobsResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.transporterId, userId), eq(jobs.status, 'delivered')));
    const availableLoadsResult = await db.select({ count: sql<number>`count(*)` }).from(loads).where(eq(loads.status, 'posted'));

    return {
      totalLoads: Number(availableLoadsResult[0]?.count) || 0,
      activeJobs: Number(activeJobsResult[0]?.count) || 0,
      totalBids: Number(totalBidsResult[0]?.count) || 0,
      completedJobs: Number(completedJobsResult[0]?.count) || 0,
    };
  }

  // Admin functions
  async getAllUsers(): Promise<(UserProfile & { email?: string })[]> {
    const results = await db
      .select({
        profile: userProfiles,
        email: users.email,
      })
      .from(userProfiles)
      .leftJoin(users, eq(userProfiles.userId, users.id))
      .orderBy(desc(userProfiles.createdAt));

    return results.map(r => ({
      ...r.profile,
      email: r.email || undefined,
    }));
  }

  async getAllLoads(): Promise<(Load & { shipper?: UserProfile })[]> {
    const loadsData = await db.select().from(loads).orderBy(desc(loads.createdAt));
    
    const loadResults = await Promise.all(
      loadsData.map(async (load) => {
        const [shipper] = await db.select().from(userProfiles).where(eq(userProfiles.userId, load.shipperId));
        return { ...load, shipper };
      })
    );

    return loadResults;
  }

  async getAllJobs(): Promise<(Job & { load?: Load })[]> {
    const jobsData = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
    
    const jobResults = await Promise.all(
      jobsData.map(async (job) => {
        const [load] = await db.select().from(loads).where(eq(loads.id, job.loadId));
        return { ...job, load };
      })
    );

    return jobResults;
  }

  async getAdminReports(): Promise<{
    loadsByStatus: { status: string; count: number }[];
    recentActivity: { date: string; loads: number; bids: number; jobs: number }[];
    topRoutes: { origin: string; destination: string; count: number }[];
    usersByRole: { role: string; count: number }[];
  }> {
    // Loads by status
    const loadsByStatusResult = await db
      .select({
        status: loads.status,
        count: sql<number>`count(*)`,
      })
      .from(loads)
      .groupBy(loads.status);

    // Users by role
    const usersByRoleResult = await db
      .select({
        role: userProfiles.role,
        count: sql<number>`count(*)`,
      })
      .from(userProfiles)
      .groupBy(userProfiles.role);

    // Top routes
    const topRoutesResult = await db
      .select({
        origin: loads.originCity,
        destination: loads.destinationCity,
        count: sql<number>`count(*)`,
      })
      .from(loads)
      .groupBy(loads.originCity, loads.destinationCity)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLoads = await db
      .select({
        date: sql<string>`date(${loads.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(loads)
      .where(gte(loads.createdAt, sevenDaysAgo))
      .groupBy(sql`date(${loads.createdAt})`);

    const recentBids = await db
      .select({
        date: sql<string>`date(${bids.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(bids)
      .where(gte(bids.createdAt, sevenDaysAgo))
      .groupBy(sql`date(${bids.createdAt})`);

    const recentJobsData = await db
      .select({
        date: sql<string>`date(${jobs.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(jobs)
      .where(gte(jobs.createdAt, sevenDaysAgo))
      .groupBy(sql`date(${jobs.createdAt})`);

    // Combine activity data
    const activityMap = new Map<string, { loads: number; bids: number; jobs: number }>();
    recentLoads.forEach(l => {
      const existing = activityMap.get(l.date) || { loads: 0, bids: 0, jobs: 0 };
      existing.loads = Number(l.count);
      activityMap.set(l.date, existing);
    });
    recentBids.forEach(b => {
      const existing = activityMap.get(b.date) || { loads: 0, bids: 0, jobs: 0 };
      existing.bids = Number(b.count);
      activityMap.set(b.date, existing);
    });
    recentJobsData.forEach(j => {
      const existing = activityMap.get(j.date) || { loads: 0, bids: 0, jobs: 0 };
      existing.jobs = Number(j.count);
      activityMap.set(j.date, existing);
    });

    const recentActivity = Array.from(activityMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      loadsByStatus: loadsByStatusResult.map(l => ({ status: l.status, count: Number(l.count) })),
      recentActivity,
      topRoutes: topRoutesResult.map(r => ({
        origin: r.origin,
        destination: r.destination,
        count: Number(r.count),
      })),
      usersByRole: usersByRoleResult.map(u => ({ role: u.role, count: Number(u.count) })),
    };
  }
}

export const storage = new DatabaseStorage();
