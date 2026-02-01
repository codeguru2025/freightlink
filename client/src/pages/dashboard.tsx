import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadCard, LoadCardSkeleton } from "@/components/load-card";
import { JobCard, JobCardSkeleton } from "@/components/job-card";
import { 
  Package, 
  Truck, 
  TrendingUp, 
  DollarSign, 
  PlusCircle, 
  ArrowRight,
  Gavel,
  Briefcase,
  Users,
  Activity
} from "lucide-react";
import { Link } from "wouter";
import type { Load, Job, UserProfile, Bid } from "@shared/schema";

interface DashboardStats {
  totalLoads: number;
  activeJobs: number;
  totalBids: number;
  completedJobs: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
    enabled: !!profile,
  });

  const { data: recentLoads, isLoading: loadsLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads/recent"],
    enabled: !!profile,
  });

  const { data: activeJobs, isLoading: jobsLoading } = useQuery<(Job & { load?: Load })[]>({
    queryKey: ["/api/jobs/active"],
    enabled: !!profile,
  });

  const firstName = user?.firstName || "there";

  if (profileLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Welcome back, ${firstName}!`}>
      <div className="space-y-8">
        {profile?.role === "shipper" && <ShipperDashboard stats={stats} recentLoads={recentLoads} activeJobs={activeJobs} loadsLoading={loadsLoading} jobsLoading={jobsLoading} />}
        {profile?.role === "transporter" && <TransporterDashboard stats={stats} activeJobs={activeJobs} jobsLoading={jobsLoading} />}
        {profile?.role === "admin" && <AdminDashboard stats={stats} />}
      </div>
    </DashboardLayout>
  );
}

function ShipperDashboard({ stats, recentLoads, activeJobs, loadsLoading, jobsLoading }: { 
  stats?: DashboardStats; 
  recentLoads?: Load[]; 
  activeJobs?: (Job & { load?: Load })[];
  loadsLoading: boolean;
  jobsLoading: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-loads">
              {stats?.totalLoads || 0}
            </div>
            <p className="text-xs text-muted-foreground">Loads posted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-jobs">
              {stats?.activeJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Jobs in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Bids Received</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-bids-received">
              {stats?.totalBids || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total bids on your loads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed-jobs">
              {stats?.completedJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Deliveries completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/loads/new">
          <Button size="lg" className="gap-2" data-testid="button-post-load">
            <PlusCircle className="h-5 w-5" />
            Post New Load
          </Button>
        </Link>
        <Link href="/loads">
          <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-loads">
            View All Loads
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Loads</CardTitle>
            <CardDescription>Your most recently posted loads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadsLoading ? (
              [...Array(2)].map((_, i) => <LoadCardSkeleton key={i} />)
            ) : recentLoads && recentLoads.length > 0 ? (
              recentLoads.slice(0, 3).map((load) => (
                <LoadCard key={load.id} load={load} showBidButton={false} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No loads posted yet</p>
                <Link href="/loads/new">
                  <Button variant="ghost" className="mt-2">Post your first load</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Jobs</CardTitle>
            <CardDescription>Jobs currently in progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobsLoading ? (
              [...Array(2)].map((_, i) => <JobCardSkeleton key={i} />)
            ) : activeJobs && activeJobs.length > 0 ? (
              activeJobs.slice(0, 3).map((job) => (
                <JobCard key={job.id} job={job} isShipper />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active jobs</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function TransporterDashboard({ stats, activeJobs, jobsLoading }: { 
  stats?: DashboardStats; 
  activeJobs?: (Job & { load?: Load })[];
  jobsLoading: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">My Bids</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-my-bids">
              {stats?.totalBids || 0}
            </div>
            <p className="text-xs text-muted-foreground">Bids submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-jobs">
              {stats?.activeJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Jobs in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed-jobs">
              {stats?.completedJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Deliveries completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Available Loads</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-available-loads">
              {stats?.totalLoads || 0}
            </div>
            <p className="text-xs text-muted-foreground">Open for bidding</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/marketplace">
          <Button size="lg" className="gap-2" data-testid="button-find-loads">
            <Package className="h-5 w-5" />
            Find Available Loads
          </Button>
        </Link>
        <Link href="/bids">
          <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-bids">
            View My Bids
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Jobs</CardTitle>
          <CardDescription>Jobs you're currently working on</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(2)].map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : activeJobs && activeJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeJobs.slice(0, 4).map((job) => (
                <JobCard key={job.id} job={job} isTransporter />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active jobs</p>
              <Link href="/marketplace">
                <Button variant="ghost" className="mt-2">Browse available loads</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AdminDashboard({ stats }: { stats?: DashboardStats }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Loads</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-loads">
              {stats?.totalLoads || 0}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-jobs">
              {stats?.activeJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-bids">
              {stats?.totalBids || 0}
            </div>
            <p className="text-xs text-muted-foreground">Platform activity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed-jobs">
              {stats?.completedJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Deliveries</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/admin/loads">
          <Button size="lg" className="gap-2" data-testid="button-manage-loads">
            <Package className="h-5 w-5" />
            Manage Loads
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button size="lg" variant="outline" className="gap-2" data-testid="button-manage-users">
            <Users className="h-5 w-5" />
            Manage Users
          </Button>
        </Link>
      </div>
    </>
  );
}
