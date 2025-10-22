import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TeacherTimetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState(new Date().getDay() - 1); // 0 = Monday
  const [activeTemplate, setActiveTemplate] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchActiveTemplate();
    }
  }, [user]);

  useEffect(() => {
    if (activeTemplate && user) {
      fetchPeriods();
      fetchTimetable();
    }
  }, [activeTemplate, user]);

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
      .eq('is_teaching_period', true)
      .order('period_number');
    
    setPeriods(data || []);
  };

  const fetchTimetable = async () => {
    const { data } = await supabase
      .from('class_timetables')
      .select(`
        *,
        class:classes(name),
        subject:subjects(name),
        room:rooms(room_number, room_name),
        period:periods(period_number, period_name, start_time, end_time)
      `)
      .eq('template_id', activeTemplate.id)
      .eq('teacher_id', user!.id);
    
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
    return timetable.filter(entry => entry.day_of_week === currentDay + 1)
      .sort((a, b) => a.period.period_number - b.period.period_number);
  };

  const currentPeriod = getCurrentPeriod();
  const todaySchedule = getTodaySchedule();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Teaching Schedule</h2>
        <p className="text-muted-foreground">
          {activeTemplate ? `${activeTemplate.name} - ${activeTemplate.academic_year}` : 'No active timetable'}
        </p>
      </div>

      {currentPeriod && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Current Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge className="text-base px-4 py-2">
                {currentPeriod.period_name || `Period ${currentPeriod.period_number}`}
              </Badge>
              <div className="text-sm text-muted-foreground">
                {currentPeriod.start_time} - {currentPeriod.end_time}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Classes - {DAYS[currentDay]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No classes scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map(entry => (
                <div 
                  key={entry.id} 
                  className={`p-4 border rounded-lg ${
                    currentPeriod?.id === entry.period_id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">{entry.subject?.name}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {entry.class?.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {entry.room?.room_number}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {entry.period.start_time} - {entry.period.end_time}
                        </div>
                      </div>
                    </div>
                    {currentPeriod?.id === entry.period_id && (
                      <Badge>In Progress</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Week View */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
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
                {periods.map(period => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{period.period_name || `Period ${period.period_number}`}</div>
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
                          className={isCurrentCell ? 'bg-primary/10 border-2 border-primary' : ''}
                        >
                          {entry ? (
                            <div className="text-xs space-y-1">
                              <div className="font-medium">{entry.subject?.name}</div>
                              <div className="text-muted-foreground">{entry.class?.name}</div>
                              <div className="flex items-center text-muted-foreground">
                                <MapPin className="h-3 w-3 mr-1" />
                                {entry.room?.room_number}
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-center text-xs">-</div>
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
