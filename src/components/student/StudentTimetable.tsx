import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, BookOpen, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const StudentTimetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState(new Date().getDay() - 1);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [studentClass, setStudentClass] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchStudentClass();
      fetchActiveTemplate();
    }
  }, [user]);

  useEffect(() => {
    if (activeTemplate && studentClass) {
      fetchPeriods();
      fetchTimetable();
    }
  }, [activeTemplate, studentClass]);

  const fetchStudentClass = async () => {
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user!.id)
      .single();
    
    if (student) {
      const { data: assignment } = await supabase
        .from('class_assignments')
        .select('class:classes(*)')
        .eq('student_id', student.id)
        .single();
      
      setStudentClass(assignment?.class);
    }
  };

  const fetchActiveTemplate = async () => {
    const { data } = await supabase
      .from('timetable_templates')
      .select('*')
      .eq('is_active', true)
      .single();
    
    setActiveTemplate(data);
  };

  const fetchPeriods = async () => {
    const { data } = await supabase
      .from('periods')
      .select('*')
      .eq('template_id', activeTemplate.id)
      .order('period_number');
    
    setPeriods(data || []);
  };

  const fetchTimetable = async () => {
    const { data } = await supabase
      .from('class_timetables')
      .select(`
        *,
        subject:subjects(name),
        teacher:profiles!class_timetables_teacher_id_fkey(full_name),
        room:rooms(room_number, room_name),
        period:periods(period_number, period_name, start_time, end_time, period_type)
      `)
      .eq('template_id', activeTemplate.id)
      .eq('class_id', studentClass.id);
    
    setTimetable(data || []);
  };

  const getCurrentPeriod = () => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');
    
    return periods.find(p => {
      return currentTime >= p.start_time && currentTime <= p.end_time;
    });
  };

  const getTimetableEntry = (dayIndex: number, period: any) => {
    return timetable.find(
      entry => entry.day_of_week === dayIndex + 1 && entry.period_id === period.id
    );
  };

  const getTodaySchedule = () => {
    const allPeriods = periods.filter(p => p.period_type !== 'closing');
    return allPeriods.map(period => {
      const entry = getTimetableEntry(currentDay, period);
      return {
        period,
        entry
      };
    });
  };

  const currentPeriod = getCurrentPeriod();
  const todaySchedule = getTodaySchedule();
  const nextClass = todaySchedule.find(item => 
    item.period.start_time > format(new Date(), 'HH:mm:ss') && item.entry
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Class Timetable</h2>
        <p className="text-muted-foreground">
          {studentClass?.name} - {activeTemplate?.academic_year} {activeTemplate?.term}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {currentPeriod && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                Current Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPeriod.period_type === 'break' || currentPeriod.period_type === 'lunch' ? (
                <div className="text-center py-4">
                  <Badge variant="secondary" className="text-lg px-6 py-2">
                    {currentPeriod.period_name}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ends at {currentPeriod.end_time}
                  </p>
                </div>
              ) : (
                (() => {
                  const currentEntry = getTimetableEntry(currentDay, currentPeriod);
                  return currentEntry ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{currentEntry.subject?.name}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {currentEntry.teacher?.full_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {currentEntry.room?.room_number}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ends at {currentPeriod.end_time}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Free period
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        )}

        {nextClass && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Next Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xl font-semibold">{nextClass.entry.subject?.name}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {nextClass.period.start_time}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {nextClass.entry.room?.room_number}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule - {DAYS[currentDay]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {todaySchedule.map(({ period, entry }) => {
              const isCurrentPeriod = currentPeriod?.id === period.id;
              const isPast = period.end_time < format(new Date(), 'HH:mm:ss');
              
              return (
                <div 
                  key={period.id}
                  className={`p-4 border rounded-lg flex items-center gap-4 ${
                    isCurrentPeriod ? 'border-primary bg-primary/5' : isPast ? 'opacity-50' : ''
                  }`}
                >
                  <div className="w-24 text-center">
                    <div className="text-sm font-medium">
                      {period.start_time}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {period.end_time}
                    </div>
                  </div>
                  
                  <div className="h-12 w-px bg-border" />
                  
                  <div className="flex-1">
                    {period.period_type === 'break' || period.period_type === 'lunch' ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{period.period_name}</Badge>
                      </div>
                    ) : entry ? (
                      <div className="space-y-1">
                        <div className="font-semibold">{entry.subject?.name}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.teacher?.full_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {entry.room?.room_number}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">Free period</div>
                    )}
                  </div>
                  
                  {isCurrentPeriod && (
                    <Badge className="bg-primary">Now</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Full Week View */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Period</TableHead>
                  {DAYS.map(day => (
                    <TableHead key={day} className={day === DAYS[currentDay] ? 'bg-accent' : ''}>
                      {day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.filter(p => p.period_type !== 'closing').map(period => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="text-sm">{period.period_name || `Period ${period.period_number}`}</div>
                        <div className="text-xs text-muted-foreground">
                          {period.start_time} - {period.end_time}
                        </div>
                      </div>
                    </TableCell>
                    {DAYS.map((day, dayIndex) => {
                      const entry = getTimetableEntry(dayIndex, period);
                      const isCurrentCell = dayIndex === currentDay && currentPeriod?.id === period.id;
                      
                      return (
                        <TableCell 
                          key={`${day}-${period.id}`}
                          className={isCurrentCell ? 'bg-primary/10' : ''}
                        >
                          {period.period_type === 'break' || period.period_type === 'lunch' ? (
                            <div className="text-center">
                              <Badge variant="secondary" className="text-xs">
                                {period.period_name}
                              </Badge>
                            </div>
                          ) : entry ? (
                            <div className="text-xs space-y-1">
                              <div className="font-medium">{entry.subject?.name}</div>
                              <div className="text-muted-foreground">{entry.teacher?.full_name}</div>
                              <div className="flex items-center text-muted-foreground">
                                <MapPin className="h-3 w-3 mr-1" />
                                {entry.room?.room_number}
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-center text-xs">Free</div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
