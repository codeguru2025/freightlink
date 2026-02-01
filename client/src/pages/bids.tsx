import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BidStatusBadge } from "@/components/status-badge";
import { Gavel, MapPin, ArrowRight, DollarSign, Clock, Package } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Bid, Load, BidStatus } from "@shared/schema";

interface BidWithLoad extends Bid {
  load?: Load;
}

export default function BidsPage() {
  const { data: bids, isLoading } = useQuery<BidWithLoad[]>({
    queryKey: ["/api/bids"],
  });

  const pendingBids = bids?.filter(b => b.status === "pending");
  const acceptedBids = bids?.filter(b => b.status === "accepted");
  const rejectedBids = bids?.filter(b => b.status === "rejected");

  return (
    <DashboardLayout title="My Bids" breadcrumbs={[{ label: "My Bids" }]}>
      <div className="space-y-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending-bids">
              Pending ({pendingBids?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="accepted" data-testid="tab-accepted-bids">
              Accepted ({acceptedBids?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected-bids">
              Rejected ({rejectedBids?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => <BidCardSkeleton key={i} />)}
              </div>
            ) : pendingBids && pendingBids.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingBids.map((bid) => (
                  <BidWithLoadCard key={bid.id} bid={bid} />
                ))}
              </div>
            ) : (
              <EmptyState message="No pending bids" />
            )}
          </TabsContent>

          <TabsContent value="accepted" className="mt-6">
            {acceptedBids && acceptedBids.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {acceptedBids.map((bid) => (
                  <BidWithLoadCard key={bid.id} bid={bid} />
                ))}
              </div>
            ) : (
              <EmptyState message="No accepted bids yet" />
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejectedBids && rejectedBids.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {rejectedBids.map((bid) => (
                  <BidWithLoadCard key={bid.id} bid={bid} />
                ))}
              </div>
            ) : (
              <EmptyState message="No rejected bids" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function BidWithLoadCard({ bid }: { bid: BidWithLoad }) {
  const load = bid.load;

  return (
    <Card className="hover-elevate" data-testid={`card-my-bid-${bid.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Gavel className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{load?.title || "Load"}</CardTitle>
              <CardDescription>
                Bid submitted {format(new Date(bid.createdAt!), "MMM d, yyyy")}
              </CardDescription>
            </div>
          </div>
          <BidStatusBadge status={bid.status as BidStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {load && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 flex-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{load.originCity}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5 flex-1">
              <MapPin className="h-4 w-4 text-destructive" />
              <span>{load.destinationCity}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-xl font-bold">
              {bid.currency} {Number(bid.amount).toLocaleString()}
            </span>
          </div>
          {bid.estimatedDays && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{bid.estimatedDays} days</span>
            </div>
          )}
        </div>

        {load && (
          <Link href={`/loads/${load.id}`}>
            <Button variant="outline" className="w-full" data-testid={`button-view-bid-load-${bid.id}`}>
              View Load Details
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function BidCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Gavel className="h-16 w-16 mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">{message}</h3>
      <Link href="/marketplace">
        <Button variant="outline" className="mt-4">Browse Available Loads</Button>
      </Link>
    </div>
  );
}
