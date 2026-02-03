import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  FileText,
  Package,
  Truck,
  DollarSign,
  TrendingUp,
  Calendar,
  MapPin,
} from "lucide-react";
import type { Load, Job, Bid, UserProfile, WalletTransaction } from "@shared/schema";

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const { data: loads, isLoading: loadsLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
    enabled: !!user,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: !!user,
  });

  const { data: bids, isLoading: bidsLoading } = useQuery<Bid[]>({
    queryKey: ["/api/bids"],
    enabled: !!user && userProfile?.role === "transporter",
  });

  const { data: walletTransactions } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user && userProfile?.role === "transporter",
  });

  if (authLoading) {
    return (
      <DashboardLayout title="Reports" breadcrumbs={[{ label: "Reports" }]}>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const isShipper = userProfile?.role === "shipper";
  const isTransporter = userProfile?.role === "transporter";

  const myLoads = loads?.filter((l) => l.shipperId === user?.id) || [];
  const myJobs = jobs || [];
  const myBids = bids || [];
  const completedJobs = myJobs.filter((j) => j.status === "delivered");
  const activeJobs = myJobs.filter((j) => j.status === "in_transit" || j.status === "accepted");

  const totalEarnings = walletTransactions
    ?.filter((t) => t.type === "deposit" && t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  const totalCommission = walletTransactions
    ?.filter((t) => t.type === "commission_deduction" && t.status === "completed")
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) || 0;

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      delivered: "default",
      in_transit: "secondary",
      accepted: "secondary",
      posted: "outline",
      pending: "outline",
      completed: "default",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
  };

  return (
    <DashboardLayout title="Reports & Summaries" breadcrumbs={[{ label: "Reports" }]}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isShipper && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Total Loads Posted</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-loads">
                    {loadsLoading ? <Skeleton className="h-8 w-16" /> : myLoads.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-jobs">
                    {jobsLoading ? <Skeleton className="h-8 w-16" /> : activeJobs.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-completed-jobs">
                    {jobsLoading ? <Skeleton className="h-8 w-16" /> : completedJobs.length}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {isTransporter && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-bids">
                    {bidsLoading ? <Skeleton className="h-8 w-16" /> : myBids.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-jobs">
                    {jobsLoading ? <Skeleton className="h-8 w-16" /> : activeJobs.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Completed Trips</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-completed-trips">
                    {jobsLoading ? <Skeleton className="h-8 w-16" /> : completedJobs.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-earnings">
                    {formatCurrency(totalEarnings)}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Tabs defaultValue={isShipper ? "loads" : "jobs"} className="space-y-4">
          <TabsList>
            {isShipper && <TabsTrigger value="loads" data-testid="tab-loads">My Loads</TabsTrigger>}
            <TabsTrigger value="jobs" data-testid="tab-jobs">
              {isShipper ? "My Jobs" : "My Trips"}
            </TabsTrigger>
            {isTransporter && <TabsTrigger value="bids" data-testid="tab-bids">My Bids</TabsTrigger>}
            {isTransporter && (
              <TabsTrigger value="transactions" data-testid="tab-transactions">
                Transactions
              </TabsTrigger>
            )}
          </TabsList>

          {isShipper && (
            <TabsContent value="loads" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Posted Loads History</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : myLoads.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No loads posted yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Budget</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myLoads.map((load) => (
                            <TableRow key={load.id} data-testid={`row-load-${load.id}`}>
                              <TableCell>{formatDate(load.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {load.originCity} → {load.destinationCity}
                                </div>
                              </TableCell>
                              <TableCell>
                                {load.cargoType} ({load.weight} kg)
                              </TableCell>
                              <TableCell>{formatCurrency(load.budget || "0")}</TableCell>
                              <TableCell>{getStatusBadge(load.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{isShipper ? "Jobs History" : "Trips History"}</CardTitle>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : myJobs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No {isShipper ? "jobs" : "trips"} yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myJobs.map((job) => (
                          <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                            <TableCell>{formatDate(job.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Job #{job.id}
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(job.agreedAmount)}</TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell>{getStatusBadge(job.paymentStatus)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isTransporter && (
            <TabsContent value="bids" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bids History</CardTitle>
                </CardHeader>
                <CardContent>
                  {bidsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : myBids.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No bids placed yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Load ID</TableHead>
                            <TableHead>Bid Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myBids.map((bid) => (
                            <TableRow key={bid.id} data-testid={`row-bid-${bid.id}`}>
                              <TableCell>{formatDate(bid.createdAt)}</TableCell>
                              <TableCell>Load #{bid.loadId}</TableCell>
                              <TableCell>{formatCurrency(bid.amount)}</TableCell>
                              <TableCell>{getStatusBadge(bid.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isTransporter && (
            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Wallet Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {!walletTransactions ? (
                    <Skeleton className="h-48 w-full" />
                  ) : walletTransactions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No transactions yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reference</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {walletTransactions.map((tx) => (
                            <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                              <TableCell>{formatDate(tx.createdAt)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{tx.type.replace("_", " ")}</Badge>
                              </TableCell>
                              <TableCell
                                className={
                                  tx.type === "deposit" || tx.type === "refund"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {tx.type === "deposit" || tx.type === "refund" ? "+" : "-"}
                                {formatCurrency(Math.abs(parseFloat(tx.amount)))}
                              </TableCell>
                              <TableCell>{getStatusBadge(tx.status)}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {tx.reference || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
