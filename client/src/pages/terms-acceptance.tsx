import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, LogOut } from "lucide-react";

export default function TermsAcceptancePage() {
  const { logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/accept-terms");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Terms Accepted",
        description: "Welcome to FreightLink ZW!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">Terms & Conditions</CardTitle>
          <CardDescription>
            Please review and accept our terms to continue using FreightLink ZW
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4 text-sm text-muted-foreground leading-relaxed">
            <h3 className="font-bold text-foreground mb-2">1. Introduction</h3>
            <p className="mb-4">
              Welcome to FreightLink ZW. By using our platform, you agree to comply with and be bound by the following terms and conditions. 
              Please read these terms carefully before using our services.
            </p>
            
            <h3 className="font-bold text-foreground mb-2">2. Services</h3>
            <p className="mb-4">
              FreightLink ZW provides a digital marketplace connecting shippers and transporters in Zimbabwe. 
              We are a platform provider and do not own, operate, or control the vehicles used for transportation.
            </p>

            <h3 className="font-bold text-foreground mb-2">3. User Obligations</h3>
            <p className="mb-4">
              Users must provide accurate and complete information when registering and using the platform. 
              Transporters are responsible for maintaining valid licenses, insurance, and vehicle registrations as required by Zimbabwean law.
            </p>

            <h3 className="font-bold text-foreground mb-2">4. Payments and Commissions</h3>
            <p className="mb-4">
              Payments are handled through our integrated payment systems. FreightLink ZW may charge a commission on successful transactions 
              as specified in the service agreement.
            </p>

            <h3 className="font-bold text-foreground mb-2">5. Liability</h3>
            <p className="mb-4">
              FreightLink ZW is not liable for any damages, losses, or disputes arising between shippers and transporters. 
              Users agree to resolve disputes through our provided dispute resolution mechanism.
            </p>

            <h3 className="font-bold text-foreground mb-2">6. Privacy</h3>
            <p className="mb-4">
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information.
            </p>

            <h3 className="font-bold text-foreground mb-2">7. Termination</h3>
            <p className="mb-4">
              We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activities.
            </p>
          </ScrollArea>

          <div className="flex items-center space-x-2 mt-6">
            <Checkbox 
              id="terms" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked === true)} 
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the terms and conditions and privacy policy
            </label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 gap-2" 
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Decline & Logout
          </Button>
          <Button 
            className="flex-1" 
            disabled={!accepted || acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
          >
            {acceptMutation.isPending ? "Processing..." : "Accept & Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
