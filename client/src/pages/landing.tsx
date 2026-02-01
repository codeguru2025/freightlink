import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Package, Shield, MapPin, Clock, Users, ArrowRight, CheckCircle, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await apiRequest("POST", "/api/admin/login", { username, password });
      
      toast({
        title: "Login successful",
        description: "Welcome, Admin!",
      });
      
      setDialogOpen(false);
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                <Truck className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FreightLink ZW</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">How It Works</a>
              <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-benefits">Benefits</a>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-admin-login">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Admin Login</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter admin username"
                        data-testid="input-admin-username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter admin password"
                        data-testid="input-admin-password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-admin-submit">
                      {isLoading ? "Logging in..." : "Login as Admin"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <a href="/api/login">
                <Button data-testid="button-login">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          
          <div className="relative mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <MapPin className="h-4 w-4" />
                  Zimbabwe's Digital Freight Marketplace
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight">
                  Connect. Ship.{" "}
                  <span className="text-primary">Deliver.</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  FreightLink ZW is Zimbabwe's premier digital platform connecting shippers with reliable transporters. 
                  Post loads, receive competitive bids, and track shipments in real-time.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="/api/login">
                    <Button size="lg" className="gap-2" data-testid="button-hero-get-started">
                      Start Shipping Today
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </a>
                  <a href="#how-it-works">
                    <Button size="lg" variant="outline" data-testid="button-learn-more">
                      Learn More
                    </Button>
                  </a>
                </div>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Free to use
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    No hidden fees
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Verified transporters
                  </div>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-secondary/30 to-primary/10 flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-4 p-8 w-full">
                      <Card className="hover-elevate">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Package className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-semibold">Active Loads</p>
                            <p className="text-2xl font-bold text-primary">247</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Truck className="h-8 w-8 text-secondary" />
                          <div>
                            <p className="font-semibold">Transporters</p>
                            <p className="text-2xl font-bold text-secondary-foreground">1,250+</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="hover-elevate col-span-2">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Users className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-semibold">Successful Deliveries</p>
                            <p className="text-2xl font-bold">15,000+</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">Why Choose FreightLink ZW?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our platform is designed for Zimbabwe's unique logistics challenges, 
                optimized for mobile and low-bandwidth environments.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover-elevate border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Verified Transporters</h3>
                  <p className="text-muted-foreground">
                    All transporters are verified and vetted for your peace of mind. 
                    View ratings and reviews before accepting bids.
                  </p>
                </CardContent>
              </Card>
              <Card className="hover-elevate border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-secondary/30 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">Real-Time Tracking</h3>
                  <p className="text-muted-foreground">
                    Track your shipments from pickup to delivery with live status updates 
                    and notifications at every stage.
                  </p>
                </CardContent>
              </Card>
              <Card className="hover-elevate border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Competitive Pricing</h3>
                  <p className="text-muted-foreground">
                    Receive multiple bids from transporters and choose the best 
                    price and service for your needs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Get your goods moving in three simple steps
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold">Post Your Load</h3>
                <p className="text-muted-foreground">
                  Describe your cargo, set pickup and delivery locations, 
                  and specify your timeline and budget.
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold">Receive Bids</h3>
                <p className="text-muted-foreground">
                  Verified transporters will bid on your load. 
                  Compare prices, reviews, and select the best fit.
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold">Track & Receive</h3>
                <p className="text-muted-foreground">
                  Follow your shipment in real-time and confirm 
                  delivery when your goods arrive safely.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-8">Ready to Get Started?</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
              Join hundreds of businesses and transporters across Zimbabwe 
              who are already using FreightLink ZW.
            </p>
            <a href="/api/login">
              <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-get-started">
                Create Your Account
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">FreightLink ZW</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} FreightLink ZW. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
