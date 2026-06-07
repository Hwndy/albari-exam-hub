import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarRange,
  GraduationCap,
  Users,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import { AdmissionManagement } from '@/components/admin/AdmissionManagement';
import { AdmissionDecisionBoard } from '@/components/admin/AdmissionDecisionBoard';
import { AdmissionSessionManager } from '@/components/admin/AdmissionSessionManager';
import { AdmissionExamScheduler } from '@/components/admin/AdmissionExamScheduler';
import { InterviewPanelManager } from '@/components/admin/InterviewPanelManager';
import { AdmissionPaymentVerification } from '@/components/admin/AdmissionPaymentVerification';
import { AdmissionAnalytics } from '@/components/admin/AdmissionAnalytics';

interface AdmissionsHubProps {
  /** Optional initial sub-tab so the sidebar can deep-link into a section. */
  initialTab?: AdmissionTab;
}

export type AdmissionTab =
  | 'applications'
  | 'pipeline'
  | 'sessions'
  | 'exams'
  | 'interviews'
  | 'payments'
  | 'analytics';

const TABS: Array<{ value: AdmissionTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'applications', label: 'Applications', icon: ClipboardList },
  { value: 'pipeline',     label: 'Pipeline',     icon: LayoutDashboard },
  { value: 'sessions',     label: 'Sessions',     icon: CalendarRange },
  { value: 'exams',        label: 'Entrance Exams', icon: GraduationCap },
  { value: 'interviews',   label: 'Interviews',   icon: Users },
  { value: 'payments',     label: 'Payments',     icon: CreditCard },
  { value: 'analytics',    label: 'Analytics',    icon: BarChart3 },
];

/**
 * Single consolidated entry point for the admissions workflow.
 * All seven screens previously scattered across the admin sidebar now live
 * inside one tabbed hub, sharing a single page shell.
 */
export const AdmissionsHub: React.FC<AdmissionsHubProps> = ({ initialTab = 'applications' }) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admissions</h2>
        <p className="text-sm text-muted-foreground">
          Manage applications, sessions, exams, interviews, payments, and decisions in one place.
        </p>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <Card className="p-1">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 w-full bg-transparent">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Card>

        <TabsContent value="applications" className="mt-0">
          <AdmissionManagement />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-0">
          <AdmissionDecisionBoard />
        </TabsContent>
        <TabsContent value="sessions" className="mt-0">
          <AdmissionSessionManager />
        </TabsContent>
        <TabsContent value="exams" className="mt-0">
          <AdmissionExamScheduler />
        </TabsContent>
        <TabsContent value="interviews" className="mt-0">
          <InterviewPanelManager />
        </TabsContent>
        <TabsContent value="payments" className="mt-0">
          <AdmissionPaymentVerification />
        </TabsContent>
        <TabsContent value="analytics" className="mt-0">
          <AdmissionAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdmissionsHub;