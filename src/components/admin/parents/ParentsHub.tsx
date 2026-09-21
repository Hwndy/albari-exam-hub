import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParentsList } from './ParentsList';
import { ParentDetail } from './ParentDetail';
import { ChildLinks } from './ChildLinks';
import { ParentAnnouncements } from './ParentAnnouncements';
import { MessagesInbox } from './MessagesInbox';

const PARENT_TABS = ['list', 'links', 'messages', 'announcements'];

export const ParentsHub: React.FC<{ subtab?: string | null }> = ({ subtab }) => {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const nextTab = subtab && PARENT_TABS.includes(subtab) ? subtab : 'list';
  const [tab, setTab] = useState(nextTab);
  useEffect(() => {
    setSelectedParentId(null);
    setTab(nextTab);
  }, [nextTab]);

  if (selectedParentId) {
    return <ParentDetail parentUserId={selectedParentId} onBack={() => setSelectedParentId(null)} />;
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="list">Parents</TabsTrigger>
        <TabsTrigger value="links">Child Links</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="announcements">Announcements</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><ParentsList onView={setSelectedParentId} /></TabsContent>
      <TabsContent value="links"><ChildLinks /></TabsContent>
      <TabsContent value="messages"><MessagesInbox /></TabsContent>
      <TabsContent value="announcements"><ParentAnnouncements /></TabsContent>
    </Tabs>
  );
};