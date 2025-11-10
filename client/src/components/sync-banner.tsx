import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { handleAuthenticationRetry } from "@/lib/auth-helper";
import { useState, useEffect } from "react";
import type { Email } from "@shared/schema";

export function SyncBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const syncAll = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync-all", {});
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: `Synced ${data.emailCount} emails and ${data.eventCount} calendar events`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/email"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/calendar"] });
      setDismissed(true);
    },
    onError: async (error: any) => {
      // Check if error is authentication related
      if (error.message?.includes("authenticated") || error.status === 401) {
        await handleAuthenticationRetry({
          onAuthSuccess: () => {
            toast({
              title: "Authentication Successful",
              description: "Syncing your emails and calendar now...",
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

  // Show banner if no emails and not dismissed
  if (emails.length > 0 || dismissed) {
    return null;
  }

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium">
            Welcome to Inbox AI! Get started by syncing your Gmail and Calendar.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click the button to authenticate with Google and fetch your emails
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => syncAll.mutate()}
            disabled={syncAll.isPending}
            data-testid="button-banner-sync"
          >
            {syncAll.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Now
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            data-testid="button-banner-dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
