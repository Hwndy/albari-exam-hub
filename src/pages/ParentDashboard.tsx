import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChildrenOverview } from '@/components/parent/ChildrenOverview';
import { ParentAcademics } from '@/components/parent/ParentAcademics';
import { ParentAttendance } from '@/components/parent/ParentAttendance';
import { ParentFees } from '@/components/parent/ParentFees';
import { CommunicationHub } from '@/components/parent/CommunicationHub';
import { AcademicCalendar } from '@/components/parent/AcademicCalendar';
import { ParentReportCards } from '@/components/parent/ParentReportCards';
import { ParentProfileSettings } from '@/components/parent/ParentProfileSettings';
import { ChildProvider, useChildren } from '@/contexts/ChildContext';
import { ChildSelector } from '@/components/parent/ChildSelector';
import { useAuth } from '@/contexts/AuthContext';

const ParentDashboardInner: React.FC = () => {
  const { user } = useAuth();
  const { children, selectedChild } = useChildren();

  return (
    <DashboardLayout title="Parent Portal">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}. {selectedChild ? `Viewing ${selectedChild.full_name}${selectedChild.class_name ? ` • ${selectedChild.class_name}` : ''}` : 'Link your child to get started.'}
            </p>
          </div>
          {children.length > 0 && <ChildSelector />}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="academics" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Academics</TabsTrigger>
              <TabsTrigger value="report-cards" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Report Cards</TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Attendance</TabsTrigger>
              <TabsTrigger value="fees" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Fees</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Messages</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Calendar</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview"><ChildrenOverview /></TabsContent>
          <TabsContent value="academics"><ParentAcademics /></TabsContent>
          <TabsContent value="report-cards"><ParentReportCards /></TabsContent>
          <TabsContent value="attendance"><ParentAttendance /></TabsContent>
          <TabsContent value="fees"><ParentFees /></TabsContent>
          <TabsContent value="messages"><CommunicationHub /></TabsContent>
          <TabsContent value="calendar"><AcademicCalendar /></TabsContent>
          <TabsContent value="settings"><ParentProfileSettings /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export const ParentDashboard: React.FC = () => (
  <ChildProvider>
    <ParentDashboardInner />
  </ChildProvider>
);
