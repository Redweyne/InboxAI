import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, AlertCircle, Star, Inbox as InboxIcon, Clock, TrendingUp, Package, Users, Newspaper, ArrowLeft, Trash2, Archive, Sparkles } from "lucide-react";
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

const categoryGradients = {
  urgent: "from-red-500 to-orange-500",
  important: "from-amber-500 to-yellow-500",
  promotional: "from-purple-500 to-pink-500",
  social: "from-emerald-500 to-teal-500",
  updates: "from-cyan-500 to-blue-500",
  newsletter: "from-slate-500 to-gray-500",
};

const categoryBgGlow = {
  urgent: "rgba(239, 68, 68, 0.1)",
  important: "rgba(245, 158, 11, 0.1)",
  promotional: "rgba(168, 85, 247, 0.1)",
  social: "rgba(16, 185, 129, 0.1)",
  updates: "rgba(6, 182, 212, 0.1)",
  newsletter: "rgba(100, 116, 139, 0.1)",
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
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm mx-auto py-12 animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full opacity-20 blur-2xl" />
            <div className="relative h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center border border-primary/20">
              <InboxIcon className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">No emails yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your emails will appear here once they are synced from Gmail
          </p>
        </div>
      </div>
    );
  }

  const unreadCount = emails.filter((e) => !e.isRead).length;
  const urgentCount = emails.filter((e) => e.isUrgent).length;

  if (selectedEmail) {
    const CategoryIcon = categoryIcons[selectedEmail.category as keyof typeof categoryIcons] || Mail;
    const categoryGradient = categoryGradients[selectedEmail.category as keyof typeof categoryGradients] || "from-gray-500 to-slate-500";

    return (
      <div className="flex flex-col h-full">
        <div className="glass-subtle border-b border-border/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="rounded-xl"
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
                className="rounded-xl hover:bg-primary/10"
                data-testid="button-archive-email"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => emailActionMutation.mutate({ emailId: selectedEmail.messageId, action: 'delete' })}
                disabled={emailActionMutation.isPending}
                className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                data-testid="button-delete-email"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-4" data-testid="text-email-subject">
                {selectedEmail.subject}
              </h1>
              <div className="flex flex-wrap gap-2">
                {selectedEmail.isUrgent && (
                  <Badge className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white border-0" data-testid="badge-email-urgent">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Urgent
                  </Badge>
                )}
                <Badge variant="outline" className="rounded-full" data-testid="badge-email-category">
                  <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${categoryGradient} mr-2`} />
                  {selectedEmail.category}
                </Badge>
                {selectedEmail.isStarred && (
                  <Badge variant="outline" className="rounded-full" data-testid="badge-email-starred">
                    <Star className="h-3 w-3 mr-1 text-amber-500 fill-amber-500" />
                    Starred
                  </Badge>
                )}
                {selectedEmail.attachmentCount && selectedEmail.attachmentCount > 0 && (
                  <Badge variant="outline" className="rounded-full" data-testid="badge-email-attachments">
                    {selectedEmail.attachmentCount} attachment{selectedEmail.attachmentCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            <Card className="glass rounded-2xl border-border/50 p-5 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${categoryGradient} flex items-center justify-center text-white text-sm font-semibold`}>
                    {selectedEmail.from.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold" data-testid="text-email-from">{selectedEmail.from}</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-email-to">To: {selectedEmail.to}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-email-date">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selectedEmail.date), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="glass rounded-2xl border-border/50 p-6">
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
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="glass-subtle border-b border-border/50 p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text-static">Inbox</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {emails.length} total - {unreadCount} unread - {urgentCount} urgent
              </p>
            </div>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">{unreadCount} unread</span>
            </div>
          )}
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-xs font-medium text-red-500">{urgentCount} urgent</span>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {emails.map((email, index) => {
            const CategoryIcon = categoryIcons[email.category as keyof typeof categoryIcons] || Mail;
            const categoryGradient = categoryGradients[email.category as keyof typeof categoryGradients] || "from-gray-500 to-slate-500";
            const bgGlow = categoryBgGlow[email.category as keyof typeof categoryBgGlow] || "rgba(100, 116, 139, 0.1)";

            return (
              <Card
                key={email.id}
                className={`group glass rounded-2xl border-border/50 p-4 cursor-pointer transition-all duration-300 hover:shadow-glow hover:scale-[1.01] animate-fade-in-up ${
                  !email.isRead ? "border-l-4 border-l-primary" : ""
                }`}
                style={{ 
                  animationDelay: `${Math.min(index * 50, 300)}ms`,
                }}
                onClick={() => handleEmailClick(email)}
                data-testid={`card-email-${email.id}`}
              >
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 0% 50%, ${bgGlow}, transparent 50%)` }}
                />
                <div className="relative flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br ${categoryGradient} flex items-center justify-center text-white text-sm font-semibold shadow-lg`}>
                    {email.from.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold truncate ${!email.isRead ? "text-foreground" : "text-muted-foreground"}`} data-testid={`text-sender-${email.id}`}>
                        {email.from}
                      </span>
                      {email.isStarred && <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" data-testid={`icon-starred-${email.id}`} />}
                      {!email.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <h3 className={`text-sm mb-1.5 line-clamp-1 ${!email.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`} data-testid={`text-subject-${email.id}`}>
                      {email.subject}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-snippet-${email.id}`}>
                      {email.snippet}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {email.isUrgent && (
                        <Badge className="rounded-full text-xs bg-gradient-to-r from-red-500 to-orange-500 text-white border-0" data-testid={`badge-urgent-${email.id}`}>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                      <Badge variant="outline" className="rounded-full text-xs" data-testid={`badge-category-${email.id}`}>
                        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${categoryGradient} mr-1.5`} />
                        {email.category}
                      </Badge>
                      {email.attachmentCount && email.attachmentCount > 0 && (
                        <Badge variant="outline" className="rounded-full text-xs" data-testid={`badge-attachment-${email.id}`}>
                          {email.attachmentCount} attachment{email.attachmentCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground" data-testid={`text-date-${email.id}`}>
                      {format(new Date(email.date), "MMM d")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5" data-testid={`text-time-${email.id}`}>
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
