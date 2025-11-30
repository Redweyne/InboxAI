import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, AlertCircle, Star, Inbox as InboxIcon, Clock, TrendingUp, Package, Users, Newspaper, X, ArrowLeft, Reply, Forward, Trash2, Archive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { Email } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const categoryIcons = {
  urgent: AlertCircle,
  important: Star,
  promotional: TrendingUp,
  social: Users,
  updates: Package,
  newsletter: Newspaper,
};

const categoryColors = {
  urgent: "text-destructive",
  important: "text-chart-4",
  promotional: "text-chart-2",
  social: "text-chart-3",
  updates: "text-chart-1",
  newsletter: "text-muted-foreground",
};

export default function Inbox() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const { toast } = useToast();

  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: string) => {
      return apiRequest(`/api/emails/${emailId}`, {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const emailActionMutation = useMutation({
    mutationFn: async ({ emailId, action }: { emailId: string; action: string }) => {
      return apiRequest("/api/emails/modify", {
        method: "POST",
        body: JSON.stringify({ emailId, action }),
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `Email ${variables.action === 'archive' ? 'archived' : variables.action === 'delete' ? 'deleted' : 'updated'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (variables.action === 'archive' || variables.action === 'delete') {
        setSelectedEmail(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to perform action",
        variant: "destructive",
      });
    },
  });

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      markAsReadMutation.mutate(email.id);
    }
  };

  const handleBack = () => {
    setSelectedEmail(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-64" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm mx-auto py-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <InboxIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-medium mb-2">No emails yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your emails will appear here once they are synced from Gmail
          </p>
        </div>
      </div>
    );
  }

  const unreadCount = emails.filter((e) => !e.isRead).length;
  const urgentCount = emails.filter((e) => e.isUrgent).length;

  // Email Detail View
  if (selectedEmail) {
    const CategoryIcon = categoryIcons[selectedEmail.category as keyof typeof categoryIcons] || Mail;
    const categoryColor = categoryColors[selectedEmail.category as keyof typeof categoryColors] || "text-foreground";

    return (
      <div className="flex flex-col h-full">
        {/* Email Detail Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              data-testid="button-back-to-inbox"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inbox
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => emailActionMutation.mutate({ emailId: selectedEmail.messageId, action: 'archive' })}
                disabled={emailActionMutation.isPending}
                data-testid="button-archive-email"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => emailActionMutation.mutate({ emailId: selectedEmail.messageId, action: 'delete' })}
                disabled={emailActionMutation.isPending}
                data-testid="button-delete-email"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl">
            {/* Subject and Badges */}
            <div className="mb-6">
              <h1 className="text-xl font-semibold mb-3" data-testid="text-email-subject">
                {selectedEmail.subject}
              </h1>
              <div className="flex flex-wrap gap-2">
                {selectedEmail.isUrgent && (
                  <Badge variant="destructive" className="text-xs" data-testid="badge-email-urgent">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Urgent
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs" data-testid="badge-email-category">
                  <CategoryIcon className={`h-3 w-3 mr-1 ${categoryColor}`} />
                  {selectedEmail.category}
                </Badge>
                {selectedEmail.isStarred && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-email-starred">
                    <Star className="h-3 w-3 mr-1 text-chart-4 fill-chart-4" />
                    Starred
                  </Badge>
                )}
                {selectedEmail.attachmentCount && selectedEmail.attachmentCount > 0 && (
                  <Badge variant="outline" className="text-xs" data-testid="badge-email-attachments">
                    {selectedEmail.attachmentCount} attachment{selectedEmail.attachmentCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Sender Info */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium" data-testid="text-email-from">{selectedEmail.from}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-email-to">To: {selectedEmail.to}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground" data-testid="text-email-date">
                  {format(new Date(selectedEmail.date), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Email Body */}
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              data-testid="text-email-body"
            >
              {selectedEmail.body ? (
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {selectedEmail.body}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  {selectedEmail.snippet || "No content available"}
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Email List View
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Inbox
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {emails.length} total emails - {unreadCount} unread - {urgentCount} urgent
            </p>
          </div>
        </div>
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-2">
          {emails.map((email) => {
            const CategoryIcon = categoryIcons[email.category as keyof typeof categoryIcons] || Mail;
            const categoryColor = categoryColors[email.category as keyof typeof categoryColors] || "text-foreground";

            return (
              <Card
                key={email.id}
                className={`p-4 hover-elevate cursor-pointer transition-all ${
                  !email.isRead ? "border-l-4 border-l-primary" : ""
                }`}
                onClick={() => handleEmailClick(email)}
                data-testid={`card-email-${email.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium truncate ${!email.isRead ? "font-semibold" : ""}`} data-testid={`text-sender-${email.id}`}>
                        {email.from}
                      </span>
                      {email.isStarred && <Star className="h-4 w-4 text-chart-4 fill-chart-4" data-testid={`icon-starred-${email.id}`} />}
                    </div>
                    <h3 className={`text-sm mb-1 truncate ${!email.isRead ? "font-semibold" : "font-medium"}`} data-testid={`text-subject-${email.id}`}>
                      {email.subject}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-snippet-${email.id}`}>{email.snippet}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {email.isUrgent && (
                        <Badge variant="destructive" className="text-xs" data-testid={`badge-urgent-${email.id}`}>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs" data-testid={`badge-category-${email.id}`}>
                        <CategoryIcon className={`h-3 w-3 mr-1 ${categoryColor}`} />
                        {email.category}
                      </Badge>
                      {email.attachmentCount && email.attachmentCount > 0 && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-attachment-${email.id}`}>
                          {email.attachmentCount} attachment{email.attachmentCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground font-mono" data-testid={`text-date-${email.id}`}>
                      {format(new Date(email.date), "MMM d")}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono" data-testid={`text-time-${email.id}`}>
                      {format(new Date(email.date), "h:mm a")}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
