import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadStatusBadge } from "@/components/status-badge";
import { BidCard, BidCardSkeleton } from "@/components/bid-card";
import { CargoIcon, getCargoLabel } from "@/components/cargo-icon";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MapPin, 
  ArrowRight, 
  Calendar, 
  Scale, 
  DollarSign, 
  Clock,
  User,
  FileText,
  ArrowLeft,
  Gavel
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import type { Load, Bid, CargoType, LoadStatus, UserProfile } from "@shared/schema";

interface LoadWithBids extends Load {
  bids?: (Bid & { transporter?: { companyName?: string | null; firstName?: string | null; lastName?: string | null } })[];
  shipper?: { companyName?: string | null; firstName?: string | null; lastName?: string | null };
}

export default function LoadDetailPage() {
  const [, params] = useRoute("/loads/:id");
  const loadId = params?.id;
  const { toast } = useToast();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: load, isLoading } = useQuery<LoadWithBids>({
    queryKey: ["/api/loads", loadId],
    enabled: !!loadId,
  });

  const acceptBidMutation = useMutation({
    mutationFn: async (bidId: string) => {
      const response = await apiRequest("POST", `/api/bids/${bidId}/accept`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads", loadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Bid accepted!",
        description: "A job has been created and the transporter has been notified.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept bid",
        variant: "destructive",
      });
    },
  });

  const rejectBidMutation = useMutation({
    mutationFn: async (bidId: string) => {
      const response = await apiRequest("POST", `/api/bids/${bidId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads", loadId] });
      toast({
        title: "Bid rejected",
        description: "The transporter has been notified.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject bid",
        variant: "destructive",
      });
    },
  });

  const isOwner = load?.shipperId === profile?.userId;

  if (isLoading) {
    return (
      <DashboardLayout title="Loading..." breadcrumbs={[{ label: "My Loads", href: "/loads" }, { label: "Loading..." }]}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!load) {
    return (
      <DashboardLayout title="Load Not Found" breadcrumbs={[{ label: "My Loads", href: "/loads" }, { label: "Not Found" }]}>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">This load could not be found.</p>
          <Link href="/loads">
            <Button>Back to Loads</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={load.title} 
      breadcrumbs={[
        { label: isOwner ? "My Loads" : "Available Loads", href: isOwner ? "/loads" : "/marketplace" }, 
        { label: load.title }
      ]}
    >
      <div className="space-y-6">
        <Link 
          href={isOwner ? "/loads" : "/marketplace"} 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {isOwner ? "My Loads" : "Available Loads"}
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CargoIcon type={load.cargoType as CargoType} className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl" data-testid="text-load-title">{load.title}</CardTitle>
                      <CardDescription>{getCargoLabel(load.cargoType as CargoType)}</CardDescription>
                    </div>
                  </div>
                  <LoadStatusBadge status={load.status as LoadStatus} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">{load.originCity}</span>
                    </div>
                    {load.originAddress && (
                      <p className="text-sm text-muted-foreground">{load.originAddress}</p>
                    )}
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <MapPin className="h-5 w-5 text-destructive" />
                      <span className="font-semibold text-lg">{load.destinationCity}</span>
                    </div>
                    {load.destinationAddress && (
                      <p className="text-sm text-muted-foreground">{load.destinationAddress}</p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Scale className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Weight</p>
                      <p className="font-medium">{load.weight} {load.weightUnit}</p>
                    </div>
                  </div>
                  {load.budget && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="font-medium">{load.currency} {Number(load.budget).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {load.pickupDate && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pickup</p>
                        <p className="font-medium">{format(new Date(load.pickupDate), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  )}
                  {load.deliveryDate && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Delivery</p>
                        <p className="font-medium">{format(new Date(load.deliveryDate), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  )}
                </div>

                {load.description && (
                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                    </h3>
                    <p className="text-muted-foreground">{load.description}</p>
                  </div>
                )}

                {load.specialInstructions && (
                  <div>
                    <h3 className="font-medium mb-2">Special Instructions</h3>
                    <p className="text-muted-foreground">{load.specialInstructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {isOwner && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Gavel className="h-5 w-5" />
                      <CardTitle>Bids Received</CardTitle>
                    </div>
                    <Badge variant="outline">{load.bids?.length || 0} bids</Badge>
                  </div>
                  <CardDescription>Review and accept bids from transporters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {load.bids && load.bids.length > 0 ? (
                    load.bids.map((bid) => (
                      <BidCard
                        key={bid.id}
                        bid={bid}
                        showActions={load.status === "posted"}
                        onAccept={() => acceptBidMutation.mutate(bid.id)}
                        onReject={() => rejectBidMutation.mutate(bid.id)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gavel className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No bids received yet</p>
                      <p className="text-sm">Transporters will start bidding soon</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Posted By
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">
                    {load.shipper?.companyName || 
                      (load.shipper?.firstName && load.shipper?.lastName 
                        ? `${load.shipper.firstName} ${load.shipper.lastName}` 
                        : "Unknown Shipper")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Posted {format(new Date(load.createdAt!), "MMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {!isOwner && load.status === "posted" && profile?.role === "transporter" && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Interested?</CardTitle>
                  <CardDescription>Submit your bid for this load</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/loads/${load.id}/bid`}>
                    <Button className="w-full" data-testid="button-place-bid">
                      Place Bid
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
