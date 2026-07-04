import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, MapPin, BookOpen, Users, Loader2, Printer } from 'lucide-react';

interface Period {
  id: string;
  period_number: number;
  period_name: string | null;
  start_time: string;
  end_time: string;
  is_teaching_period: boolean;
  period_type: string | null;
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period_id: string;
  class?: { id: string; name: string };
  subject?: { name: string };
  room?: { name: string };
  notes?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const TeacherTimetable: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() - 1);

  useEffect(() => {
    if (user?.id) {
      fetchTimetable();
    }
  }, [user?.id]);

  const fetchTimetable = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch periods
      const { data: periodsData } = await 
        supabase.from('periods').select('*').order('period_number')
      ;
      setPeriods(periodsData || []);

      // Fetch teacher's timetable entries
      const { data, error } = await supabase
        .from('class_timetables')
        .select(`
          id,
          day_of_week,
          period_id,
          notes,
          classes(id, name),
          subjects(name),
          rooms(room_name)
        `)
        .eq('teacher_id', user.id);

      if (error) throw error;

      const entries = (data || []).map(entry => ({
        ...entry,
        class: entry.classes,
        subject: entry.subjects,
        room: entry.rooms ? { name: (entry.rooms as any).room_name } : undefined,
      }));

      setTimetableEntries(entries as TimetableEntry[]);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      toast({ title: 'Error', description: 'Failed to load timetable', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getEntryForSlot = (dayIndex: number, periodId: string) => {
    return timetableEntries.find(e => e.day_of_week === dayIndex && e.period_id === periodId);
  };

  const getTodaysClasses = () => {
    const today = new Date().getDay() - 1; // 0 = Monday
    if (today < 0 || today > 4) return []; // Weekend
    
    return timetableEntries
      .filter(e => e.day_of_week === today)
      .sort((a, b) => {
        const periodA = periods.find(p => p.id === a.period_id);
        const periodB = periods.find(p => p.id === b.period_id);
        return (periodA?.period_number || 0) - (periodB?.period_number || 0);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const todaysClasses = getTodaysClasses();
  const currentDayName = DAYS[new Date().getDay() - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Teaching Schedule</h2>
          <p className="text-muted-foreground">Your weekly teaching timetable</p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v: 'week' | 'day') => setViewMode(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week View</SelectItem>
              <SelectItem value="day">Day View</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Today's Summary */}
      {currentDayName && viewMode === 'week' && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Classes ({currentDayName})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysClasses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {todaysClasses.map(entry => {
                  const period = periods.find(p => p.id === entry.period_id);
                  return (
                    <Badge key={entry.id} variant="secondary" className="text-sm py-1.5 px-3">
                      <Clock className="h-3 w-3 mr-1" />
                      {period?.start_time} - {entry.subject?.name} ({entry.class?.name})
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No classes scheduled for today</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Day Selector for Day View */}
      {viewMode === 'day' && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {DAYS.map((day, index) => (
            <Button
              key={day}
              variant={selectedDay === index ? 'default' : 'outline'}
              onClick={() => setSelectedDay(index)}
              className="min-w-20"
            >
              {SHORT_DAYS[index]}
            </Button>
          ))}
        </div>
      )}

      {/* Timetable Display */}
      {periods.length > 0 ? (
        viewMode === 'week' ? (
          // Week View
          <Card className="print:shadow-none">
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr>
                    <th className="border bg-muted p-2 text-left font-semibold w-24">Time</th>
                    {DAYS.map(day => (
                      <th 
                        key={day} 
                        className={`border bg-muted p-2 text-center font-semibold ${
                          day === currentDayName ? 'bg-primary/20' : ''
                        }`}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(period => (
                    <tr key={period.id}>
                      <td className="border p-2 bg-muted/50">
                        <div className="text-sm font-medium">
                          {period.period_name || `Period ${period.period_number}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {period.start_time} - {period.end_time}
                        </div>
                      </td>
                      {DAYS.map((day, dayIndex) => {
                        const entry = getEntryForSlot(dayIndex, period.id);
                        const isToday = day === currentDayName;
                        const isBreak = !period.is_teaching_period;
                        
                        return (
                          <td 
                            key={dayIndex} 
                            className={`border p-2 ${
                              isBreak ? 'bg-muted/30' : 
                              isToday ? 'bg-primary/5' : ''
                            }`}
                          >
                            {isBreak ? (
                              <div className="text-center text-muted-foreground text-sm italic">
                                {period.period_type || 'Break'}
                              </div>
                            ) : entry ? (
                              <div className="space-y-1">
                                <div className="font-medium text-sm flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {entry.subject?.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {entry.class?.name}
                                </div>
                                {entry.room && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {entry.room.name}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground/50 text-xs">
                                Free
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          // Day View
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{DAYS[selectedDay]}</h3>
            {periods.map(period => {
              const entry = getEntryForSlot(selectedDay, period.id);
              const isBreak = !period.is_teaching_period;

              return (
                <Card key={period.id} className={isBreak ? 'bg-muted/30' : ''}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-20 text-center">
                      <div className="text-sm font-medium">{period.start_time}</div>
                      <div className="text-xs text-muted-foreground">{period.end_time}</div>
                    </div>
                    <div className="flex-1">
                      {isBreak ? (
                        <span className="text-muted-foreground italic">
                          {period.period_type || 'Break'}
                        </span>
                      ) : entry ? (
                        <div>
                          <div className="font-medium">{entry.subject?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.class?.name}
                            {entry.room && ` • ${entry.room.name}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Free Period</span>
                      )}
                    </div>
                    {entry && !isBreak && (
                      <Badge variant="outline">Teaching</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No periods defined yet. Contact your administrator to set up the timetable.</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{timetableEntries.length}</div>
            <div className="text-sm text-muted-foreground">Weekly Classes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {new Set(timetableEntries.map(e => e.class?.id)).size}
            </div>
            <div className="text-sm text-muted-foreground">Classes Taught</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {new Set(timetableEntries.map(e => e.subject?.name)).size}
            </div>
            <div className="text-sm text-muted-foreground">Subjects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{todaysClasses.length}</div>
            <div className="text-sm text-muted-foreground">Today's Classes</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
