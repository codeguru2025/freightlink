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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  FileDown,
  Package,
  Truck,
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  MapPin,
  Download,
} from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Load, Job, Bid, UserProfile, WalletTransaction, Document as DocumentType } from "@shared/schema";
import { FileText, Eye } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalLoads: number;
  totalJobs: number;
  totalRevenue: number;
  completedJobs: number;
  activeJobs: number;
}

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const { data: allLoads, isLoading: loadsLoading } = useQuery<Load[]>({
    queryKey: ["/api/admin/loads"],
    enabled: !!user && userProfile?.role === "admin",
  });

  const { data: allJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/admin/jobs"],
    enabled: !!user && userProfile?.role === "admin",
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user && userProfile?.role === "admin",
  });

  const { data: allTransactions } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: !!user && userProfile?.role === "admin",
  });

  const { data: allDocuments, isLoading: documentsLoading } = useQuery<(DocumentType & { user?: UserProfile })[]>({
    queryKey: ["/api/admin/documents/all"],
    enabled: !!user && userProfile?.role === "admin",
  });

  if (userProfile?.role !== "admin") {
    return (
      <DashboardLayout title="Access Denied" breadcrumbs={[{ label: "Reports" }]}>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </DashboardLayout>
    );
  }

  const stats: AdminStats = {
    totalUsers: allUsers?.length || 0,
    totalLoads: allLoads?.length || 0,
    totalJobs: allJobs?.length || 0,
    completedJobs: allJobs?.filter((j) => j.status === "delivered").length || 0,
    activeJobs: allJobs?.filter((j) => j.status === "in_transit" || j.status === "accepted").length || 0,
    totalRevenue: allTransactions
      ?.filter((t) => t.type === "commission_deduction" && t.status === "completed")
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) || 0,
  };

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
      verified: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
  };

  const exportLoadsToExcel = () => {
    if (!allLoads) return;
    const data = allLoads.map((load) => ({
      ID: load.id,
      Title: load.title,
      "Origin City": load.originCity,
      "Destination City": load.destinationCity,
      "Cargo Type": load.cargoType,
      "Weight (kg)": load.weight,
      Budget: load.budget,
      Status: load.status,
      "Created At": formatDate(load.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loads");
    XLSX.writeFile(wb, `FreightLink_Loads_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportLoadsToPDF = () => {
    if (!allLoads) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("FreightLink ZW - Loads Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = allLoads.map((load) => [
      load.id.slice(0, 8),
      load.title?.slice(0, 20) || "-",
      load.originCity,
      load.destinationCity,
      load.cargoType,
      formatCurrency(load.budget || "0"),
      load.status,
    ]);

    autoTable(doc, {
      head: [["ID", "Title", "Origin", "Destination", "Cargo", "Budget", "Status"]],
      body: tableData,
      startY: 40,
    });

    doc.save(`FreightLink_Loads_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const exportJobsToExcel = () => {
    if (!allJobs) return;
    const data = allJobs.map((job) => ({
      ID: job.id,
      "Load ID": job.loadId,
      "Shipper ID": job.shipperId,
      "Transporter ID": job.transporterId,
      "Agreed Amount": job.agreedAmount,
      Status: job.status,
      "Payment Status": job.paymentStatus,
      "Created At": formatDate(job.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs");
    XLSX.writeFile(wb, `FreightLink_Jobs_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportJobsToPDF = () => {
    if (!allJobs) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("FreightLink ZW - Jobs Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = allJobs.map((job) => [
      job.id.slice(0, 8),
      job.loadId.slice(0, 8),
      formatCurrency(job.agreedAmount),
      job.status,
      job.paymentStatus,
      formatDate(job.createdAt),
    ]);

    autoTable(doc, {
      head: [["ID", "Load ID", "Amount", "Status", "Payment", "Created"]],
      body: tableData,
      startY: 40,
    });

    doc.save(`FreightLink_Jobs_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const exportUsersToExcel = () => {
    if (!allUsers) return;
    const data = allUsers.map((profile) => ({
      ID: profile.id,
      "User ID": profile.userId,
      "Company Name": profile.companyName,
      Role: profile.role,
      "Phone Number": profile.phoneNumber,
      City: profile.city,
      "Verified": profile.isVerified ? "Yes" : "No",
      "Created At": formatDate(profile.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, `FreightLink_Users_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportUsersToPDF = () => {
    if (!allUsers) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("FreightLink ZW - Users Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = allUsers.map((profile) => [
      profile.id.slice(0, 8),
      profile.companyName || "-",
      profile.role,
      profile.phoneNumber || "-",
      profile.city || "-",
      profile.isVerified ? "Verified" : "Pending",
    ]);

    autoTable(doc, {
      head: [["ID", "Company", "Role", "Phone", "City", "Status"]],
      body: tableData,
      startY: 40,
    });

    doc.save(`FreightLink_Users_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const exportTransactionsToExcel = () => {
    if (!allTransactions) return;
    const data = allTransactions.map((tx) => ({
      ID: tx.id,
      "Wallet ID": tx.walletId,
      Type: tx.type,
      Amount: tx.amount,
      Status: tx.status,
      Reference: tx.reference,
      Description: tx.description,
      "Created At": formatDate(tx.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `FreightLink_Transactions_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportTransactionsToPDF = () => {
    if (!allTransactions) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("FreightLink ZW - Transactions Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = allTransactions.map((tx) => [
      tx.id.slice(0, 8),
      tx.type.replace("_", " "),
      formatCurrency(tx.amount),
      tx.status,
      tx.reference || "-",
      formatDate(tx.createdAt),
    ]);

    autoTable(doc, {
      head: [["ID", "Type", "Amount", "Status", "Reference", "Created"]],
      body: tableData,
      startY: 40,
    });

    doc.save(`FreightLink_Transactions_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <DashboardLayout title="Admin Reports" breadcrumbs={[{ label: "Admin" }, { label: "Reports" }]}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {usersLoading ? <Skeleton className="h-8 w-16" /> : stats.totalUsers}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Loads</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-loads">
                {loadsLoading ? <Skeleton className="h-8 w-16" /> : stats.totalLoads}
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
                {jobsLoading ? <Skeleton className="h-8 w-16" /> : stats.completedJobs}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-platform-revenue">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">From commission deductions</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="loads" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="loads" data-testid="tab-loads">Loads</TabsTrigger>
              <TabsTrigger value="jobs" data-testid="tab-jobs">Jobs</TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
              <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "excel" | "pdf")}>
                <SelectTrigger className="w-32" data-testid="select-export-format">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="loads" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>All Loads</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportFormat === "excel" ? exportLoadsToExcel : exportLoadsToPDF}
                  data-testid="button-export-loads"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </Button>
              </CardHeader>
              <CardContent>
                {loadsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : !allLoads?.length ? (
                  <p className="text-muted-foreground text-center py-8">No loads found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allLoads.slice(0, 10).map((load) => (
                          <TableRow key={load.id} data-testid={`row-load-${load.id}`}>
                            <TableCell className="font-mono text-xs">{load.id.slice(0, 8)}</TableCell>
                            <TableCell>{load.title?.slice(0, 25) || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {load.originCity} → {load.destinationCity}
                              </div>
                            </TableCell>
                            <TableCell>{load.cargoType}</TableCell>
                            <TableCell>{formatCurrency(load.budget || "0")}</TableCell>
                            <TableCell>{getStatusBadge(load.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {allLoads.length > 10 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing 10 of {allLoads.length} loads. Export for full data.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>All Jobs</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportFormat === "excel" ? exportJobsToExcel : exportJobsToPDF}
                  data-testid="button-export-jobs"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </Button>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : !allJobs?.length ? (
                  <p className="text-muted-foreground text-center py-8">No jobs found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Load ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allJobs.slice(0, 10).map((job) => (
                          <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                            <TableCell className="font-mono text-xs">{job.id.slice(0, 8)}</TableCell>
                            <TableCell className="font-mono text-xs">{job.loadId.slice(0, 8)}</TableCell>
                            <TableCell>{formatCurrency(job.agreedAmount)}</TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell>{getStatusBadge(job.paymentStatus)}</TableCell>
                            <TableCell>{formatDate(job.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {allJobs.length > 10 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing 10 of {allJobs.length} jobs. Export for full data.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>All Users</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportFormat === "excel" ? exportUsersToExcel : exportUsersToPDF}
                  data-testid="button-export-users"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </Button>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : !allUsers?.length ? (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.slice(0, 10).map((profile) => (
                          <TableRow key={profile.id} data-testid={`row-user-${profile.id}`}>
                            <TableCell className="font-mono text-xs">{profile.id.slice(0, 8)}</TableCell>
                            <TableCell>{profile.companyName || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{profile.role}</Badge>
                            </TableCell>
                            <TableCell>{profile.phoneNumber || "-"}</TableCell>
                            <TableCell>{profile.city || "-"}</TableCell>
                            <TableCell>{getStatusBadge(profile.isVerified ? "verified" : "pending")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {allUsers.length > 10 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing 10 of {allUsers.length} users. Export for full data.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>All Transactions</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportFormat === "excel" ? exportTransactionsToExcel : exportTransactionsToPDF}
                  data-testid="button-export-transactions"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </Button>
              </CardHeader>
              <CardContent>
                {!allTransactions ? (
                  <Skeleton className="h-48 w-full" />
                ) : !allTransactions.length ? (
                  <p className="text-muted-foreground text-center py-8">No transactions found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTransactions.slice(0, 10).map((tx) => (
                          <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                            <TableCell className="font-mono text-xs">{tx.id.slice(0, 8)}</TableCell>
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
                            <TableCell className="font-mono text-xs">{tx.reference || "-"}</TableCell>
                            <TableCell>{formatDate(tx.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {allTransactions.length > 10 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing 10 of {allTransactions.length} transactions. Export for full data.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>All Documents</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    POD documents, payment proofs, and verification documents
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : !allDocuments?.length ? (
                  <p className="text-muted-foreground text-center py-8">No documents found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>File Name</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Job ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>View</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allDocuments.slice(0, 20).map((doc) => (
                          <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                            <TableCell className="font-mono text-xs">{doc.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <Badge variant={doc.documentType === "payment_proof" ? "default" : "outline"}>
                                {doc.documentType.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">{doc.fileName}</TableCell>
                            <TableCell>{doc.user?.companyName || doc.userId.slice(0, 8)}</TableCell>
                            <TableCell className="font-mono text-xs">{doc.jobId?.slice(0, 8) || "-"}</TableCell>
                            <TableCell>{getStatusBadge(doc.status)}</TableCell>
                            <TableCell>
                              {doc.fileUrl && (
                                <a 
                                  href={doc.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-1"
                                  data-testid={`link-view-document-${doc.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {allDocuments.length > 20 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing 20 of {allDocuments.length} documents.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
