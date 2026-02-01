import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Package, Building2, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@shared/schema";

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProfileMutation = useMutation({
    mutationFn: async (data: { role: UserRole; companyName: string; phoneNumber: string; city: string }) => {
      const response = await apiRequest("POST", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Welcome to FreightLink ZW!",
        description: "Your account has been set up successfully.",
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedRole) {
      toast({
        title: "Please select a role",
        description: "Choose whether you want to ship goods or transport them.",
        variant: "destructive",
      });
      return;
    }
    createProfileMutation.mutate({
      role: selectedRole,
      companyName,
      phoneNumber,
      city,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Truck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold">Welcome to FreightLink ZW</h1>
          <p className="text-muted-foreground">
            Let's set up your account. First, tell us how you'll use the platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all hover-elevate ${
              selectedRole === "shipper" 
                ? "ring-2 ring-primary bg-primary/5" 
                : ""
            }`}
            onClick={() => setSelectedRole("shipper")}
            data-testid="card-role-shipper"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                {selectedRole === "shipper" && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2">I'm a Shipper</CardTitle>
              <CardDescription>
                I have goods to transport and want to find reliable transporters.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover-elevate ${
              selectedRole === "transporter" 
                ? "ring-2 ring-primary bg-primary/5" 
                : ""
            }`}
            onClick={() => setSelectedRole("transporter")}
            data-testid="card-role-transporter"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-lg bg-secondary/30 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-secondary-foreground" />
                </div>
                {selectedRole === "transporter" && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2">I'm a Transporter</CardTitle>
              <CardDescription>
                I own trucks and want to find loads to transport across Zimbabwe.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {selectedRole && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Complete Your Profile
              </CardTitle>
              <CardDescription>
                Help us personalize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name (Optional)</Label>
                <Input
                  id="companyName"
                  placeholder="Your company or business name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  data-testid="input-company-name"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+263 7X XXX XXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    data-testid="input-phone-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Harare, Bulawayo, etc."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-testid="input-city"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={!selectedRole || createProfileMutation.isPending}
            onClick={handleSubmit}
            data-testid="button-continue"
          >
            {createProfileMutation.isPending ? "Setting up..." : "Continue"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
