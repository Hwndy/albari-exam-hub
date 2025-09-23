import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentOverview } from '@/components/parent/StudentOverview';
import { AcademicProgress } from '@/components/parent/AcademicProgress';
import { AttendanceMonitor } from '@/components/parent/AttendanceMonitor';
import { FeeManagement } from '@/components/parent/FeeManagement';
import { CommunicationHub } from '@/components/parent/CommunicationHub';
import { AcademicCalendar } from '@/components/parent/AcademicCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, Calendar, DollarSign, MessageSquare, TrendingUp } from 'lucide-react';

export const ParentDashboard = () => {
  const { user } = useAuth();

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
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Active students</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">Overall performance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">95%</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">All paid up</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="academics">Academics</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="communication">Messages</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

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
            <FeeManagement />
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