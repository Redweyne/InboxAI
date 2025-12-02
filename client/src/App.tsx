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
import { LogOut, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { basePath } from "@/lib/base-path";
import type { DashboardData } from "@shared/schema";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Inbox from "@/pages/inbox";
import Calendar from "@/pages/calendar";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const routerBase = basePath || undefined;

if (typeof window !== 'undefined') {
  console.log(
    `[ROUTER DEBUG] basePath: "${basePath}" | routerBase: "${routerBase}" | MODE: "${import.meta.env.MODE}" | Current URL: "${window.location.pathname}"`
  );
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/chat" component={Chat} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
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
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger 
          data-testid="button-sidebar-toggle" 
          className="text-foreground/70 hover:text-foreground transition-colors"
        />
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse-subtle" />
          <span className="text-xs font-medium text-primary">AI-Powered</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {authStatus?.authenticated && (
          <>
            {dashboard?.userEmail && (
              <span className="hidden md:block text-sm text-muted-foreground" data-testid="header-user-email">
                {dashboard.userEmail}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              data-testid="button-logout-header"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}

function CosmicBackground() {
  return (
    <div className="cosmic-bg" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/50 to-background" />
    </div>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={routerBase}>
          <CosmicBackground />
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full relative">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="glass-subtle border-b border-border/50 relative z-10">
                  <AppHeader />
                  <SyncBanner />
                </header>
                <main className="flex-1 overflow-hidden relative">
                  <Routes />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
