import { useQuery } from "@tanstack/react-query";
import { BarChart3, Mail, AlertCircle, TrendingUp, Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailAnalytics, CalendarAnalytics } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const CATEGORY_COLORS = {
  urgent: "hsl(0, 72%, 50%)",
  important: "hsl(45, 100%, 55%)",
  promotional: "hsl(280, 85%, 60%)",
  social: "hsl(160, 70%, 45%)",
  updates: "hsl(190, 100%, 50%)",
  newsletter: "hsl(220, 10%, 50%)",
};

const statCardGradients = [
  { gradient: "from-cyan-500 to-blue-500", glow: "rgba(6, 182, 212, 0.1)" },
  { gradient: "from-blue-500 to-indigo-500", glow: "rgba(59, 130, 246, 0.1)" },
  { gradient: "from-red-500 to-orange-500", glow: "rgba(239, 68, 68, 0.1)" },
  { gradient: "from-purple-500 to-pink-500", glow: "rgba(168, 85, 247, 0.1)" },
];

export default function Analytics() {
  const { data: emailAnalytics, isLoading: emailLoading } = useQuery<EmailAnalytics>({
    queryKey: ["/api/analytics/email"],
  });

  const { data: calendarAnalytics, isLoading: calendarLoading } = useQuery<CalendarAnalytics>({
    queryKey: ["/api/analytics/calendar"],
  });

  if (emailLoading || calendarLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const categoryData = emailAnalytics ? Object.entries(emailAnalytics.categoryBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS],
  })) : [];

  const emailStats = [
    { title: "Total Emails", value: emailAnalytics?.totalEmails || 0, icon: Mail, ...statCardGradients[0] },
    { title: "Unread", value: emailAnalytics?.unreadCount || 0, icon: Mail, ...statCardGradients[1] },
    { title: "Urgent", value: emailAnalytics?.urgentCount || 0, icon: AlertCircle, ...statCardGradients[2] },
    { title: "Categories", value: Object.keys(emailAnalytics?.categoryBreakdown || {}).length, icon: TrendingUp, ...statCardGradients[3] },
  ];

  const calendarStats = [
    { title: "Upcoming Events", value: calendarAnalytics?.upcomingEvents || 0, icon: CalendarIcon, gradient: "from-purple-500 to-pink-500" },
    { title: "Today's Events", value: calendarAnalytics?.todayEvents || 0, icon: Clock, gradient: "from-emerald-500 to-teal-500" },
    { title: "This Week", value: calendarAnalytics?.weekEvents || 0, icon: CalendarIcon, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="glass-subtle border-b border-border/50 p-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text-static">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Insights into your email and calendar activity
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Email Stats */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Email Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {emailStats.map((stat, index) => (
              <Card 
                key={stat.title}
                className="group glass rounded-2xl border-border/30 overflow-hidden transition-all duration-500 hover:shadow-glow hover:scale-[1.02] animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${stat.glow}, transparent 70%)` }}
                />
                <CardHeader className="pb-2 relative">
                  <CardDescription className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                      <stat.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {stat.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Calendar Stats */}
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold">Calendar Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {calendarStats.map((stat, index) => (
              <Card 
                key={stat.title}
                className="group glass rounded-2xl border-border/30 overflow-hidden transition-all duration-500 hover:shadow-glow hover:scale-[1.02] animate-fade-in-up"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
                data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                      <stat.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {stat.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass rounded-2xl border-border/30 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <CardHeader className="border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Recent Email Activity</CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {emailAnalytics?.recentActivity && emailAnalytics.recentActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={emailAnalytics.recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="url(#barGradient)" 
                      radius={[6, 6, 0, 0]} 
                    />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(190, 100%, 50%)" />
                        <stop offset="100%" stopColor="hsl(220, 100%, 60%)" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-center">
                  <div className="p-3 rounded-full bg-muted/50 mb-3">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass rounded-2xl border-border/30 animate-fade-in" style={{ animationDelay: '500ms' }}>
            <CardHeader className="border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Category Distribution</CardTitle>
                  <CardDescription>Email breakdown by category</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {categoryData.length > 0 && categoryData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""}
                      outerRadius={80}
                      innerRadius={40}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-center">
                  <div className="p-3 rounded-full bg-muted/50 mb-3">
                    <Mail className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No emails to categorize</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Free Time Slots */}
        {calendarAnalytics?.freeSlots && calendarAnalytics.freeSlots.length > 0 && (
          <Card className="glass rounded-2xl border-border/30 animate-fade-in" style={{ animationDelay: '600ms' }}>
            <CardHeader className="border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Available Time Slots</CardTitle>
                  <CardDescription>Next available slots in your calendar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {calendarAnalytics.freeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-3 p-4 rounded-xl glass border border-border/50 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-glow"
                    data-testid={`slot-${index}`}
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                      <Clock className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {new Date(slot.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
