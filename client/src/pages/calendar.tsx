import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarEvent } from "@shared/schema";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

const colorGradients = [
  "from-cyan-500 to-blue-500",
  "from-purple-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-red-500",
];

export default function Calendar() {
  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  if (isLoading) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
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
      <div className="glass-subtle border-b border-border/50 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text-static">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? "s" : ""} - {todayEvents.length} today
            </p>
          </div>
        </div>
        
        {todayEvents.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 w-fit">
            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{todayEvents.length} event{todayEvents.length > 1 ? 's' : ''} today</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full opacity-20 blur-2xl" />
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-rose-500/20 flex items-center justify-center border border-purple-500/20">
                  <CalendarIcon className="h-10 w-10 text-purple-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">No upcoming events</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your calendar events will appear here once synced from Google Calendar
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(
                upcomingEvents.reduce((groups: { [key: string]: CalendarEvent[] }, event) => {
                  const date = format(new Date(event.startTime), "yyyy-MM-dd");
                  if (!groups[date]) {
                    groups[date] = [];
                  }
                  groups[date].push(event);
                  return groups;
                }, Object.create(null))
              ).map(([date, dayEvents], groupIndex) => (
                <div key={date} className="animate-fade-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
                    <h3 className="text-base font-semibold">
                      {formatEventDate(parseISO(date))}
                    </h3>
                    <Badge variant="outline" className="rounded-full text-xs">
                      {(dayEvents as CalendarEvent[]).length} event{(dayEvents as CalendarEvent[]).length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-3 ml-4">
                    {(dayEvents as CalendarEvent[]).map((event, eventIndex) => {
                      const startTime = new Date(event.startTime);
                      const endTime = new Date(event.endTime);
                      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                      const gradient = colorGradients[eventIndex % colorGradients.length];

                      return (
                        <Card
                          key={event.id}
                          className="group glass rounded-2xl border-border/50 p-5 transition-all duration-300 hover:shadow-glow hover:scale-[1.01] animate-fade-in-up"
                          style={{ animationDelay: `${eventIndex * 50}ms` }}
                          data-testid={`card-event-${event.id}`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Time indicator */}
                            <div className="flex-shrink-0">
                              <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
                                <Clock className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h4 className="font-semibold text-lg" data-testid={`text-event-title-${event.id}`}>
                                  {event.summary}
                                </h4>
                                <Badge variant="outline" className="flex-shrink-0 rounded-full" data-testid={`badge-duration-${event.id}`}>
                                  {duration} min
                                </Badge>
                              </div>
                              
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5" data-testid={`text-event-time-${event.id}`}>
                                  <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${gradient}`} />
                                  <span className="font-medium">
                                    {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                                  </span>
                                </div>
                                
                                {event.location && (
                                  <div className="flex items-center gap-1.5" data-testid={`text-event-location-${event.id}`}>
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate max-w-[200px]">{event.location}</span>
                                  </div>
                                )}
                                
                                {event.attendees && event.attendees.length > 0 && (
                                  <div className="flex items-center gap-1.5" data-testid={`text-event-attendees-${event.id}`}>
                                    <Users className="h-4 w-4" />
                                    <span>{event.attendees.length} attendee{event.attendees.length > 1 ? "s" : ""}</span>
                                  </div>
                                )}
                              </div>

                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 bg-muted/30 rounded-lg p-3" data-testid={`text-event-description-${event.id}`}>
                                  {event.description}
                                </p>
                              )}
                            </div>
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
