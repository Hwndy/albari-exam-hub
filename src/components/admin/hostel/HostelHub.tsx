import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HostelsRooms } from './HostelsRooms';
import { HostelAllocations } from './HostelAllocations';
import { HostelWardens } from './HostelWardens';
import { HostelInspections } from './HostelInspections';
import { HostelPasses } from './HostelPasses';
import { HostelRollCall } from './HostelRollCall';

interface Props { subtab?: string | null }

export const HostelHub: React.FC<Props> = ({ subtab }) => {
  const initial = subtab && ['hostels', 'allocations', 'rollcall', 'passes', 'inspections', 'wardens'].includes(subtab)
    ? subtab : 'hostels';
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Hostels, bed allocation, roll call, exeat passes and inspections.</p>
      <Tabs defaultValue={initial} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
            <TabsTrigger value="hostels">Hostels &amp; Rooms</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="rollcall">Roll Call</TabsTrigger>
            <TabsTrigger value="passes">Exeat Passes</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="wardens">Wardens</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="hostels"><HostelsRooms /></TabsContent>
        <TabsContent value="allocations"><HostelAllocations /></TabsContent>
        <TabsContent value="rollcall"><HostelRollCall /></TabsContent>
        <TabsContent value="passes"><HostelPasses /></TabsContent>
        <TabsContent value="inspections"><HostelInspections /></TabsContent>
        <TabsContent value="wardens"><HostelWardens /></TabsContent>
      </Tabs>
    </div>
  );
};

export default HostelHub;