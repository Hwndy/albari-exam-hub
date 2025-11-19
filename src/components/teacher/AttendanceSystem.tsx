import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCheck, UserX, Clock, AlertCircle, Calendar as CalendarIcon, Users, Search, Filter, FileDown, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  admission_number: string;
  profiles?: {
    full_name: string;
  };
}

interface AttendanceSession {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  date: string;
  start_time: string;
  end_time: string;
  period_number: number;
  status: string;
  classes?: {
    name: string;
  };
  subjects?: {
    name: string;
  };
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_session_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_at: string;
  notes?: string;
  students?: {
    admission_number: string;
    profiles?: {
      full_name: string;
    };
  };
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

export const AttendanceSystem = () => {
  const { user } = useAuth();
  const { withSchoolFilter, withSchoolData } = useSchoolQuery();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [newSession, setNewSession] = useState({
    class_id: '',
    subject_id: '',
    date: new Date(),
    start_time: '',
    end_time: '',
    period_number: 1
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch teacher's class assignments
      const { data: classAssignments, error: classError } = await withSchoolFilter(
        supabase
          .from('teacher_class_assignments')
          .select('class_id')
          .eq('teacher_id', user?.id)
      );

      if (classError) throw classError;

      // Fetch teacher's subject assignments
      const { data: subjectAssignments, error: subjectError } = await supabase
        .from('subject_assignments')
        .select(`
          subjects (
            id,
            name
          )
        `)
        .eq('user_id', user?.id);

      if (subjectError) throw subjectError;

      // Fetch attendance sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('attendance_sessions')
        .select(`
          *,
          classes (
            name
          ),
          subjects (
            name
          )
        `)
        .eq('teacher_id', user?.id)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch class details separately
      const classDetails = await Promise.all(
        (classAssignments || []).map(async (assignment) => {
          const { data: cls } = await supabase
            .from('classes')
            .select('id, name')
            .eq('id', assignment.class_id)
            .single();
          return cls;
        })
      );
      
      setClasses(classDetails.filter(Boolean));
      setSubjects(subjectAssignments?.map(sa => sa.subjects).filter(Boolean) || []);
      setAttendanceSessions(sessions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      if (!selectedClass) return;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('class_assignments')
        .select('student_id')
        .eq('class_id', selectedClass);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setStudents([]);
        return;
      }

      const studentIds = assignments.map(a => a.student_id);
      
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, admission_number, user_id')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      const userIds = studentsData?.map(s => s.user_id).filter(Boolean) || [];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      const studentsWithProfiles = studentsData?.map(student => ({
        ...student,
        profiles: profilesData?.find(p => p.user_id === student.user_id) || { full_name: 'Unknown' }
      })) || [];

