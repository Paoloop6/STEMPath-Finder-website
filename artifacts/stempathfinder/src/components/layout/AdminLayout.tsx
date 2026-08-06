import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAdminMe, useAdminLogout, getAdminMeQueryKey } from "@workspace/api-client-react";
import { Compass, LayoutDashboard, Database, Users, LogOut, Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: session, isLoading, isError } = useAdminMe({
    query: {
      retry: false,
      queryKey: getAdminMeQueryKey(),
    }
  });
  
  const logoutMutation = useAdminLogout();

  // Redirect to login if not authenticated
  if (isError) {
    setLocation("/admin/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Loading admin session...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/admin/login");
      }
    });
  };

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Opportunities", path: "/admin/opportunities", icon: Database },
    { name: "Candidates Queue", path: "/admin/candidates", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-muted/10 flex flex-col md:flex-row">
      <Seo title="Admin" robots="noindex, nofollow" />
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <Compass className="h-6 w-6" />
            <span className="font-serif font-bold text-xl tracking-tight text-sidebar-foreground">STEMAdmin</span>
          </div>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/70 mb-4">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold">
              {session?.username.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium truncate">{session?.username}</span>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10" 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Mobile Header (visible only on small screens) */}
      <div className="md:hidden bg-sidebar text-sidebar-foreground p-4 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sidebar-primary">
          <Compass className="h-5 w-5" />
          <span className="font-serif font-bold text-lg tracking-tight">STEMAdmin</span>
        </div>
        {/* Simple mobile menu could go here, omitting for brevity */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
