import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CARGO_TYPES, BASE_RATE_PER_TONNE_KM, calculateBasePrice } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Package, MapPin, DollarSign, ArrowLeft, Calculator, TrendingUp } from "lucide-react";
import { Link } from "wouter";

const zimbabweCities = [
  "Harare",
  "Bulawayo",
  "Chitungwiza",
  "Mutare",
  "Gweru",
  "Epworth",
  "Kwekwe",
  "Kadoma",
  "Masvingo",
  "Chinhoyi",
  "Victoria Falls",
  "Marondera",
  "Ruwa",
  "Chegutu",
  "Zvishavane",
  "Bindura",
  "Beitbridge",
  "Redcliff",
  "Hwange",
  "Kariba",
];

// Approximate distances between major Zimbabwe cities (in km)
const cityDistances: Record<string, Record<string, number>> = {
  "Harare": { "Bulawayo": 440, "Mutare": 263, "Gweru": 275, "Masvingo": 292, "Victoria Falls": 880, "Chinhoyi": 116, "Beitbridge": 580, "Hwange": 700, "Kariba": 365 },
  "Bulawayo": { "Harare": 440, "Mutare": 580, "Gweru": 163, "Masvingo": 290, "Victoria Falls": 440, "Beitbridge": 323, "Hwange": 296 },
  "Mutare": { "Harare": 263, "Bulawayo": 580, "Masvingo": 290 },
  "Gweru": { "Harare": 275, "Bulawayo": 163, "Masvingo": 165 },
  "Masvingo": { "Harare": 292, "Bulawayo": 290, "Mutare": 290, "Gweru": 165, "Beitbridge": 290 },
  "Victoria Falls": { "Harare": 880, "Bulawayo": 440, "Hwange": 107 },
  "Chinhoyi": { "Harare": 116, "Kariba": 220 },
  "Beitbridge": { "Harare": 580, "Bulawayo": 323, "Masvingo": 290 },
  "Hwange": { "Harare": 700, "Bulawayo": 296, "Victoria Falls": 107 },
  "Kariba": { "Harare": 365, "Chinhoyi": 220 },
};

function getEstimatedDistance(origin: string, destination: string): number | null {
  if (!origin || !destination || origin === destination) return null;
  
  // Try direct lookup
  if (cityDistances[origin]?.[destination]) {
    return cityDistances[origin][destination];
  }
  // Try reverse lookup
  if (cityDistances[destination]?.[origin]) {
    return cityDistances[destination][origin];
  }
  // Default estimate for unknown routes (average ~200km)
  return null;
}

const loadFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  cargoType: z.enum(CARGO_TYPES),
  weight: z.string().min(1, "Weight in tonnes is required"),
  originCity: z.string().min(1, "Origin city is required"),
  originAddress: z.string().optional(),
  destinationCity: z.string().min(1, "Destination city is required"),
  destinationAddress: z.string().optional(),
  distanceKm: z.string().min(1, "Distance is required"),
  pickupDate: z.date().optional(),
  deliveryDate: z.date().optional(),
  shipperTip: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  specialInstructions: z.string().optional(),
});

type LoadFormValues = z.infer<typeof loadFormSchema>;

