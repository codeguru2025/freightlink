import { 
  userProfiles, 
  trucks, 
  loads, 
  bids, 
  jobs,
  documents,
  messages,
  reviews,
  disputes,
  wallets,
  walletTransactions,
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
  type Document,
  type InsertDocument,
  type Message,
  type InsertMessage,
  type Review,
  type InsertReview,
  type Dispute,
  type InsertDispute,
  type Wallet,
  type InsertWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type LoadStatus,
  type BidStatus,
  type DocumentStatus,
  type DisputeStatus,
  type PaymentStatus,
  type TransactionStatus,
  POD_DOCUMENT_TYPES,
  COMMISSION_RATE
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

  // Documents
  getDocuments(userId: string): Promise<Document[]>;
  getDocumentsByJob(jobId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocumentStatus(id: string, status: DocumentStatus, verifiedBy?: string, rejectionReason?: string): Promise<Document | undefined>;
  getAllPendingDocuments(): Promise<(Document & { user?: UserProfile })[]>;

  // Messages
  getConversations(userId: string): Promise<{ partnerId: string; partner?: UserProfile; lastMessage?: Message; unreadCount: number }[]>;
  getMessages(userId: string, partnerId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(userId: string, senderId: string): Promise<void>;

  // Reviews
  getReviewsForUser(userId: string): Promise<(Review & { reviewer?: UserProfile })[]>;
  getReviewsByJob(jobId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  getUserRating(userId: string): Promise<{ average: number; count: number }>;

  // Disputes
  getDisputes(userId?: string): Promise<(Dispute & { job?: Job; raisedBy?: UserProfile })[]>;
  getDispute(id: string): Promise<(Dispute & { job?: Job; raisedBy?: UserProfile; against?: UserProfile }) | undefined>;
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  updateDisputeStatus(id: string, status: DisputeStatus, resolution?: string, resolvedById?: string): Promise<Dispute | undefined>;

  // POD (Proof of Delivery) - Payment workflow
  getPodDocuments(jobId: string): Promise<Document[]>;
  submitPod(jobId: string, notes?: string): Promise<Job | undefined>;
  confirmPod(jobId: string): Promise<Job | undefined>;
  requestPayment(jobId: string): Promise<Job | undefined>;
  markAsPaid(jobId: string): Promise<Job | undefined>;
  getJobsByPaymentStatus(userId: string, role: 'shipper' | 'transporter', paymentStatus?: PaymentStatus): Promise<(Job & { load?: Load; podDocuments?: Document[] })[]>;
  updateJobPaymentStatus(jobId: string, paymentStatus: PaymentStatus): Promise<Job | undefined>;

  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  getOrCreateWallet(userId: string): Promise<Wallet>;
  updateWalletBalance(userId: string, amount: number): Promise<Wallet | undefined>;
  deductCommission(userId: string, jobId: string, amount: number): Promise<WalletTransaction | undefined>;
  
  // Wallet transactions
  getWalletTransactions(userId: string): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  updateTransactionStatus(id: string, status: TransactionStatus, paynowReference?: string): Promise<WalletTransaction | undefined>;
  getTransactionByReference(reference: string): Promise<WalletTransaction | undefined>;
  
  // Marketplace with wallet filter
  getAvailableLoadsForTransporter(userId: string): Promise<Load[]>;
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

  // Documents
  async getDocuments(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByJob(jobId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.jobId, jobId)).orderBy(desc(documents.createdAt));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async updateDocumentStatus(id: string, status: DocumentStatus, verifiedBy?: string, rejectionReason?: string): Promise<Document | undefined> {
    const updateData: any = { status };
    if (status === 'verified') {
      updateData.verifiedBy = verifiedBy;
      updateData.verifiedAt = new Date();
    } else if (status === 'rejected') {
      updateData.verifiedBy = verifiedBy;
      updateData.rejectionReason = rejectionReason;
    }
    const [updated] = await db.update(documents).set(updateData).where(eq(documents.id, id)).returning();
    return updated || undefined;
  }

  async getAllPendingDocuments(): Promise<(Document & { user?: UserProfile })[]> {
    const docs = await db.select().from(documents).where(eq(documents.status, 'pending')).orderBy(desc(documents.createdAt));
    const docsWithUser = await Promise.all(
      docs.map(async (doc) => {
        const [user] = await db.select().from(userProfiles).where(eq(userProfiles.userId, doc.userId));
        return { ...doc, user };
      })
    );
    return docsWithUser;
  }

  // Messages
  async getConversations(userId: string): Promise<{ partnerId: string; partner?: UserProfile; lastMessage?: Message; unreadCount: number }[]> {
    const allMessages = await db.select().from(messages)
      .where(sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`)
      .orderBy(desc(messages.createdAt));

    const conversationMap = new Map<string, { lastMessage: Message; unreadCount: number }>();
    
    for (const msg of allMessages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(partnerId)) {
        const unreadCount = allMessages.filter(m => m.senderId === partnerId && m.receiverId === userId && !m.isRead).length;
        conversationMap.set(partnerId, { lastMessage: msg, unreadCount });
      }
    }

    const conversations = await Promise.all(
      Array.from(conversationMap.entries()).map(async ([partnerId, data]) => {
        const [partner] = await db.select().from(userProfiles).where(eq(userProfiles.userId, partnerId));
        return { partnerId, partner, lastMessage: data.lastMessage, unreadCount: data.unreadCount };
      })
    );

    return conversations;
  }

  async getMessages(userId: string, partnerId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(sql`(${messages.senderId} = ${userId} AND ${messages.receiverId} = ${partnerId}) OR (${messages.senderId} = ${partnerId} AND ${messages.receiverId} = ${userId})`)
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async markMessagesAsRead(userId: string, senderId: string): Promise<void> {
    await db.update(messages).set({ isRead: true })
      .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, userId)));
  }

  // Reviews
  async getReviewsForUser(userId: string): Promise<(Review & { reviewer?: UserProfile })[]> {
    const reviewList = await db.select().from(reviews).where(eq(reviews.revieweeId, userId)).orderBy(desc(reviews.createdAt));
    const reviewsWithReviewer = await Promise.all(
      reviewList.map(async (review) => {
        const [reviewer] = await db.select().from(userProfiles).where(eq(userProfiles.userId, review.reviewerId));
        return { ...review, reviewer };
      })
    );
    return reviewsWithReviewer;
  }

  async getReviewsByJob(jobId: string): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.jobId, jobId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async getUserRating(userId: string): Promise<{ average: number; count: number }> {
    const result = await db.select({
      avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(reviews).where(eq(reviews.revieweeId, userId));
    
    return {
      average: Number(result[0]?.avg) || 0,
      count: Number(result[0]?.count) || 0,
    };
  }

  // Disputes
  async getDisputes(userId?: string): Promise<(Dispute & { job?: Job; raisedBy?: UserProfile })[]> {
    const disputeList = userId
      ? await db.select().from(disputes).where(sql`${disputes.raisedById} = ${userId} OR ${disputes.againstId} = ${userId}`).orderBy(desc(disputes.createdAt))
      : await db.select().from(disputes).orderBy(desc(disputes.createdAt));

    const disputesWithDetails = await Promise.all(
      disputeList.map(async (dispute) => {
        const [job] = await db.select().from(jobs).where(eq(jobs.id, dispute.jobId));
        const [raisedBy] = await db.select().from(userProfiles).where(eq(userProfiles.userId, dispute.raisedById));
        return { ...dispute, job, raisedBy };
      })
    );
    return disputesWithDetails;
  }

  async getDispute(id: string): Promise<(Dispute & { job?: Job; raisedBy?: UserProfile; against?: UserProfile }) | undefined> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));
    if (!dispute) return undefined;

    const [job] = await db.select().from(jobs).where(eq(jobs.id, dispute.jobId));
    const [raisedBy] = await db.select().from(userProfiles).where(eq(userProfiles.userId, dispute.raisedById));
    const [against] = await db.select().from(userProfiles).where(eq(userProfiles.userId, dispute.againstId));
    
    return { ...dispute, job, raisedBy, against };
  }

  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const [created] = await db.insert(disputes).values(dispute).returning();
    return created;
  }

  async updateDisputeStatus(id: string, status: DisputeStatus, resolution?: string, resolvedById?: string): Promise<Dispute | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'resolved' || status === 'closed') {
      updateData.resolution = resolution;
      updateData.resolvedById = resolvedById;
      updateData.resolvedAt = new Date();
    }
    const [updated] = await db.update(disputes).set(updateData).where(eq(disputes.id, id)).returning();
    return updated || undefined;
  }

  // POD (Proof of Delivery) - Payment workflow
  async getPodDocuments(jobId: string): Promise<Document[]> {
    const podTypes = POD_DOCUMENT_TYPES as readonly string[];
    return await db.select().from(documents)
      .where(and(
        eq(documents.jobId, jobId),
        inArray(documents.documentType, podTypes as any)
      ))
      .orderBy(desc(documents.createdAt));
  }

  async submitPod(jobId: string, notes?: string): Promise<Job | undefined> {
    const updateData: any = {
      paymentStatus: 'pod_submitted' as PaymentStatus,
      podSubmittedAt: new Date(),
      updatedAt: new Date(),
    };
    if (notes) {
      updateData.podNotes = notes;
    }
    const [updated] = await db.update(jobs).set(updateData).where(eq(jobs.id, jobId)).returning();
    return updated || undefined;
  }

  async confirmPod(jobId: string): Promise<Job | undefined> {
    const [updated] = await db.update(jobs).set({
      paymentStatus: 'pod_confirmed' as PaymentStatus,
      podConfirmedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(jobs.id, jobId)).returning();
    return updated || undefined;
  }

  async requestPayment(jobId: string): Promise<Job | undefined> {
    const [updated] = await db.update(jobs).set({
      paymentStatus: 'payment_requested' as PaymentStatus,
      paymentRequestedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(jobs.id, jobId)).returning();
    return updated || undefined;
  }

  async markAsPaid(jobId: string): Promise<Job | undefined> {
    const [updated] = await db.update(jobs).set({
      paymentStatus: 'paid' as PaymentStatus,
      paidAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(jobs.id, jobId)).returning();
    return updated || undefined;
  }

  async getJobsByPaymentStatus(userId: string, role: 'shipper' | 'transporter', paymentStatus?: PaymentStatus): Promise<(Job & { load?: Load; podDocuments?: Document[] })[]> {
    let query;
    if (role === 'shipper') {
      query = paymentStatus
        ? db.select().from(jobs).where(and(eq(jobs.shipperId, userId), eq(jobs.paymentStatus, paymentStatus)))
        : db.select().from(jobs).where(eq(jobs.shipperId, userId));
    } else {
      query = paymentStatus
        ? db.select().from(jobs).where(and(eq(jobs.transporterId, userId), eq(jobs.paymentStatus, paymentStatus)))
        : db.select().from(jobs).where(eq(jobs.transporterId, userId));
    }

    const jobList = await query.orderBy(desc(jobs.updatedAt));
    
    const jobsWithDetails = await Promise.all(
      jobList.map(async (job) => {
        const [load] = await db.select().from(loads).where(eq(loads.id, job.loadId));
        const podDocuments = await this.getPodDocuments(job.id);
        return { ...job, load, podDocuments };
      })
    );

    return jobsWithDetails;
  }

  async updateJobPaymentStatus(jobId: string, paymentStatus: PaymentStatus): Promise<Job | undefined> {
    const updateData: any = { paymentStatus, updatedAt: new Date() };
    
    switch (paymentStatus) {
      case 'pod_submitted':
        updateData.podSubmittedAt = new Date();
        break;
      case 'pod_confirmed':
        updateData.podConfirmedAt = new Date();
        break;
      case 'payment_requested':
        updateData.paymentRequestedAt = new Date();
        break;
      case 'paid':
        updateData.paidAt = new Date();
        break;
    }

    const [updated] = await db.update(jobs).set(updateData).where(eq(jobs.id, jobId)).returning();
    return updated || undefined;
  }

  // Wallet operations
  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || undefined;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [created] = await db.insert(wallets).values(wallet).returning();
    return created;
  }

  async getOrCreateWallet(userId: string): Promise<Wallet> {
    const existing = await this.getWallet(userId);
    if (existing) return existing;
    return await this.createWallet({ userId, balance: "0", currency: "USD" });
  }

  async updateWalletBalance(userId: string, amount: number): Promise<Wallet | undefined> {
    const wallet = await this.getOrCreateWallet(userId);
    const newBalance = Number(wallet.balance) + amount;
    const [updated] = await db
      .update(wallets)
      .set({ balance: newBalance.toString(), updatedAt: new Date() })
      .where(eq(wallets.userId, userId))
      .returning();
    return updated || undefined;
  }

  async deductCommission(userId: string, jobId: string, amount: number): Promise<WalletTransaction | undefined> {
    const wallet = await this.getOrCreateWallet(userId);
    const commission = amount * COMMISSION_RATE;
    
    if (Number(wallet.balance) < commission) {
      throw new Error("Insufficient wallet balance for commission");
    }

    // Deduct from wallet
    await this.updateWalletBalance(userId, -commission);

    // Create transaction record
    const transaction = await this.createWalletTransaction({
      walletId: wallet.id,
      userId,
      type: "commission_deduction",
      amount: commission.toString(),
      currency: wallet.currency || "USD",
      status: "completed",
      jobId,
      description: `Commission deduction (${COMMISSION_RATE * 100}%) for job`,
      completedAt: new Date(),
    });

    return transaction;
  }

  // Wallet transactions
  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [created] = await db.insert(walletTransactions).values(transaction).returning();
    return created;
  }

  async updateTransactionStatus(id: string, status: TransactionStatus, paynowReference?: string): Promise<WalletTransaction | undefined> {
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    if (paynowReference) {
      updateData.paynowReference = paynowReference;
    }
    const [updated] = await db
      .update(walletTransactions)
      .set(updateData)
      .where(eq(walletTransactions.id, id))
      .returning();
    return updated || undefined;
  }

  async getTransactionByReference(reference: string): Promise<WalletTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.reference, reference));
    return transaction || undefined;
  }

  // Marketplace with wallet filter - only show loads where commission can be covered
  async getAvailableLoadsForTransporter(userId: string): Promise<Load[]> {
    const wallet = await this.getOrCreateWallet(userId);
    const walletBalance = Number(wallet.balance);

    // Get all posted loads
    const allLoads = await db
      .select()
      .from(loads)
      .where(eq(loads.status, "posted"))
      .orderBy(desc(loads.createdAt));

    // Filter loads where wallet balance can cover commission
    return allLoads.filter(load => {
      const budget = Number(load.budget || 0);
      const commission = budget * COMMISSION_RATE;
      return walletBalance >= commission;
    });
  }
}

export const storage = new DatabaseStorage();
