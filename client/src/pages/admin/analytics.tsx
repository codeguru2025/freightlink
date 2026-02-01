import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Package, 
  Users, 
  TrendingUp, 
  MapPin,
  Activity
} from "lucide-react";

interface AdminReports {
  loadsByStatus: { status: string; count: number }[];
  recentActivity: { date: string; loads: number; bids: number; jobs: number }[];
  topRoutes: { origin: string; destination: string; count: number }[];
  usersByRole: { role: string; count: number }[];
}

const statusColors: Record<string, string> = {
  posted: "bg-blue-500",
  bidding: "bg-yellow-500",
  accepted: "bg-purple-500",
  in_transit: "bg-orange-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

const roleColors: Record<string, string> = {
  shipper: "bg-blue-500",
  transporter: "bg-green-500",
  admin: "bg-purple-500",
};

export default function AdminAnalyticsPage() {
  const { data: reports, isLoading } = useQuery<AdminReports>({
    queryKey: ["/api/admin/reports"],
  });

  const totalLoads = reports?.loadsByStatus.reduce((sum, l) => sum + l.count, 0) || 0;
  const totalUsers = reports?.usersByRole.reduce((sum, u) => sum + u.count, 0) || 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Analytics & Reports">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics & Reports">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Loads</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-loads">{totalLoads}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-users">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Top Routes</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-top-routes">
                {reports?.topRoutes.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Popular routes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Activity Days</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-activity-days">
                {reports?.recentActivity.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Loads by Status</CardTitle>
              </div>
              <CardDescription>Distribution of loads across different statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports?.loadsByStatus.map((item) => (
                  <div key={item.status} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className={`w-3 h-3 rounded-full ${statusColors[item.status] || 'bg-gray-500'}`} />
                      <span className="text-sm capitalize">{item.status.replace("_", " ")}</span>
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full ${statusColors[item.status] || 'bg-gray-500'}`}
                        style={{ width: `${totalLoads > 0 ? (item.count / totalLoads) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium min-w-[40px] text-right">{item.count}</span>
                  </div>
                ))}
                {(!reports?.loadsByStatus || reports.loadsByStatus.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Users by Role</CardTitle>
              </div>
              <CardDescription>Distribution of users across different roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports?.usersByRole.map((item) => (
                  <div key={item.role} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className={`w-3 h-3 rounded-full ${roleColors[item.role] || 'bg-gray-500'}`} />
                      <span className="text-sm capitalize">{item.role}</span>
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full ${roleColors[item.role] || 'bg-gray-500'}`}
                        style={{ width: `${totalUsers > 0 ? (item.count / totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium min-w-[40px] text-right">{item.count}</span>
                  </div>
                ))}
                {(!reports?.usersByRole || reports.usersByRole.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Top Routes</CardTitle>
              </div>
              <CardDescription>Most popular shipping routes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports?.topRoutes.map((route, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                      <span className="text-sm font-medium">{route.origin}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm font-medium">{route.destination}</span>
                    </div>
                    <Badge>{route.count} loads</Badge>
                  </div>
                ))}
                {(!reports?.topRoutes || reports.topRoutes.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <CardDescription>Platform activity over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports?.recentActivity.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{day.date}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {day.loads} loads
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {day.bids} bids
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {day.jobs} jobs
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!reports?.recentActivity || reports.recentActivity.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
