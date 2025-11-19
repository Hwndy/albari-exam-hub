import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuperAdminSidebar } from '@/components/ui/super-admin-sidebar';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Users, TrendingUp, Activity, LogOut } from 'lucide-react';
import { SchoolManagement } from '@/components/admin/SchoolManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { EmailLogsViewer } from '@/components/admin/EmailLogsViewer';
import { EnhancedAuditLogs } from '@/components/admin/EnhancedAuditLogs';
import { AdmissionAnalytics } from '@/components/admin/AdmissionAnalytics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdminStats {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
}

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<SuperAdminStats>({
    totalSchools: 0,
    activeSchools: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);

      const [schoolsResult, rolesResult] = await Promise.all([
        supabase.from('schools').select('id, is_active'),
        supabase.from('user_roles').select('role'),
      ]);

      const totalSchools = schoolsResult.data?.length || 0;
      const activeSchools = schoolsResult.data?.filter(s => s.is_active).length || 0;
      
      const roles = rolesResult.data || [];
      const totalUsers = roles.length;
      const totalStudents = roles.filter(r => r.role === 'student').length;
      const totalTeachers = roles.filter(r => r.role === 'teacher').length;
      const totalAdmins = roles.filter(r => r.role === 'admin').length;

      setStats({
        totalSchools,
        activeSchools,
        totalUsers,
        totalStudents,
        totalTeachers,
        totalAdmins,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch statistics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    const subtab = searchParams.get('subtab');
    
    switch (activeTab) {
      case 'schools':
        return <SchoolManagement />;
      
      case 'users':
        return <UserManagement />;
      
      case 'analytics':
        return <AdmissionAnalytics />;
      
      case 'logs':
        if (subtab === 'email-logs') {
          return <EmailLogsViewer />;
        }
        if (subtab === 'audit-logs') {
          return <EnhancedAuditLogs />;
        }
        return (
          <Tabs defaultValue="email-logs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="email-logs">Email Logs</TabsTrigger>
              <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="email-logs">
              <EmailLogsViewer />
            </TabsContent>
            <TabsContent value="audit-logs">
              <EnhancedAuditLogs />
            </TabsContent>
          </Tabs>
        );
      
      case 'overview':
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h2>
              <p className="text-muted-foreground mt-1">
                System-wide overview and management
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSchools}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeSchools} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all schools
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalTeachers} teachers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Admins</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAdmins}</div>
                  <p className="text-xs text-muted-foreground">
                    School administrators
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Use the sidebar to navigate to school management, user management, or view system-wide reports.
                </p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Logo size="sm" />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Super Admin</Badge>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
