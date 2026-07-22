import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SchoolInfoEditor } from '@/components/admin/CMS/SchoolInfoEditor';
import { SiteSettingsEditor } from '@/components/admin/CMS/SiteSettingsEditor';
import { StaffAttendance } from '@/components/admin/StaffAttendance';
import { School, Globe, Users } from 'lucide-react';

/**
 * Admin Settings hub — brings school profile, website settings and staff HR-facing
 * config into one place so admins don't need to hunt around the sidebar.
 */
export const SettingsHub: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">School profile, website branding and operational defaults.</p>
      </div>
      <Tabs defaultValue="school" className="space-y-4">
        <TabsList>
          <TabsTrigger value="school"><School className="h-4 w-4 mr-1" /> School Info</TabsTrigger>
          <TabsTrigger value="site"><Globe className="h-4 w-4 mr-1" /> Website</TabsTrigger>
          <TabsTrigger value="staff-attendance"><Users className="h-4 w-4 mr-1" /> Staff Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="school"><SchoolInfoEditor /></TabsContent>
        <TabsContent value="site"><SiteSettingsEditor /></TabsContent>
        <TabsContent value="staff-attendance"><StaffAttendance /></TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsHub;