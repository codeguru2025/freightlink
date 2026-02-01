import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardLayout({ children, title, breadcrumbs = [] }: DashboardLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Separator orientation="vertical" className="h-6" />
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={index}>
                    <BreadcrumbSeparator />
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-serif font-bold" data-testid="text-page-title">{title}</h1>
            </div>
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
