import { useQuery } from "@tanstack/react-query";
import { BarChart3, Mail, AlertCircle, TrendingUp, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailAnalytics, CalendarAnalytics } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const CATEGORY_COLORS = {
  urgent: "hsl(var(--destructive))",
  important: "hsl(var(--chart-4))",
  promotional: "hsl(var(--chart-2))",
  social: "hsl(var(--chart-3))",
  updates: "hsl(var(--chart-1))",
  newsletter: "hsl(var(--muted-foreground))",
};

export default function Analytics() {
  const { data: emailAnalytics, isLoading: emailLoading } = useQuery<EmailAnalytics>({
    queryKey: ["/api/analytics/email"],
  });

  const { data: calendarAnalytics, isLoading: calendarLoading } = useQuery<CalendarAnalytics>({
    queryKey: ["/api/analytics/calendar"],
  });

  if (emailLoading || calendarLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const categoryData = emailAnalytics ? Object.entries(emailAnalytics.categoryBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS],
  })) : [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border p-6 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Insights into your email and calendar activity
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Email Stats Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Email Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-stat-total-emails">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Total Emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{emailAnalytics?.totalEmails || 0}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-unread">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Unread
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{emailAnalytics?.unreadCount || 0}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-urgent">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Urgent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {emailAnalytics?.urgentCount || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-categories">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Object.keys(emailAnalytics?.categoryBreakdown || {}).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Calendar Stats Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Calendar Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-stat-upcoming-events">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Upcoming Events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{calendarAnalytics?.upcomingEvents || 0}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-today-events">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Today's Events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{calendarAnalytics?.todayEvents || 0}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-week-events">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  This Week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{calendarAnalytics?.weekEvents || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Email Activity</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {emailAnalytics?.recentActivity && emailAnalytics.recentActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={emailAnalytics.recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Distribution</CardTitle>
              <CardDescription>Email breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
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
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  No emails to categorize
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Free Time Slots */}
        {calendarAnalytics?.freeSlots && calendarAnalytics.freeSlots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Time Slots</CardTitle>
              <CardDescription>Next available slots in your calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {calendarAnalytics.freeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate"
                    data-testid={`slot-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">
                          {new Date(slot.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {slot.startTime} - {slot.endTime}
                        </div>
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
