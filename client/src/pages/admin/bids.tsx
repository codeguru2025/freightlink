import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Gavel, MapPin, Package, User, Truck, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AdminBidsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bids = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/bids"],
    refetchInterval: 30000,
  });

  const acceptMutation = useMutation({
    mutationFn: async (bidId: string) => {
      const res = await apiRequest("POST", `/api/bids/${bidId}/accept`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to accept bid");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
      const fee = data.feeAmount ? `$${Number(data.feeAmount).toFixed(2)}` : "";
      toast({
        title: "Bid accepted",
        description: `Job created. ${fee} fee payment request sent to transporter via EcoCash.${data.paynowError ? ` (PayNow: ${data.paynowError})` : ""}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (bidId: string) => {
      const res = await apiRequest("POST", `/api/bids/${bidId}/reject`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to reject bid");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bids"] });
      toast({ title: "Bid rejected", description: "The transporter has been notified." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const pendingBids = bids.filter((b) => b.status === "pending");
  const processedBids = bids.filter((b) => b.status !== "pending");

  return (
    <DashboardLayout title="Bid Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Review transport requests and accept the most suitable transporter. Auto-refreshes every 30s.
          </p>
          <Badge variant="secondary" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {pendingBids.length} pending
          </Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading bids...</div>
        ) : pendingBids.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground py-16">
              <Gavel className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No pending bids to review</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingBids.map((bid) => (
              <Card key={bid.id} className="border-l-4 border-l-amber-400">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {bid.load?.title || `${bid.load?.originCity} → ${bid.load?.destinationCity}`}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {bid.load?.originCity} → {bid.load?.destinationCity}
                        {bid.load?.distanceKm && <span>· {Number(bid.load.distanceKm).toFixed(0)} km</span>}
                        {bid.load?.weight && <span>· {bid.load.weight} {bid.load.weightUnit || "t"}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary">${Number(bid.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        Fee: ${(Number(bid.amount) * 0.15).toFixed(2)} (15%)
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {bid.transporter?.firstName} {bid.transporter?.lastName}
                    </span>
                    {bid.transporter?.phoneNumber && (
                      <span className="text-muted-foreground">· {bid.transporter.phoneNumber}</span>
                    )}
                    {bid.transporter?.isVerified ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Unverified</Badge>
                    )}
                  </div>
                  {bid.truckId && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      Truck ID: {bid.truckId}
                    </div>
                  )}
                  {bid.notes && (
                    <p className="text-sm text-muted-foreground bg-muted rounded p-2">{bid.notes}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => acceptMutation.mutate(bid.id)}
                      disabled={acceptMutation.isPending || rejectMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept & Request Fee
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(bid.id)}
                      disabled={acceptMutation.isPending || rejectMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {processedBids.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recently Processed</h2>
            <div className="space-y-2">
              {processedBids.slice(0, 10).map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-3 rounded border bg-muted/30 text-sm">
                  <span>{bid.load?.originCity} → {bid.load?.destinationCity}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">${Number(bid.amount).toFixed(2)}</span>
                    <Badge variant={bid.status === "accepted" ? "default" : "secondary"}>
                      {bid.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
