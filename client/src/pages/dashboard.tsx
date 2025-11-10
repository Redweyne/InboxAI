import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Database,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { DashboardData } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const loadTemplateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/template/load"),
    onSuccess: async () => {
      toast({
        title: "Template data loaded",
        description: "Sample emails, events, and tasks have been loaded for testing.",
      });
      await queryClient.refetchQueries({ queryKey: ["/api/dashboard"] });
      await queryClient.refetchQueries({ queryKey: ["/api/emails"] });
      await queryClient.refetchQueries({ queryKey: ["/api/calendar/events"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/template/clear"),
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
        await apiRequest(`/api/actions/modify-email`, {
          method: "POST",
          body: JSON.stringify({ emailId: itemId, action: "mark_read" }),
          headers: { "Content-Type": "application/json" },
        });
        toast({ title: "Email marked as read" });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
        break;
      case "archive":
        await apiRequest(`/api/actions/modify-email`, {
          method: "POST",
          body: JSON.stringify({ emailId: itemId, action: "archive" }),
          headers: { "Content-Type": "application/json" },
        });
        toast({ title: "Email archived" });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
        break;
      case "complete":
        await apiRequest(`/api/tasks/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "completed" }),
          headers: { "Content-Type": "application/json" },
        });
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
      <div className="container mx-auto p-6 space-y-6" data-testid="dashboard-loading">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto p-6" data-testid="dashboard-error">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load dashboard data</AlertDescription>
        </Alert>
      </div>
    );
  }

  const priorityColors = {
    high: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
    medium: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
    low: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="dashboard-container">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white" data-testid="dashboard-greeting">
            {dashboard.greeting}! 👋
          </h1>
          {dashboard.userEmail && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1" data-testid="dashboard-user-email">
              {dashboard.userEmail}
            </p>
          )}
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-1" data-testid="dashboard-date">
            {dashboard.date}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => loadTemplateMutation.mutate()}
            disabled={loadTemplateMutation.isPending}
            variant="outline"
            data-testid="button-load-template"
          >
            <Database className="w-4 h-4 mr-2" />
            Load Template Data
          </Button>
          <Button
            onClick={() => clearDataMutation.mutate()}
            disabled={clearDataMutation.isPending}
            variant="outline"
            data-testid="button-clear-data"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-urgent-emails">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Emails</CardTitle>
            <Mail className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-urgent-count">
              {dashboard.summary.urgentEmails}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Need immediate attention</p>
          </CardContent>
        </Card>

        <Card data-testid="card-unread-emails">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Emails</CardTitle>
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-unread-count">
              {dashboard.summary.unreadEmails}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">In your inbox</p>
          </CardContent>
        </Card>

        <Card data-testid="card-today-meetings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-meetings-count">
              {dashboard.summary.todayMeetings}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">On your schedule</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tasks-count">
              {dashboard.summary.pendingTasks}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">To complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {dashboard.insights && dashboard.insights.length > 0 && (
        <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800" data-testid="alert-insights">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-gray-900 dark:text-gray-100">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                {dashboard.insights.map((insight, i) => (
                  <p key={i} className="text-sm" data-testid={`text-insight-${i}`}>
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Items */}
        <Card data-testid="card-urgent-items">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              Priority Items
            </CardTitle>
            <CardDescription>Items that need your attention today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.urgentItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8" data-testid="text-no-urgent">
                No urgent items. You're all caught up! 🎉
              </p>
            ) : (
              dashboard.urgentItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 ${priorityColors[item.priority]}`}
                  data-testid={`item-urgent-${index}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs" data-testid={`badge-type-${item.type}`}>
                          {item.type}
                        </Badge>
                        {item.time && (
                          <span className="text-xs flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {item.time}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm mb-1" data-testid={`text-title-${index}`}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2" data-testid={`text-description-${index}`}>
                        {item.description}
                      </p>
                      {item.from && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">From: {item.from}</p>
                      )}
                    </div>
                  </div>
                  {item.quickActions && item.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.quickActions.map((qa, qaIndex) => (
                        <Button
                          key={qaIndex}
                          size="sm"
                          variant={qa.variant || "default"}
                          onClick={() => handleQuickAction(qa.action, item.id, item.type)}
                          data-testid={`button-action-${qa.action}-${index}`}
                        >
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

        {/* Today's Schedule */}
        <div className="space-y-6">
          <Card data-testid="card-schedule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Today's Schedule
              </CardTitle>
              <CardDescription>Your meetings for today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8" data-testid="text-no-events">
                  No meetings scheduled today
                </p>
              ) : (
                dashboard.upcomingEvents.map((event, index) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800" data-testid={`event-${index}`}>
                    <div className="flex flex-col items-center justify-center bg-purple-100 dark:bg-purple-900/20 rounded px-2 py-1 min-w-[60px]">
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">{event.startTime}</span>
                      <span className="text-xs text-purple-600 dark:text-purple-400">-</span>
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">{event.endTime}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white" data-testid={`text-event-title-${index}`}>
                        {event.title}
                      </h4>
                      {event.location && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">📍 {event.location}</p>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* High Priority Tasks */}
          <Card data-testid="card-priority-tasks">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                High Priority Tasks
              </CardTitle>
              <CardDescription>Your top tasks to focus on</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.topPriorityTasks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8" data-testid="text-no-tasks">
                  No high priority tasks
                </p>
              ) : (
                dashboard.topPriorityTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`task-${index}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white" data-testid={`text-task-title-${index}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      {task.dueDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleQuickAction("complete", task.id, "task")}
                      data-testid={`button-complete-task-${index}`}
                    >
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
  );
}
