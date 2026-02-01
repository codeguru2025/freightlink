import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, MapPin, Calendar, DollarSign } from "lucide-react";
import type { Load, UserProfile } from "@shared/schema";

type LoadWithShipper = Load & { shipper?: UserProfile };

const statusColors: Record<string, string> = {
  posted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  bidding: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  accepted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  in_transit: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function AdminLoadsPage() {
  const { data: loads, isLoading } = useQuery<LoadWithShipper[]>({
    queryKey: ["/api/admin/loads"],
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <DashboardLayout title="Manage All Loads">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>All Loads</CardTitle>
            </div>
            <CardDescription>
              View and manage all loads in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : loads && loads.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loads.map((load) => (
                      <TableRow key={load.id} data-testid={`row-load-${load.id}`}>
                        <TableCell className="font-medium">{load.title}</TableCell>
                        <TableCell>{load.shipper?.companyName || "Unknown"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {load.originCity} → {load.destinationCity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {load.budget}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[load.status] || ""}>
                            {load.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(load.createdAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No loads found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