export default function NewLoadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LoadFormValues>({
    resolver: zodResolver(loadFormSchema),
    defaultValues: {
      title: "",
      description: "",
      cargoType: "general",
      weight: "",
      originCity: "",
      originAddress: "",
      destinationCity: "",
      destinationAddress: "",
      distanceKm: "",
      shipperTip: 0,
      currency: "USD",
      specialInstructions: "",
    },
  });

  // Watch form values for real-time price calculation
  const weight = useWatch({ control: form.control, name: "weight" });
  const distanceKm = useWatch({ control: form.control, name: "distanceKm" });
  const shipperTip = useWatch({ control: form.control, name: "shipperTip" });
  const originCity = useWatch({ control: form.control, name: "originCity" });
  const destinationCity = useWatch({ control: form.control, name: "destinationCity" });

  // Calculate prices
  const tonnes = parseFloat(weight) || 0;
  const distance = parseFloat(distanceKm) || 0;
  const basePrice = calculateBasePrice(tonnes, distance);
  const totalPrice = basePrice + (shipperTip || 0);

  // Auto-estimate distance when cities change
  const estimatedDistance = getEstimatedDistance(originCity, destinationCity);

  const createLoadMutation = useMutation({
    mutationFn: async (data: LoadFormValues) => {
      const tonnes = parseFloat(data.weight);
      const distance = parseFloat(data.distanceKm);
      const basePrice = calculateBasePrice(tonnes, distance);
      const totalPrice = basePrice + (data.shipperTip || 0);

      const response = await apiRequest("POST", "/api/loads", {
        ...data,
        weight: data.weight,
        weightUnit: "tonnes",
        distanceKm: data.distanceKm,
        basePrice: basePrice.toFixed(2),
        shipperTip: (data.shipperTip || 0).toFixed(2),
        totalPrice: totalPrice.toFixed(2),
        budget: totalPrice.toFixed(2), // For backward compatibility
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({
        title: "Consignment posted successfully!",
        description: "Transporters can now bid on your consignment.",
      });
      navigate(`/loads/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create consignment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoadFormValues) => {
    createLoadMutation.mutate(data);
  };

  // Handle auto-fill distance when estimate is available
  const handleAutoFillDistance = () => {
    if (estimatedDistance) {
      form.setValue("distanceKm", estimatedDistance.toString());
    }
  };

  return (
    <DashboardLayout title="Post Consignment" breadcrumbs={[{ label: "My Loads", href: "/loads" }, { label: "New Consignment" }]}>
      <div className="max-w-3xl">
        <Link href="/loads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to My Loads
        </Link>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Cargo Details</CardTitle>
                    <CardDescription>Describe what you need to transport</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Furniture delivery to Bulawayo" {...field} data-testid="input-load-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide additional details about your cargo..."
                          className="resize-none"
                          {...field} 
                          data-testid="input-load-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cargoType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-cargo-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CARGO_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (Tonnes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="e.g., 5" 
                            {...field} 
                            data-testid="input-weight" 
                          />
                        </FormControl>
                        <FormDescription>Enter cargo weight in tonnes</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Route Details</CardTitle>
                    <CardDescription>Where should the cargo be picked up and delivered?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="originCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-origin-city">
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {zimbabweCities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destinationCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drop-off Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-destination-city">
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {zimbabweCities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
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
                    name="originAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} data-testid="input-origin-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destinationAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} data-testid="input-destination-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="distanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (km)</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter distance in km" 
                            {...field} 
                            data-testid="input-distance" 
                          />
                        </FormControl>
                        {estimatedDistance && !field.value && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleAutoFillDistance}
                            data-testid="button-use-estimate"
                          >
                            Use ~{estimatedDistance} km
                          </Button>
                        )}
                      </div>
                      <FormDescription>
                        Distance between pickup and drop-off locations
                        {estimatedDistance && field.value && (
                          <span className="text-muted-foreground"> (Suggested: ~{estimatedDistance} km)</span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pickupDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Pickup Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-pickup-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Delivery Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-delivery-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary/30 flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle>Transport Price</CardTitle>
                    <CardDescription>Price is calculated automatically based on weight and distance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Calculation Display */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span>${BASE_RATE_PER_TONNE_KM.toFixed(2)} per tonne-km</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Calculation</span>
                    <span>{tonnes.toFixed(1)} tonnes × {distance.toFixed(0)} km</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-medium">Base Price</span>
                    <span className="text-lg font-semibold" data-testid="text-base-price">
                      ${basePrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Increase Offer (Tip) */}
                <FormField
                  control={form.control}
                  name="shipperTip"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <FormLabel className="mb-0">Increase Offer (Optional)</FormLabel>
                      </div>
                      <FormDescription className="mb-4">
                        Add extra to attract more transporters and get faster responses
                      </FormDescription>
                      <div className="space-y-4">
                        <Slider
                          min={0}
                          max={Math.max(100, basePrice * 0.5)}
                          step={5}
                          value={[field.value || 0]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                          data-testid="slider-tip"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>+$0</span>
                          <span className="font-medium text-foreground">+${(field.value || 0).toFixed(2)}</span>
                          <span>+${Math.max(100, basePrice * 0.5).toFixed(0)}</span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Total Price */}
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-muted-foreground">Total Offer Price</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Transporters can bid at or above this price
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-primary" data-testid="text-total-price">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
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

                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special handling requirements, access instructions, etc..."
                          className="resize-none"
                          {...field} 
                          data-testid="input-special-instructions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Link href="/loads">
                <Button type="button" variant="outline" data-testid="button-cancel">
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={createLoadMutation.isPending || basePrice === 0}
                data-testid="button-submit-load"
              >
                {createLoadMutation.isPending ? "Posting..." : `Post Consignment - $${totalPrice.toFixed(2)}`}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
