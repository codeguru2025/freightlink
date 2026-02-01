import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { LoadCard, LoadCardSkeleton } from "@/components/load-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Package } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Load, LoadStatus } from "@shared/schema";

export default function LoadsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: loads, isLoading } = useQuery<Load[]>({
    queryKey: ["/api/loads"],
  });

  const filteredLoads = loads?.filter((load) => {
    const matchesStatus = statusFilter === "all" || load.status === statusFilter;
    const matchesSearch = !searchQuery || 
      load.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.destinationCity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeLoads = filteredLoads?.filter(l => ["posted", "bidding", "accepted", "in_transit"].includes(l.status));
  const completedLoads = filteredLoads?.filter(l => l.status === "delivered");
  const cancelledLoads = filteredLoads?.filter(l => l.status === "cancelled");

  return (
    <DashboardLayout title="My Loads" breadcrumbs={[{ label: "My Loads" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search loads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-loads"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="bidding">Bidding</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Link href="/loads/new">
            <Button className="gap-2" data-testid="button-new-load">
              <PlusCircle className="h-4 w-4" />
              Post New Load
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active-loads">
              Active ({activeLoads?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-loads">
              Completed ({completedLoads?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled-loads">
              Cancelled ({cancelledLoads?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => <LoadCardSkeleton key={i} />)}
              </div>
            ) : activeLoads && activeLoads.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeLoads.map((load) => (
                  <LoadCard key={load.id} load={load} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No active loads</h3>
                <p className="mb-4">Post a new load to get started</p>
                <Link href="/loads/new">
                  <Button>Post New Load</Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedLoads && completedLoads.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedLoads.map((load) => (
                  <LoadCard key={load.id} load={load} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No completed loads yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            {cancelledLoads && cancelledLoads.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cancelledLoads.map((load) => (
                  <LoadCard key={load.id} load={load} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No cancelled loads</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
