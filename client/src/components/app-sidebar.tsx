import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Package,
  Home,
  PlusCircle,
  List,
  Gavel,
  Briefcase,
  Users,
  BarChart3,
  Settings,
  LogOut,
  TruckIcon,
  FileText,
  MessageSquare,
  Star,
  AlertTriangle,
  Receipt,
  Wallet,
} from "lucide-react";
import type { UserProfile } from "@shared/schema";
import logoPath from "@assets/ChatGPT_Image_Feb_1,_2026,_09_08_34_AM_1769930479384.png";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const shipperMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Post Load", url: "/loads/new", icon: PlusCircle },
    { title: "My Loads", url: "/loads", icon: Package },
    { title: "Active Jobs", url: "/jobs", icon: Briefcase },
    { title: "POD & Payments", url: "/pod", icon: Receipt },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Documents", url: "/documents", icon: FileText },
    { title: "My Reviews", url: "/reviews", icon: Star },
    { title: "Reports", url: "/reports", icon: BarChart3 },
  ];

  const transporterMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Wallet", url: "/wallet", icon: Wallet },
    { title: "Available Loads", url: "/marketplace", icon: List },
    { title: "My Bids", url: "/bids", icon: Gavel },
    { title: "My Jobs", url: "/jobs", icon: Briefcase },
    { title: "POD & Payments", url: "/pod", icon: Receipt },
    { title: "My Trucks", url: "/trucks", icon: TruckIcon },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Documents", url: "/documents", icon: FileText },
    { title: "My Reviews", url: "/reviews", icon: Star },
    { title: "Reports", url: "/reports", icon: BarChart3 },
  ];

  const adminMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "All Loads", url: "/admin/loads", icon: Package },
    { title: "All Users", url: "/admin/users", icon: Users },
    { title: "All Jobs", url: "/jobs", icon: Briefcase },
    { title: "Marketplace", url: "/marketplace", icon: List },
    { title: "Documents", url: "/admin/documents", icon: FileText },
    { title: "Disputes", url: "/admin/disputes", icon: AlertTriangle },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    { title: "Reports", url: "/admin/reports", icon: FileText },
  ];

  const menuItems = profile?.role === "admin" 
    ? adminMenuItems 
    : profile?.role === "transporter" 
      ? transporterMenuItems 
      : shipperMenuItems;

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <img 
            src={logoPath} 
            alt="FreightLink ZW" 
            className="h-14 w-auto"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg text-sidebar-foreground">FreightLink</span>
            <span className="text-xs text-sidebar-foreground/70 font-medium">ZIMBABWE</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {profile?.role === "shipper" && "Shipper Menu"}
            {profile?.role === "transporter" && "Transporter Menu"}
            {profile?.role === "admin" && "Admin Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings" data-testid="nav-settings">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="p-2 pt-0">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.email || "User"}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/70 capitalize">
                {profile?.role || "Setting up..."}
              </span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
