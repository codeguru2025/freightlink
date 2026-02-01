import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

import LandingPage from "@/pages/landing";
import RoleSelectionPage from "@/pages/role-selection";
import DashboardPage from "@/pages/dashboard";
import LoadsPage from "@/pages/loads/index";
import NewLoadPage from "@/pages/loads/new";
import LoadDetailPage from "@/pages/loads/[id]";
import PlaceBidPage from "@/pages/loads/[id]/bid";
import MarketplacePage from "@/pages/marketplace";
import BidsPage from "@/pages/bids";
import JobsPage from "@/pages/jobs";
import TrucksPage from "@/pages/trucks";
import AdminLoadsPage from "@/pages/admin/loads";
import AdminUsersPage from "@/pages/admin/users";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import DocumentsPage from "@/pages/documents";
import MessagesPage from "@/pages/messages";
import ReviewsPage from "@/pages/reviews";
import AdminDocumentsPage from "@/pages/admin-documents";
import AdminDisputesPage from "@/pages/admin-disputes";
import NotFound from "@/pages/not-found";

import type { UserProfile } from "@shared/schema";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  if (profile?.role !== "admin") {
    return <DashboardPage />;
  }

  return <Component />;
}

function AuthenticatedRoutes() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (!profile) {
    return <RoleSelectionPage />;
  }

  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/loads" component={LoadsPage} />
      <Route path="/loads/new" component={NewLoadPage} />
      <Route path="/loads/:id/bid" component={PlaceBidPage} />
      <Route path="/loads/:id" component={LoadDetailPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/bids" component={BidsPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/trucks" component={TrucksPage} />
      <Route path="/documents" component={DocumentsPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/reviews" component={ReviewsPage} />
      <Route path="/admin/loads">{() => <AdminRoute component={AdminLoadsPage} />}</Route>
      <Route path="/admin/users">{() => <AdminRoute component={AdminUsersPage} />}</Route>
      <Route path="/admin/documents">{() => <AdminRoute component={AdminDocumentsPage} />}</Route>
      <Route path="/admin/disputes">{() => <AdminRoute component={AdminDisputesPage} />}</Route>
      <Route path="/admin/analytics">{() => <AdminRoute component={AdminAnalyticsPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="freightlink-theme">
        <TooltipProvider>
          <AuthenticatedRoutes />
          <Toaster />
          <PWAInstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
