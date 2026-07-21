import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualScoresEntry } from '@/components/admin/ManualScoresEntry';
import { Broadsheet } from '@/components/admin/results/Broadsheet';

export const TeacherResultsManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Results Management</h2>
        <p className="text-muted-foreground">Enter scores and view broadsheets for your assigned classes and subjects.</p>
      </div>
      <Tabs defaultValue="enter" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="enter">Enter Scores</TabsTrigger>
          <TabsTrigger value="broadsheet">Broadsheet</TabsTrigger>
        </TabsList>
        <TabsContent value="enter"><ManualScoresEntry /></TabsContent>
        <TabsContent value="broadsheet"><Broadsheet /></TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherResultsManagement;