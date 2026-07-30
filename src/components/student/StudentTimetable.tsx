import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, MapPin, BookOpen, User, Loader2, Printer } from 'lucide-react';

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
  subject?: { name: string };
  teacher?: { full_name: string };
  room?: { name: string };
  notes?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const StudentTimetable: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<number>(Math.max(0, Math.min(4, new Date().getDay() - 1)));
  const [className, setClassName] = useState<string>('');
  const [hasClass, setHasClass] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchTimetable();
    }
  }, [user?.id]);

  const fetchTimetable = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Get student's class assignment (rows are keyed by auth user id,
      // but older rows may reference students.id)
      let { data: classAssignment } = await supabase
        .from('class_assignments')
        .select('class_id, classes(id, name)')
        .eq('student_id', user.id)
        .maybeSingle();

      if (!classAssignment?.class_id) {
        const { data: studentRow } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (studentRow?.id) {
          const { data: alt } = await supabase
            .from('class_assignments')
            .select('class_id, classes(id, name)')
            .eq('student_id', studentRow.id)
            .maybeSingle();
          classAssignment = alt as any;
        }
      }

      if (!classAssignment?.class_id) {
        setHasClass(false);
        setIsLoading(false);
        return;
      }

      const classData = classAssignment.classes as any;
      setHasClass(true);
      setClassName(classData?.name || 'My Class');

      // Fetch periods for the school
      const { data: periodsData } = await supabase
        .from('periods')
        .select('*')
        
        .order('period_number');
      
      setPeriods(periodsData || []);

      // Fetch class timetable
      const { data, error } = await supabase
        .from('class_timetables')
        .select(`
          id,
          day_of_week,
          period_id,
          notes,
          teacher_id,
          subjects(name),
          rooms(room_name)
        `)
        .eq('class_id', classAssignment.class_id);

      if (error) throw error;

      // Fetch teacher names separately
      const teacherIds = [...new Set((data || []).map(d => d.teacher_id).filter(Boolean))];
      const { data: teacherProfiles } = teacherIds.length > 0 
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', teacherIds)
        : { data: [] };
      
      const teacherMap = new Map((teacherProfiles || []).map(p => [p.user_id, p.full_name]));

      const entries = (data || []).map(entry => ({
        ...entry,
        subject: entry.subjects,
        teacher: entry.teacher_id ? { full_name: teacherMap.get(entry.teacher_id) || 'Unknown' } : undefined,
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

  const getNextClass = () => {
    const now = new Date();
    const currentDay = now.getDay() - 1; // 0 = Monday
    if (currentDay < 0 || currentDay > 4) return null; // Weekend
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todaysClasses = timetableEntries
      .filter(e => e.day_of_week === currentDay)
      .map(e => {
        const period = periods.find(p => p.id === e.period_id);
        if (!period) return null;
        const [hours, minutes] = period.start_time.split(':').map(Number);
        return { ...e, period, startMinutes: hours * 60 + minutes };
      })
      .filter(Boolean)
      .sort((a, b) => a!.startMinutes - b!.startMinutes);

    return todaysClasses.find(c => c!.startMinutes > currentTime) || null;
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

  if (!hasClass) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>You are not assigned to any class yet.</p>
          <p className="text-sm">Please contact your administrator.</p>
        </CardContent>
      </Card>
    );
  }

  const nextClass = getNextClass();
  const currentDayName = DAYS[new Date().getDay() - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Class Timetable</h2>
          <p className="text-muted-foreground">Class: {className}</p>
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

      {/* Next Class Alert */}
      {nextClass && viewMode === 'week' && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Class</p>
                  <p className="font-semibold">{nextClass.subject?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{nextClass.period?.start_time}</p>
                {nextClass.teacher && (
                  <p className="text-sm text-muted-foreground">{nextClass.teacher.full_name}</p>
                )}
              </div>
            </div>
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
                                {entry.teacher && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {entry.teacher.full_name}
                                  </div>
                                )}
                                {entry.room && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {entry.room.name}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground/50 text-xs">
                                -
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
                          <div className="font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {entry.subject?.name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {entry.teacher && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {entry.teacher.full_name}
                              </span>
                            )}
                            {entry.room && (
                              <span className="flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {entry.room.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No class scheduled</span>
                      )}
                    </div>
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
            <p>No timetable has been created for your class yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