      setStudents(studentsWithProfiles);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    }
  };

  const createAttendanceSession = async () => {
    try {
      if (!newSession.class_id || !newSession.subject_id || !newSession.start_time) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      const { data: session, error } = await supabase
        .from('attendance_sessions')
        .insert({
          class_id: newSession.class_id,
          subject_id: newSession.subject_id,
          teacher_id: user?.id,
          date: format(newSession.date, 'yyyy-MM-dd'),
          start_time: newSession.start_time,
          end_time: newSession.end_time,
          period_number: newSession.period_number,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Attendance session created successfully',
      });

      setShowCreateSession(false);
      setNewSession({
        class_id: '',
        subject_id: '',
        date: new Date(),
        start_time: '',
        end_time: '',
        period_number: 1
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create session',
        variant: 'destructive',
      });
    }
  };

  const startAttendanceSession = async (session: AttendanceSession) => {
    try {
      // Update session status to active
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'active' })
        .eq('id', session.id);

      if (error) throw error;

      setCurrentSession(session);
      setSelectedClass(session.class_id);
      
      // Initialize attendance data for all students
      const initialAttendance: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
      students.forEach(student => {
        initialAttendance[student.id] = 'present'; // Default to present
      });
      setAttendanceData(initialAttendance);

      toast({
        title: 'Success',
        description: 'Attendance session started',
      });
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start session',
        variant: 'destructive',
      });
    }
  };

  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const saveAttendance = async () => {
    try {
      if (!currentSession) return;

      // Prepare attendance records
      const attendanceRecords = Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: studentId,
        attendance_session_id: currentSession.id,
        status,
        marked_at: new Date().toISOString(),
        marked_by: user?.id,
        notes: notes[studentId] || null
      }));

      const { error } = await supabase
        .from('student_attendance')
        .upsert(attendanceRecords, { 
          onConflict: 'student_id,attendance_session_id' 
        });

      if (error) throw error;

      // Update session status to completed
      const { error: sessionError } = await supabase
        .from('attendance_sessions')
        .update({ status: 'completed' })
        .eq('id', currentSession.id);

      if (sessionError) throw sessionError;

      toast({
        title: 'Success',
        description: 'Attendance saved successfully',
      });

      setCurrentSession(null);
      setAttendanceData({});
      setNotes({});
      fetchData();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save attendance',
        variant: 'destructive',
      });
    }
  };

  const filteredStudents = students.filter(student =>
    student.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAttendanceStats = () => {
    const total = Object.keys(attendanceData).length;
    const present = Object.values(attendanceData).filter(status => status === 'present').length;
    const absent = Object.values(attendanceData).filter(status => status === 'absent').length;
    const late = Object.values(attendanceData).filter(status => status === 'late').length;
    const excused = Object.values(attendanceData).filter(status => status === 'excused').length;

    return { total, present, absent, late, excused };
  };

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Attendance System</h2>
          <p className="text-muted-foreground">Mark and manage student attendance</p>
        </div>
        <Button onClick={() => setShowCreateSession(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Session
        </Button>
      </div>

      <Tabs defaultValue="mark" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="space-y-6">
          {!currentSession ? (
            <Card>
              <CardHeader>
                <CardTitle>Select Session to Start</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceSessions
                    .filter(session => session.status === 'scheduled')
                    .slice(0, 5)
                    .map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{session.subjects?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {session.classes?.name} • Period {session.period_number} • {format(new Date(session.date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.start_time} - {session.end_time}
                        </p>
                      </div>
                      <Button onClick={() => startAttendanceSession(session)}>
                        Start Session
                      </Button>
                    </div>
                  ))}
                  {attendanceSessions.filter(session => session.status === 'scheduled').length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No scheduled sessions. Create a new session to start marking attendance.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Current Session Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{currentSession.subjects?.name}</h4>
                      <p className="text-muted-foreground">
                        {currentSession.classes?.name} • Period {currentSession.period_number} • {format(new Date(currentSession.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setCurrentSession(null)}>
                        Cancel
                      </Button>
                      <Button onClick={saveAttendance}>
                        Save Attendance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                    <div className="text-sm text-muted-foreground">Present</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                    <div className="text-sm text-muted-foreground">Absent</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.late}</div>
                    <div className="text-sm text-muted-foreground">Late</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
                    <div className="text-sm text-muted-foreground">Excused</div>
                  </CardContent>
                </Card>
              </div>

              {/* Students List */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Mark Attendance</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newData: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
                          students.forEach(student => {
                            newData[student.id] = 'present';
                          });
                          setAttendanceData(newData);
                        }}
                      >
                        Mark All Present
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newData: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
                          students.forEach(student => {
                            newData[student.id] = 'absent';
                          });
                          setAttendanceData(newData);
                        }}
                      >
                        Mark All Absent
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 max-w-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {student.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.profiles?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{student.admission_number}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={attendanceData[student.id] === 'present' ? 'default' : 'outline'}
                              onClick={() => markAttendance(student.id, 'present')}
                              className="px-2 py-1"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={attendanceData[student.id] === 'absent' ? 'destructive' : 'outline'}
                              onClick={() => markAttendance(student.id, 'absent')}
                              className="px-2 py-1"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={attendanceData[student.id] === 'late' ? 'secondary' : 'outline'}
                              onClick={() => markAttendance(student.id, 'late')}
                              className="px-2 py-1"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={attendanceData[student.id] === 'excused' ? 'secondary' : 'outline'}
                              onClick={() => markAttendance(student.id, 'excused')}
                              className="px-2 py-1"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <Badge variant={
                            attendanceData[student.id] === 'present' ? 'default' :
                            attendanceData[student.id] === 'absent' ? 'destructive' :
                            attendanceData[student.id] === 'late' ? 'secondary' :
                            attendanceData[student.id] === 'excused' ? 'outline' :
                            'outline'
                          }>
                            {attendanceData[student.id] || 'Not Set'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{format(new Date(session.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{session.subjects?.name}</TableCell>
                        <TableCell>{session.classes?.name}</TableCell>
                        <TableCell>Period {session.period_number}</TableCell>
                        <TableCell>{session.start_time} - {session.end_time}</TableCell>
                        <TableCell>
                          <Badge variant={
                            session.status === 'completed' ? 'default' :
                            session.status === 'active' ? 'secondary' :
                            'outline'
                          }>
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Attendance reports and analytics will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Session Dialog */}
      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Attendance Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select value={newSession.class_id} onValueChange={(value) => setNewSession(prev => ({ ...prev, class_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={newSession.subject_id} onValueChange={(value) => setNewSession(prev => ({ ...prev, subject_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newSession.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(newSession.date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newSession.date}
                    onSelect={(date) => setNewSession(prev => ({ ...prev, date: date || new Date() }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={newSession.start_time}
                  onChange={(e) => setNewSession(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={newSession.end_time}
                  onChange={(e) => setNewSession(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Period Number</Label>
              <Input
                id="period"
                type="number"
                min="1"
                max="10"
                value={newSession.period_number}
                onChange={(e) => setNewSession(prev => ({ ...prev, period_number: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateSession(false)}>
              Cancel
            </Button>
            <Button onClick={createAttendanceSession}>
              Create Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};