import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Trash2,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import type { DashboardData } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const clearDataMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/data/clear"),
    onSuccess: async () => {
      toast({
        title: "Data cleared",
        description: "All emails, events, and tasks have been removed.",
      });
      await queryClient.refetchQueries({ queryKey: ["/api/dashboard"] });
      await queryClient.refetchQueries({ queryKey: ["/api/emails"] });
      await queryClient.refetchQueries({ queryKey: ["/api/calendar/events"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleQuickAction = async (action: string, itemId: string, itemType: string) => {
    switch (action) {
      case "mark_read":
        await apiRequest("POST", "/api/actions/modify-email", { emailId: itemId, action: "mark_read" });
        toast({ title: "Email marked as read" });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
        break;
      case "archive":
        await apiRequest("POST", "/api/actions/modify-email", { emailId: itemId, action: "archive" });
        toast({ title: "Email archived" });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
        break;
      case "complete":
        await apiRequest("PATCH", `/api/tasks/${itemId}`, { status: "completed" });
        toast({ title: "Task completed", description: "Great job!" });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        break;
      default:
        toast({ title: "Action", description: `${action} on ${itemType}` });
    }
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="container mx-auto p-6 space-y-6" data-testid="dashboard-loading">
          <div className="space-y-2">
            <Skeleton className="h-12 w-80 rounded-xl" />
            <Skeleton className="h-6 w-48 rounded-lg" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="h-full overflow-auto">
        <div className="container mx-auto p-6" data-testid="dashboard-error">
          <Alert className="glass rounded-2xl border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load dashboard data</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Urgent Emails",
      value: dashboard.summary.urgentEmails,
      description: "Need immediate attention",
      icon: Mail,
      gradient: "from-red-500 to-orange-500",
      bgGlow: "rgba(239, 68, 68, 0.1)",
      testId: "card-urgent-emails",
      valueTestId: "text-urgent-count",
    },
    {
      title: "Unread Emails",
      value: dashboard.summary.unreadEmails,
      description: "In your inbox",
      icon: Mail,
      gradient: "from-cyan-500 to-blue-500",
      bgGlow: "rgba(6, 182, 212, 0.1)",
      testId: "card-unread-emails",
      valueTestId: "text-unread-count",
    },
    {
      title: "Today's Meetings",
      value: dashboard.summary.todayMeetings,
      description: "On your schedule",
      icon: Calendar,
      gradient: "from-purple-500 to-pink-500",
      bgGlow: "rgba(168, 85, 247, 0.1)",
      testId: "card-today-meetings",
      valueTestId: "text-meetings-count",
    },
    {
      title: "Pending Tasks",
      value: dashboard.summary.pendingTasks,
      description: "To complete",
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      bgGlow: "rgba(16, 185, 129, 0.1)",
      testId: "card-pending-tasks",
      valueTestId: "text-tasks-count",
    },
  ];

  const priorityColors = {
    high: "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 dark:border-red-500/20",
    medium: "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30 dark:border-yellow-500/20",
    low: "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 dark:border-blue-500/20",
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-6 space-y-8" data-testid="dashboard-container">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-5xl font-bold" data-testid="dashboard-greeting">
                <span className="gradient-text">{dashboard.greeting}!</span>
                <span className="ml-3 inline-block animate-float">👋</span>
              </h1>
            </div>
            <p className="text-lg text-muted-foreground flex items-center gap-2" data-testid="dashboard-date">
              <Clock className="h-4 w-4" />
              {dashboard.date}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <Button
              onClick={() => clearDataMutation.mutate()}
              disabled={clearDataMutation.isPending}
              variant="outline"
              data-testid="button-clear-data"
              className="glass-subtle rounded-xl border-border/50 hover:border-destructive/50 hover:text-destructive transition-all duration-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.title}
              className="group glass rounded-2xl border-border/30 overflow-hidden transition-all duration-500 hover:shadow-glow hover:scale-[1.02] animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
              data-testid={stat.testId}
            >
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at 50% 0%, ${stat.bgGlow}, transparent 70%)` }}
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold mb-1" data-testid={stat.valueTestId}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Insights Alert */}
        {dashboard.insights && dashboard.insights.length > 0 && (
          <div 
            className="glass rounded-2xl p-4 border border-primary/20 relative overflow-hidden animate-fade-in"
            style={{ animationDelay: '400ms' }}
            data-testid="alert-insights"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-purple-500 shadow-lg flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">AI Insights</span>
                </div>
                {dashboard.insights.map((insight, i) => (
                  <p key={i} className="text-sm text-muted-foreground" data-testid={`text-insight-${i}`}>
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Priority Items */}
          <Card 
            className="glass rounded-2xl border-border/30 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: '500ms' }}
            data-testid="card-urgent-items"
          >
            <CardHeader className="border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>Priority Items</CardTitle>
                  <CardDescription>Items that need your attention today</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[400px] overflow-auto">
              {dashboard.urgentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground" data-testid="text-no-urgent">
                    No urgent items
                  </p>
                  <p className="text-xs text-muted-foreground">You're all caught up!</p>
                </div>
              ) : (
                dashboard.urgentItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`group p-4 rounded-xl border-2 ${priorityColors[item.priority]} backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]`}
                    data-testid={`item-urgent-${index}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs rounded-full" data-testid={`badge-type-${item.type}`}>
                            {item.type}
                          </Badge>
                          {item.time && (
                            <span className="text-xs flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {item.time}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm mb-1 line-clamp-1" data-testid={`text-title-${index}`}>
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-description-${index}`}>
                          {item.description}
                        </p>
                        {item.from && (
                          <p className="text-xs text-muted-foreground mt-1">From: {item.from}</p>
                        )}
                      </div>
                    </div>
                    {item.quickActions && item.quickActions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30">
                        {item.quickActions.map((qa, qaIndex) => (
                          <Button
                            key={qaIndex}
                            size="sm"
                            variant={qa.variant || "default"}
                            onClick={() => handleQuickAction(qa.action, item.id, item.type)}
                            className="rounded-lg text-xs"
                            data-testid={`button-action-${qa.action}-${index}`}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            {qa.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Right Column - Schedule and Tasks */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <Card 
              className="glass rounded-2xl border-border/30 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: '600ms' }}
              data-testid="card-schedule"
            >
              <CardHeader className="border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>Your meetings for today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {dashboard.upcomingEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 rounded-full bg-muted/50 mb-3">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-no-events">
                      No meetings scheduled today
                    </p>
                  </div>
                ) : (
                  dashboard.upcomingEvents.map((event, index) => (
                    <div 
                      key={event.id} 
                      className="group flex items-start gap-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/10 transition-all duration-300 hover:border-purple-500/30"
                      data-testid={`event-${index}`}
                    >
                      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg px-3 py-2 min-w-[72px]">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{event.startTime}</span>
                        <div className="w-4 h-px bg-purple-500/30 my-1" />
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{event.endTime}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-1" data-testid={`text-event-title-${index}`}>
                          {event.title}
                        </h4>
                        {event.location && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <span className="text-purple-500">@</span> {event.location}
                          </p>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* High Priority Tasks */}
            <Card 
              className="glass rounded-2xl border-border/30 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: '700ms' }}
              data-testid="card-priority-tasks"
            >
              <CardHeader className="border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>High Priority Tasks</CardTitle>
                    <CardDescription>Your top tasks to focus on</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {dashboard.topPriorityTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 rounded-full bg-muted/50 mb-3">
                      <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-no-tasks">
                      No high priority tasks
                    </p>
                  </div>
                ) : (
                  dashboard.topPriorityTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-gradient-to-r from-transparent to-emerald-500/5 hover:border-emerald-500/30 transition-all duration-300"
                      data-testid={`task-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1" data-testid={`text-task-title-${index}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        {task.dueDate && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleQuickAction("complete", task.id, "task")}
                        className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
                        data-testid={`button-complete-task-${index}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Complete
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
