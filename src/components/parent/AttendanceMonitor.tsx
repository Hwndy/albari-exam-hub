import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Users, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_at: string;
  notes?: string;
  attendance_sessions: {
    date: string;
    period_number: number;
    subjects: {
      name: string;
    };
  };
  students: {
    profiles: {
      full_name: string;
    };
  };
}

export const AttendanceMonitor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [user?.id, selectedMonth, selectedYear]);

  const fetchAttendanceRecords = async () => {
    if (!user?.id) return;

    try {
      // First get parent record
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (parentError) {
        console.error('Parent not found:', parentError);
        setLoading(false);
        return;
      }

      // Get student IDs for this parent
      const { data: relationshipData, error: relationshipError } = await supabase
        .from('student_parent_relationships')
        .select('student_id')
        .eq('parent_id', parentData.id);

      if (relationshipError) {
        console.error('Error fetching relationships:', relationshipError);
        return;
      }

      const studentIds = relationshipData?.map(rel => rel.student_id) || [];

      if (studentIds.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate date range for selected month/year
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);

      // Fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('student_attendance')
        .select(`
          id,
          status,
          marked_at,
          notes,
          attendance_sessions (
            date,
            period_number,
            subjects (
              name
            )
          ),
          students (
            profiles (
              full_name
            )
          )
        `)
        .in('student_id', studentIds)
        .gte('attendance_sessions.date', startDate.toISOString().split('T')[0])
        .lte('attendance_sessions.date', endDate.toISOString().split('T')[0])
        .order('attendance_sessions.date', { ascending: false });

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        toast({
          title: 'Error',
          description: 'Failed to load attendance records',
          variant: 'destructive',
        });
        return;
      }

      setAttendanceRecords(attendanceData || []);
    } catch (error) {
      console.error('Error in fetchAttendanceRecords:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceStats = () => {
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(record => 
      record.status === 'present' || record.status === 'late'
    ).length;
    const absentDays = attendanceRecords.filter(record => 
      record.status === 'absent'
    ).length;
    const excusedDays = attendanceRecords.filter(record => 
      record.status === 'excused'
    ).length;
    
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    return {
      totalDays,
      presentDays,
      absentDays,
      excusedDays,
      attendanceRate
    };
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'present':
        return 'default';
      case 'late':
        return 'secondary';
      case 'excused':
        return 'outline';
      case 'absent':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'text-green-600';
      case 'late':
        return 'text-yellow-600';
      case 'excused':
        return 'text-blue-600';
      case 'absent':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = calculateAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Month/Year Selection */}
      <div className="flex gap-4">
        <Select 
          value={selectedMonth.toString()} 
          onValueChange={(value) => setSelectedMonth(parseInt(value))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedYear.toString()} 
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Attendance Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.attendanceRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Days</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.presentDays}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {stats.totalDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {attendanceRecords.filter(r => r.status === 'late').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Times late
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absences</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.absentDays}
            </div>
            <p className="text-xs text-muted-foreground">
              Unexcused absences
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>
            Daily attendance records for the selected month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No attendance records found for this period
            </p>
          ) : (
            <div className="space-y-4">
              {attendanceRecords.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {new Date(record.attendance_sessions.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {record.attendance_sessions.subjects?.name} • Period {record.attendance_sessions.period_number}
                    </div>
                    {record.students?.profiles?.full_name && (
                      <div className="text-xs text-muted-foreground">
                        Student: {record.students.profiles.full_name}
                      </div>
                    )}
                    {record.notes && (
                      <div className="text-xs text-muted-foreground">
                        Note: {record.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <Badge variant={getStatusBadgeVariant(record.status)}>
                      {record.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      Marked: {new Date(record.marked_at).toLocaleTimeString()}
                    </div>
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