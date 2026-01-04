import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentOverview } from '@/components/parent/StudentOverview';
import { AcademicProgress } from '@/components/parent/AcademicProgress';
import { AttendanceMonitor } from '@/components/parent/AttendanceMonitor';
import { FeeManagementEnhanced } from '@/components/parent/FeeManagementEnhanced';
import { CommunicationHub } from '@/components/parent/CommunicationHub';
import { AcademicCalendar } from '@/components/parent/AcademicCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, DollarSign, TrendingUp, Loader2 } from 'lucide-react';

interface ParentStats {
  childrenCount: number;
  averageGrade: number;
  attendanceRate: number;
  outstandingFees: number;
  isLoading: boolean;
}

export const ParentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ParentStats>({
    childrenCount: 0,
    averageGrade: 0,
    attendanceRate: 0,
    outstandingFees: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (user?.id) {
      fetchParentStats();
    }
  }, [user?.id]);

  const fetchParentStats = async () => {
    if (!user?.id) return;

    try {
      // Get parent record
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id, school_id')
        .eq('user_id', user.id)
        .single();

      if (parentError) {
        console.error('Parent not found:', parentError);
        setStats(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Get children through relationships
      const { data: relationships, error: relError } = await supabase
        .from('student_parent_relationships')
        .select('student_id')
        .eq('parent_id', parentData.id);

      if (relError) {
        console.error('Error fetching relationships:', relError);
        setStats(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const studentIds = relationships?.map(r => r.student_id) || [];
      const childrenCount = studentIds.length;

      if (studentIds.length === 0) {
        setStats({
          childrenCount: 0,
          averageGrade: 0,
          attendanceRate: 0,
          outstandingFees: 0,
          isLoading: false,
        });
        return;
      }

      // Fetch gradebook entries for average grade calculation
      const { data: gradeData } = await supabase
        .from('gradebook_entries')
        .select('obtained_score, max_score')
        .in('student_id', studentIds);

      let averageGrade = 0;
      if (gradeData && gradeData.length > 0) {
        const totalPercentage = gradeData.reduce((sum, entry) => {
          return sum + ((entry.obtained_score || 0) / (entry.max_score || 1)) * 100;
        }, 0);
        averageGrade = Math.round(totalPercentage / gradeData.length);
      }

      // Fetch attendance records for attendance rate
      const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select('status')
        .in('student_id', studentIds);

      let attendanceRate = 0;
      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter(
          a => a.status === 'present' || a.status === 'late'
        ).length;
        attendanceRate = Math.round((presentCount / attendanceData.length) * 100);
      }

      // Fetch outstanding fees
      // First get fee structures for the school
      const { data: feeStructures } = await supabase
        .from('fee_structures')
        .select('id, amount')
        .eq('school_id', parentData.school_id);

      // Then get payments made by students
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('amount_paid')
        .in('student_id', studentIds)
        .eq('status', 'completed');

      const totalFees = (feeStructures || []).reduce((sum, f) => sum + (f.amount || 0), 0) * childrenCount;
      const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      const outstandingFees = Math.max(0, totalFees - totalPaid);

      setStats({
        childrenCount,
        averageGrade,
        attendanceRate,
        outstandingFees,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching parent stats:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout title="Parent Portal">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Monitor your children's academic progress and school activities.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Children Enrolled</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.childrenCount}</div>
                  <p className="text-xs text-muted-foreground">Active students</p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats.averageGrade > 0 ? `${stats.averageGrade}%` : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">Overall performance</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats.attendanceRate > 0 ? `${stats.attendanceRate}%` : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">This term</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats.outstandingFees > 0 ? formatCurrency(stats.outstandingFees) : '₦0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.outstandingFees > 0 ? 'Payment pending' : 'All paid up'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs - Mobile responsive */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="academics" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Academics</TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Attendance</TabsTrigger>
              <TabsTrigger value="fees" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Fees</TabsTrigger>
              <TabsTrigger value="communication" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Messages</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Calendar</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <StudentOverview />
          </TabsContent>

          <TabsContent value="academics" className="space-y-4">
            <AcademicProgress />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <AttendanceMonitor />
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <FeeManagementEnhanced />
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <CommunicationHub />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <AcademicCalendar />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
