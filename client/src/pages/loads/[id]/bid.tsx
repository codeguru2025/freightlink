import { useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadStatusBadge } from "@/components/status-badge";
import { CargoIcon, getCargoLabel } from "@/components/cargo-icon";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, ArrowRight, ArrowLeft, DollarSign, Clock, Gavel, Scale, Route, AlertCircle, Wallet } from "lucide-react";
import type { Load, Truck, CargoType, LoadStatus, Wallet as WalletType } from "@shared/schema";
import { calculateCommission } from "@shared/schema";

const bidFormSchema = z.object({
  amount: z.string().min(1, "Bid amount is required"),
  currency: z.string().default("USD"),
  estimatedDays: z.string().optional(),
  truckId: z.string().optional(),
  notes: z.string().optional(),
});

type BidFormValues = z.infer<typeof bidFormSchema>;

export default function PlaceBidPage() {
  const [, params] = useRoute("/loads/:id/bid");
  const loadId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: load, isLoading: loadLoading } = useQuery<Load>({
    queryKey: ["/api/loads", loadId],
    enabled: !!loadId,
  });

  const { data: trucks } = useQuery<Truck[]>({
    queryKey: ["/api/trucks"],
  });

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  // Calculate minimum bid and commission
  const minimumBid = parseFloat(load?.totalPrice || load?.basePrice || load?.budget || "0");
  const tonnes = parseFloat(load?.weight || "0");
  const distanceKm = parseFloat(load?.distanceKm || "0");
  const estimatedCommission = calculateCommission(tonnes, distanceKm);
  // Use availableBalance (balance minus reserved) for accurate check
  const walletBalance = parseFloat((wallet as any)?.availableBalance || wallet?.balance || "0");
  const totalBalance = parseFloat(wallet?.balance || "0");
  const reservedBalance = parseFloat((wallet as any)?.reservedBalance || "0");
  const hasEnoughBalance = walletBalance >= estimatedCommission;

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      amount: minimumBid > 0 ? minimumBid.toFixed(2) : "",
      currency: "USD",
      estimatedDays: "",
      truckId: "",
      notes: "",
    },
  });

  // Prefill form with minimum bid when load data arrives
  useEffect(() => {
    if (load && minimumBid > 0) {
      const currentAmount = form.getValues("amount");
      if (!currentAmount || currentAmount === "") {
        form.setValue("amount", minimumBid.toFixed(2));
      }
    }
  }, [load, minimumBid, form]);

  // Watch the bid amount to show potential earnings
  const bidAmount = useWatch({ control: form.control, name: "amount" });
  const bidValue = parseFloat(bidAmount) || 0;
  const potentialEarnings = bidValue - estimatedCommission;

  const placeBidMutation = useMutation({
    mutationFn: async (data: BidFormValues) => {
      const response = await apiRequest("POST", `/api/loads/${loadId}/bids`, {
        ...data,
        amount: data.amount,
        estimatedDays: data.estimatedDays ? parseInt(data.estimatedDays) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loads", loadId] });
      toast({
        title: "Bid submitted!",
        description: "The shipper has been notified of your bid.",
      });
      navigate("/bids");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit bid",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BidFormValues) => {
    // Client-side validation for minimum bid
    const bidValue = parseFloat(data.amount);
    if (minimumBid > 0 && bidValue < minimumBid) {
      toast({
        title: "Bid too low",
        description: `Your bid must be at least $${minimumBid.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }
    placeBidMutation.mutate(data);
  };

  if (loadLoading) {
    return (
      <DashboardLayout title="Loading..." breadcrumbs={[{ label: "Marketplace", href: "/marketplace" }, { label: "Place Bid" }]}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!load) {
    return (
      <DashboardLayout title="Load Not Found" breadcrumbs={[{ label: "Marketplace", href: "/marketplace" }, { label: "Not Found" }]}>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">This load could not be found.</p>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Place Bid" 
      breadcrumbs={[
        { label: "Marketplace", href: "/marketplace" }, 
        { label: load.title, href: `/loads/${load.id}` },
        { label: "Place Bid" }
      ]}
    >
      <div className="max-w-3xl space-y-6">
        <Link href={`/loads/${load.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Load Details
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CargoIcon type={load.cargoType as CargoType} className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{load.title}</CardTitle>
                  <CardDescription>{getCargoLabel(load.cargoType as CargoType)}</CardDescription>
                </div>
              </div>
              <LoadStatusBadge status={load.status as LoadStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1.5 flex-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{load.originCity}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5 flex-1">
                <MapPin className="h-4 w-4 text-destructive" />
                <span className="font-medium">{load.destinationCity}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span>{load.weight} tonnes</span>
              </div>
              {load.distanceKm && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <span>{Number(load.distanceKm).toLocaleString()} km</span>
                </div>
              )}
              {minimumBid > 0 && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded col-span-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-primary">
                    Minimum: ${minimumBid.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commission & Wallet Info */}
        <Card className={hasEnoughBalance ? "border-muted" : "border-orange-500/30 bg-orange-500/5"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Commission & Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Your Wallet Balance</span>
              <span className="font-medium">${totalBalance.toFixed(2)}</span>
            </div>
            {reservedBalance > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Reserved (other pending bids)</span>
                <span className="font-medium text-muted-foreground">-${reservedBalance.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Available for this bid</span>
              <span className={hasEnoughBalance ? "font-medium text-primary" : "font-medium text-orange-600"}>
                ${walletBalance.toFixed(2)}
              </span>
            </div>
            <div className="border-t my-2" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Commission ({tonnes.toFixed(1)} t × {distanceKm.toFixed(0)} km × $0.05)
              </span>
              <span className="font-medium text-destructive">-${estimatedCommission.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-medium">Your Earnings (if accepted)</span>
              <span className="text-lg font-bold text-primary" data-testid="text-potential-earnings">
                ${potentialEarnings > 0 ? potentialEarnings.toFixed(2) : "0.00"}
              </span>
            </div>
            
            {!hasEnoughBalance && (
              <div className="flex items-start gap-2 p-3 bg-orange-500/10 rounded-lg text-sm">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-700">Insufficient available balance</p>
                  <p className="text-muted-foreground">
                    You need at least ${estimatedCommission.toFixed(2)} available to place this bid. Commission is reserved when you bid and deducted when accepted.
                  </p>
                  <Link href="/wallet">
                    <Button variant="outline" size="sm" className="mt-2" data-testid="button-topup-wallet">
                      Top Up Wallet
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Gavel className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Your Bid</CardTitle>
                    <CardDescription>
                      {minimumBid > 0 
                        ? `Bid at or above the minimum of $${minimumBid.toFixed(2)}`
                        : "Submit a competitive bid for this load"
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bid Amount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min={minimumBid > 0 ? minimumBid : 0}
                            placeholder={minimumBid > 0 ? minimumBid.toFixed(2) : "0.00"} 
                            {...field} 
                            data-testid="input-bid-amount" 
                          />
                        </FormControl>
                        {minimumBid > 0 && (
                          <FormDescription>Minimum: ${minimumBid.toFixed(2)}</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bid-currency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="ZWL">ZWL</SelectItem>
                            <SelectItem value="ZAR">ZAR</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Delivery (Days)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 3" {...field} data-testid="input-estimated-days" />
                        </FormControl>
                        <FormDescription>How many days to complete delivery</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {trucks && trucks.length > 0 && (
                    <FormField
                      control={form.control}
                      name="truckId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Truck (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-truck">
                                <SelectValue placeholder="Choose a truck" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {trucks.map((truck) => (
                                <SelectItem key={truck.id} value={truck.id}>
                                  {truck.registrationNumber} - {truck.truckType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional information for the shipper..."
                          className="resize-none"
                          {...field} 
                          data-testid="input-bid-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Link href={`/loads/${load.id}`}>
                <Button type="button" variant="outline" data-testid="button-cancel-bid">
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={placeBidMutation.isPending || (!hasEnoughBalance && estimatedCommission > 0)}
                data-testid="button-submit-bid"
              >
                {placeBidMutation.isPending ? "Submitting..." : `Submit Bid - $${bidValue.toFixed(2)}`}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
