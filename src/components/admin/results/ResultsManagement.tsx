import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualScoresEntry } from '@/components/admin/ManualScoresEntry';
import { AutomationSettings } from '@/components/admin/results/AutomationSettings';
import { Broadsheet } from '@/components/admin/results/Broadsheet';
import { PromotionPanel } from '@/components/admin/results/PromotionPanel';
import { PastStudents } from '@/components/admin/results/PastStudents';
import { BulkReportCards } from '@/components/admin/results/BulkReportCards';

export const ResultsManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Results Management</h2>
        <p className="text-muted-foreground">Enter scores, view broadsheets, promote students and manage automation.</p>
      </div>
      <Tabs defaultValue="enter" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="enter">Enter Scores</TabsTrigger>
          <TabsTrigger value="broadsheet">Broadsheet</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Report Cards</TabsTrigger>
          <TabsTrigger value="promotion">Promotion</TabsTrigger>
          <TabsTrigger value="past">Past Students</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>
        <TabsContent value="enter"><ManualScoresEntry /></TabsContent>
        <TabsContent value="broadsheet"><Broadsheet /></TabsContent>
        <TabsContent value="bulk"><BulkReportCards /></TabsContent>
        <TabsContent value="promotion"><PromotionPanel /></TabsContent>
        <TabsContent value="past"><PastStudents /></TabsContent>
        <TabsContent value="automation"><AutomationSettings /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ResultsManagement;