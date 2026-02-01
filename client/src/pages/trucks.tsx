import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Truck, PlusCircle, Scale, CheckCircle, XCircle } from "lucide-react";
import type { Truck as TruckType } from "@shared/schema";

const truckFormSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number is required"),
  truckType: z.string().min(1, "Truck type is required"),
  capacity: z.string().min(1, "Capacity is required"),
  capacityUnit: z.string().default("tons"),
});

type TruckFormValues = z.infer<typeof truckFormSchema>;

const truckTypes = [
  "Flatbed",
  "Box Truck",
  "Refrigerated",
  "Tanker",
  "Tipper",
  "Low Loader",
  "Container Truck",
  "Pickup",
];

export default function TrucksPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trucks, isLoading } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks"],
  });

  const form = useForm<TruckFormValues>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: {
      registrationNumber: "",
      truckType: "",
      capacity: "",
      capacityUnit: "tons",
    },
  });

  const createTruckMutation = useMutation({
    mutationFn: async (data: TruckFormValues) => {
      const response = await apiRequest("POST", "/api/trucks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      toast({
        title: "Truck added!",
        description: "Your truck has been registered successfully.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add truck",
        variant: "destructive",
      });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ truckId, isAvailable }: { truckId: string; isAvailable: boolean }) => {
      const response = await apiRequest("PATCH", `/api/trucks/${truckId}`, { isAvailable });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update truck",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TruckFormValues) => {
    createTruckMutation.mutate(data);
  };

  return (
    <DashboardLayout title="My Trucks" breadcrumbs={[{ label: "My Trucks" }]}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-truck">
                <PlusCircle className="h-4 w-4" />
                Add Truck
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Truck</DialogTitle>
                <DialogDescription>
                  Register a new truck to use for transporting loads
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., AAA 1234" {...field} data-testid="input-registration" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="truckType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Truck Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-truck-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {truckTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} data-testid="input-capacity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacityUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-capacity-unit">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tons">Tons</SelectItem>
                              <SelectItem value="kg">Kilograms</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTruckMutation.isPending} data-testid="button-save-truck">
                      {createTruckMutation.isPending ? "Adding..." : "Add Truck"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-24 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : trucks && trucks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trucks.map((truck) => (
              <Card key={truck.id} className="hover-elevate" data-testid={`card-truck-${truck.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{truck.registrationNumber}</CardTitle>
                        <CardDescription>{truck.truckType}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={truck.isAvailable ? "default" : "secondary"}>
                      {truck.isAvailable ? "Available" : "Busy"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span>Capacity: {truck.capacity} {truck.capacityUnit}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => toggleAvailabilityMutation.mutate({ 
                      truckId: truck.id, 
                      isAvailable: !truck.isAvailable 
                    })}
                    data-testid={`button-toggle-availability-${truck.id}`}
                  >
                    {truck.isAvailable ? (
                      <>
                        <XCircle className="h-4 w-4" />
                        Mark as Busy
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Mark as Available
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Truck className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No trucks registered</h3>
            <p className="mb-4">Add your trucks to start bidding on loads</p>
            <Button onClick={() => setDialogOpen(true)}>Add Your First Truck</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
