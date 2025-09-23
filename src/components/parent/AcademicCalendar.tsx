import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, BookOpen, Users, GraduationCap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  event_type: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_school_wide: boolean;
  is_recurring: boolean;
  recurrence_pattern: any;
  classes_affected: string[];
}

export const AcademicCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarEvents();
  }, [user?.id, selectedEventType]);

  const fetchCalendarEvents = async () => {
    if (!user?.id) return;

    try {
      // Fetch all published calendar events
      let query = supabase
        .from('academic_calendar')
        .select('*')
        .gte('start_date', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
        .lte('start_date', new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0])
        .order('start_date', { ascending: true });

      if (selectedEventType !== 'all') {
        query = query.eq('event_type', selectedEventType);
      }

      const { data: eventsData, error: eventsError } = await query;

      if (eventsError) {
        console.error('Error fetching calendar events:', eventsError);
        toast({
          title: 'Error',
          description: 'Failed to load calendar events',
          variant: 'destructive',
        });
        return;
      }

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error in fetchCalendarEvents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'exam':
        return <BookOpen className="h-4 w-4" />;
      case 'holiday':
        return <CalendarDays className="h-4 w-4" />;
      case 'event':
        return <Users className="h-4 w-4" />;
      case 'meeting':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <CalendarDays className="h-4 w-4" />;
    }
  };

  const getEventTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'exam':
        return 'destructive';
      case 'holiday':
        return 'default';
      case 'event':
        return 'secondary';
      case 'meeting':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'exam':
        return 'text-red-600';
      case 'holiday':
        return 'text-green-600';
      case 'event':
        return 'text-blue-600';
      case 'meeting':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const startDate = event.start_date;
      const endDate = event.end_date || event.start_date;
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= today && eventDate <= nextWeek;
    });
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const upcomingEvents = getUpcomingEvents();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-muted rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Type Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Academic Calendar</h2>
        <Select value={selectedEventType} onValueChange={setSelectedEventType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="exam">Exams</SelectItem>
            <SelectItem value="holiday">Holidays</SelectItem>
            <SelectItem value="event">School Events</SelectItem>
            <SelectItem value="meeting">Meetings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Upcoming Events Alert */}
      {upcomingEvents.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Upcoming This Week
            </CardTitle>
            <CardDescription className="text-orange-600">
              Important events in the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-white border rounded">
                  <div className="flex items-center gap-3">
                    <div className={getEventTypeColor(event.event_type)}>
                      {getEventTypeIcon(event.event_type)}
                    </div>
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                    {event.event_type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>
              Click on dates to view events for that day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border w-full"
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0
              }}
              modifiersClassNames={{
                hasEvents: 'bg-primary/10 font-bold'
              }}
            />
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle>
              Events for {selectedDate.toLocaleDateString()}
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} on this date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No events scheduled for this date
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div key={event.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={getEventTypeColor(event.event_type)}>
                          {getEventTypeIcon(event.event_type)}
                        </div>
                        <span className="font-medium">{event.title}</span>
                      </div>
                      <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                        {event.event_type}
                      </Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        Start: {new Date(event.start_date).toLocaleDateString()}
                      </p>
                      {event.end_date && event.end_date !== event.start_date && (
                        <p>
                          End: {new Date(event.end_date).toLocaleDateString()}
                        </p>
                      )}
                      {event.is_school_wide && (
                        <Badge variant="outline" className="text-xs">
                          School-wide
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Events List */}
      <Card>
        <CardHeader>
          <CardTitle>All Academic Events</CardTitle>
          <CardDescription>
            Complete list of academic events for this year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No events found for the selected criteria
            </p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className={getEventTypeColor(event.event_type)}>
                        {getEventTypeIcon(event.event_type)}
                      </div>
                      <div>
                        <h3 className="font-medium">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground ml-7">
                      <p>
                        {new Date(event.start_date).toLocaleDateString()}
                        {event.end_date && event.end_date !== event.start_date && (
                          <> - {new Date(event.end_date).toLocaleDateString()}</>
                        )}
                      </p>
                      {event.is_recurring && (
                        <p>🔄 Recurring event</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right space-y-2">
                    <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                      {event.event_type}
                    </Badge>
                    {event.is_school_wide && (
                      <Badge variant="outline" className="block text-xs">
                        School-wide
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};