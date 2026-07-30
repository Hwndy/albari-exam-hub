import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { AdmissionManagement } from '@/components/admin/AdmissionManagement';
import { AdmissionDecisionBoard } from '@/components/admin/AdmissionDecisionBoard';
import { AdmissionSessionManager } from '@/components/admin/AdmissionSessionManager';
import { AdmissionExamScheduler } from '@/components/admin/AdmissionExamScheduler';
import { InterviewsTab } from '@/components/admin/admissions/InterviewsTab';
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

const TABS: Array<{ value: AdmissionTab; label: string }> = [
  { value: 'applications', label: 'Applications' },
  { value: 'pipeline',     label: 'Pipeline' },
  { value: 'sessions',     label: 'Sessions' },
  { value: 'exams',        label: 'Entrance Exams' },
  { value: 'interviews',   label: 'Interviews' },
  { value: 'payments',     label: 'Payments' },
  { value: 'analytics',    label: 'Analytics' },
];

/**
 * Single consolidated entry point for the admissions workflow.
 * All seven screens previously scattered across the admin sidebar now live
 * inside one tabbed hub, sharing a single page shell.
 */
export const AdmissionsHub: React.FC<AdmissionsHubProps> = ({ initialTab = 'applications' }) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage applications, sessions, exams, interviews, payments, and decisions in one place.
      </p>
      <Tabs defaultValue={initialTab} className="space-y-4">
        <Card className="p-1 overflow-hidden">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-auto w-max gap-1 bg-transparent p-0">
              {TABS.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="whitespace-nowrap px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
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
          <InterviewsTab />
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