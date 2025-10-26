import { useQuery } from "@tanstack/react-query";
import { Mail, AlertCircle, Star, Inbox as InboxIcon, Clock, TrendingUp, Package, Users, Newspaper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Email } from "@shared/schema";
import { format } from "date-fns";

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
  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

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
              {emails.length} total emails • {unreadCount} unread • {urgentCount} urgent
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
                      {email.attachmentCount > 0 && (
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
