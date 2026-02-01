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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronUp,
  TruckIcon,
  FileText,
  MessageSquare,
  Star,
  AlertTriangle,
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
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Documents", url: "/documents", icon: FileText },
    { title: "My Reviews", url: "/reviews", icon: Star },
  ];

  const transporterMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Available Loads", url: "/marketplace", icon: List },
    { title: "My Bids", url: "/bids", icon: Gavel },
    { title: "My Jobs", url: "/jobs", icon: Briefcase },
    { title: "My Trucks", url: "/trucks", icon: TruckIcon },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Documents", url: "/documents", icon: FileText },
    { title: "My Reviews", url: "/reviews", icon: Star },
  ];

  const adminMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "All Loads", url: "/admin/loads", icon: Package },
    { title: "All Users", url: "/admin/users", icon: Users },
    { title: "Documents", url: "/admin/documents", icon: FileText },
    { title: "Disputes", url: "/admin/disputes", icon: AlertTriangle },
    { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
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
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2" data-testid="nav-settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
