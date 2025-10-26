import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarEvent } from "@shared/schema";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

export default function Calendar() {
  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-64" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const upcomingEvents = events.filter(
    (event) => new Date(event.startTime) >= new Date()
  );

  const todayEvents = upcomingEvents.filter((event) =>
    isToday(new Date(event.startTime))
  );

  const formatEventDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMM d");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? "s" : ""} •{" "}
              {todayEvents.length} today
            </p>
          </div>
        </div>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {upcomingEvents.length === 0 ? (
            <div className="text-center max-w-sm mx-auto py-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-medium mb-2">No upcoming events</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your calendar events will appear here once synced from Google Calendar
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingEvents.reduce((groups: { [key: string]: CalendarEvent[] }, event) => {
                const date = format(new Date(event.startTime), "yyyy-MM-dd");
                if (!groups[date]) {
                  groups[date] = [];
                }
                groups[date].push(event);
                return groups;
              }, Object.create(null)) &&
                Object.entries(
                  upcomingEvents.reduce((groups: { [key: string]: CalendarEvent[] }, event) => {
                    const date = format(new Date(event.startTime), "yyyy-MM-dd");
                    if (!groups[date]) {
                      groups[date] = [];
                    }
                    groups[date].push(event);
                    return groups;
                  }, Object.create(null))
                ).map(([date, dayEvents]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-background py-2 z-10">
                      {formatEventDate(parseISO(date))}
                    </h3>
                    <div className="space-y-2">
                      {(dayEvents as CalendarEvent[]).map((event) => {
                        const startTime = new Date(event.startTime);
                        const endTime = new Date(event.endTime);
                        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

                        return (
                          <Card
                            key={event.id}
                            className="p-4 border-l-4 border-l-primary hover-elevate"
                            data-testid={`card-event-${event.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium mb-1" data-testid={`text-event-title-${event.id}`}>{event.summary}</h4>
                                
                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1" data-testid={`text-event-time-${event.id}`}>
                                    <Clock className="h-4 w-4" />
                                    <span className="font-mono">
                                      {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                                    </span>
                                  </div>
                                  
                                  {event.location && (
                                    <div className="flex items-center gap-1" data-testid={`text-event-location-${event.id}`}>
                                      <MapPin className="h-4 w-4" />
                                      <span className="truncate">{event.location}</span>
                                    </div>
                                  )}
                                  
                                  {event.attendees && event.attendees.length > 0 && (
                                    <div className="flex items-center gap-1" data-testid={`text-event-attendees-${event.id}`}>
                                      <Users className="h-4 w-4" />
                                      <span>{event.attendees.length} attendee{event.attendees.length > 1 ? "s" : ""}</span>
                                    </div>
                                  )}
                                </div>

                                {event.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2" data-testid={`text-event-description-${event.id}`}>
                                    {event.description}
                                  </p>
                                )}
                              </div>

                              <Badge variant="outline" className="flex-shrink-0 text-xs" data-testid={`badge-duration-${event.id}`}>
                                {duration} min
                              </Badge>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
