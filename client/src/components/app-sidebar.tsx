import { LayoutDashboard, MessageSquare, Inbox, Calendar, BarChart3, Settings, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import logoImage from "@assets/redweyne_favicon_icon_1764542517564.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    title: "Inbox",
    url: "/inbox",
    icon: Inbox,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    gradient: "from-emerald-500 to-teal-500",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  
  if (typeof window !== 'undefined') {
    console.log(`[NAV DEBUG] Current location: "${location}"`);
  }

  return (
    <Sidebar className="border-r-0">
      <div className="absolute inset-0 glass-subtle" />
      <div className="relative z-10 flex flex-col h-full">
        <SidebarHeader className="p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl opacity-50 group-hover:opacity-75 blur transition-all duration-500" />
              <div className="relative">
                <img 
                  src={logoImage} 
                  alt="Inbox AI Logo" 
                  className="h-10 w-10 rounded-lg ring-2 ring-white/20 dark:ring-white/10" 
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold gradient-text-static">Inbox AI</span>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary animate-pulse-subtle" />
                <span className="text-xs text-muted-foreground">Your Assistant</span>
              </div>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="py-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2 mt-2">
              <SidebarMenu className="space-y-1">
                {menuItems.map((item, index) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem 
                      key={item.title}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        data-testid={`nav-${item.title.toLowerCase()}`}
                        className={`
                          relative group rounded-xl transition-all duration-300
                          ${isActive 
                            ? 'bg-primary/15 dark:bg-primary/20 shadow-glow' 
                            : 'hover:bg-accent/50'
                          }
                        `}
                      >
                        <Link href={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <div className={`
                            relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300
                            ${isActive 
                              ? `bg-gradient-to-br ${item.gradient} shadow-lg` 
                              : 'bg-muted/50 group-hover:bg-muted'
                            }
                          `}>
                            <item.icon className={`h-4.5 w-4.5 transition-colors ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}`} />
                            {isActive && (
                              <div className="absolute inset-0 rounded-lg bg-white/20 animate-pulse-subtle" />
                            )}
                          </div>
                          <span className={`font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                            {item.title}
                          </span>
                          {isActive && (
                            <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-border/30 mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                data-testid="nav-settings"
                className="rounded-xl hover:bg-accent/50 transition-all duration-300"
              >
                <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
                    <Settings className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    Settings
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-foreground">System Status</span>
            </div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
