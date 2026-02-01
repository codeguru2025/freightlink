import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, ArrowRight, ArrowLeft, DollarSign, Clock, Gavel } from "lucide-react";
import type { Load, Truck, CargoType, LoadStatus } from "@shared/schema";

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

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      amount: "",
      currency: "USD",
      estimatedDays: "",
      truckId: "",
      notes: "",
    },
  });

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
          <CardContent>
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
            {load.budget && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Budget: <strong>{load.currency} {Number(load.budget).toLocaleString()}</strong></span>
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
                    <CardDescription>Submit a competitive bid for this load</CardDescription>
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
                          <Input type="number" placeholder="0.00" {...field} data-testid="input-bid-amount" />
                        </FormControl>
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
                disabled={placeBidMutation.isPending}
                data-testid="button-submit-bid"
              >
                {placeBidMutation.isPending ? "Submitting..." : "Submit Bid"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
