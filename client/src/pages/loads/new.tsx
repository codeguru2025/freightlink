import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CARGO_TYPES } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Package, MapPin, DollarSign, Truck, ArrowLeft } from "lucide-react";
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

const loadFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  cargoType: z.enum(CARGO_TYPES),
  weight: z.string().min(1, "Weight is required"),
  weightUnit: z.string().default("kg"),
  originCity: z.string().min(1, "Origin city is required"),
  originAddress: z.string().optional(),
  destinationCity: z.string().min(1, "Destination city is required"),
  destinationAddress: z.string().optional(),
  pickupDate: z.date().optional(),
  deliveryDate: z.date().optional(),
  budget: z.string().optional(),
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
      weightUnit: "kg",
      originCity: "",
      originAddress: "",
      destinationCity: "",
      destinationAddress: "",
      budget: "",
      currency: "USD",
      specialInstructions: "",
    },
  });

  const createLoadMutation = useMutation({
    mutationFn: async (data: LoadFormValues) => {
      const response = await apiRequest("POST", "/api/loads", {
        ...data,
        weight: data.weight,
        budget: data.budget || null,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/loads"] });
      toast({
        title: "Load posted successfully!",
        description: "Transporters can now bid on your load.",
      });
      navigate(`/loads/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create load",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoadFormValues) => {
    createLoadMutation.mutate(data);
  };

  return (
    <DashboardLayout title="Post New Load" breadcrumbs={[{ label: "My Loads", href: "/loads" }, { label: "New Load" }]}>
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

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} data-testid="input-weight" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weightUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-weight-unit">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="tons">tons</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                        <FormLabel>Origin City</FormLabel>
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
                        <FormLabel>Destination City</FormLabel>
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
                    <DollarSign className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle>Budget & Instructions</CardTitle>
                    <CardDescription>Set your budget and any special requirements</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" {...field} data-testid="input-budget" />
                        </FormControl>
                        <FormDescription>Your maximum budget for this shipment</FormDescription>
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
                </div>

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
                disabled={createLoadMutation.isPending}
                data-testid="button-submit-load"
              >
                {createLoadMutation.isPending ? "Posting..." : "Post Load"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
