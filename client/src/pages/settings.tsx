import { useMutation } from "@tanstack/react-query";
import { Settings as SettingsIcon, RefreshCw, Trash2, Mail, Calendar as CalendarIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { handleAuthenticationRetry } from "@/lib/auth-helper";

export default function Settings() {
  const { toast } = useToast();

  const syncAll = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sync-all", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: `Synced ${data.emailCount} emails and ${data.eventCount} calendar events`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/email"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/calendar"] });
    },
    onError: async (error: any) => {
      if (error.message?.includes("authenticated") || error.status === 401) {
        await handleAuthenticationRetry({
          onAuthSuccess: () => {
            toast({
              title: "Authentication Successful",
              description: "Syncing your data now...",
            });
            syncAll.mutate();
          },
          onAuthError: (authError) => {
            toast({
              title: "Authentication Failed",
              description: authError.message || "Failed to authenticate with Google",
              variant: "destructive",
            });
          },
        });
      } else {
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync data",
          variant: "destructive",
        });
      }
    },
  });

  const syncEmails = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/emails/sync", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Emails Synced",
        description: `Synced ${data.count} emails from Gmail`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/email"] });
    },
    onError: async (error: any) => {
      if (error.message?.includes("authenticated") || error.status === 401) {
        await handleAuthenticationRetry({
          onAuthSuccess: () => {
            toast({
              title: "Authentication Successful",
              description: "Syncing emails now...",
            });
            syncEmails.mutate();
          },
          onAuthError: (authError) => {
            toast({
              title: "Authentication Failed",
              description: authError.message || "Failed to authenticate with Google",
              variant: "destructive",
            });
          },
        });
      } else {
        toast({
          title: "Email Sync Failed",
          description: error.message || "Failed to sync emails",
          variant: "destructive",
        });
      }
    },
  });

  const syncCalendar = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/calendar/sync", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Calendar Synced",
        description: `Synced ${data.count} events from Google Calendar`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/calendar"] });
    },
    onError: async (error: any) => {
      if (error.message?.includes("authenticated") || error.status === 401) {
        await handleAuthenticationRetry({
          onAuthSuccess: () => {
            toast({
              title: "Authentication Successful",
              description: "Syncing calendar now...",
            });
            syncCalendar.mutate();
          },
          onAuthError: (authError) => {
            toast({
              title: "Authentication Failed",
              description: authError.message || "Failed to authenticate with Google",
              variant: "destructive",
            });
          },
        });
      } else {
        toast({
          title: "Calendar Sync Failed",
          description: error.message || "Failed to sync calendar",
          variant: "destructive",
        });
      }
    },
  });

  const clearChat = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/chat/messages", {});
    },
    onSuccess: () => {
      toast({
        title: "Chat Cleared",
        description: "All chat messages have been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Clear Failed",
        description: error.message || "Failed to clear chat",
        variant: "destructive",
      });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      toast({
        title: "Logged Out Successfully",
        description: "Your Gmail account has been disconnected and all data has been cleared.",
      });
      // Invalidate all queries to clear cached data and refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/email"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
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
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b border-border p-6 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your Gmail and Calendar sync settings
        </p>
      </div>

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sync Data</CardTitle>
            <CardDescription>
              Fetch the latest emails and calendar events from your Google account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-1">Sync Everything</h3>
                <p className="text-sm text-muted-foreground">
                  Sync both Gmail and Google Calendar at once
                </p>
              </div>
              <Button
                onClick={() => syncAll.mutate()}
                disabled={syncAll.isPending}
                data-testid="button-sync-all"
              >
                {syncAll.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync All
              </Button>
            </div>

            <div className="border-t border-border pt-4" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium mb-1">Gmail Only</h3>
                  <p className="text-sm text-muted-foreground">
                    Fetch recent emails from your inbox
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => syncEmails.mutate()}
                disabled={syncEmails.isPending}
                data-testid="button-sync-emails"
              >
                {syncEmails.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Emails
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium mb-1">Google Calendar Only</h3>
                  <p className="text-sm text-muted-foreground">
                    Fetch upcoming events from your calendar
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => syncCalendar.mutate()}
                disabled={syncCalendar.isPending}
                data-testid="button-sync-calendar"
              >
                {syncCalendar.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Calendar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Manage your connected Google account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-1">Disconnect Gmail Account</h3>
                <p className="text-sm text-muted-foreground">
                  Remove your Gmail connection and clear all OAuth tokens
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Clear stored data and conversation history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-1">Clear Chat History</h3>
                <p className="text-sm text-muted-foreground">
                  Delete all conversation messages with the assistant
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => clearChat.mutate()}
                disabled={clearChat.isPending}
                data-testid="button-clear-chat"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Chat
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              Your intelligent email and calendar assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Version:</span> 1.0.0
              </p>
              <p className="text-muted-foreground">
                This assistant uses rule-based intelligence to help you manage your Gmail inbox
                and Google Calendar. All processing happens locally for your privacy.
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Smart email categorization (urgent, important, promotional, etc.)</li>
                  <li>Automatic urgency detection</li>
                  <li>Draft response generation</li>
                  <li>Free time slot finder</li>
                  <li>Visual analytics and insights</li>
                  <li>ChatGPT-style conversation interface</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
