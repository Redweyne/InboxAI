import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SyncBanner } from "@/components/sync-banner";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DashboardData } from "@shared/schema";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Inbox from "@/pages/inbox";
import Calendar from "@/pages/calendar";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  // Use the Vite BASE_URL for the router base
  // In dev: "/" | In production: "/inboxai/"
  const basePath = import.meta.env.BASE_URL;
  
  // CRITICAL DEBUG LOG - Check router base at runtime
  if (typeof window !== 'undefined') {
    console.log(
      `[ROUTER DEBUG] BASE_URL from Vite: "${basePath}" | NODE_ENV: "${import.meta.env.MODE}" | Current URL: "${window.location.pathname}"`
    );
  }
  
  return (
    <WouterRouter base={basePath}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function AppHeader() {
  const { toast } = useToast();
  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: authStatus } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/status"],
  });

  const logout = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      toast({
        title: "Logged Out Successfully",
        description: "Your Gmail account has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
    onError: (error: any) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center justify-between gap-2 p-4">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <div className="flex items-center gap-3">
        {authStatus?.authenticated && (
          <>
            {dashboard?.userEmail && (
              <span className="text-sm text-muted-foreground" data-testid="header-user-email">
                {dashboard.userEmail}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              data-testid="button-logout-header"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="border-b border-border bg-background">
                <AppHeader />
                <SyncBanner />
              </header>
              <main className="flex-1 overflow-hidden">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
