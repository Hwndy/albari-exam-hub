import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/ui/admin-sidebar';
import { findNavLocation } from '@/components/ui/admin-sidebar';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Users, School, FileText, Shield, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';
import { SubjectManagement } from '@/components/admin/SubjectManagement';
import { EnhancedLiveMonitor } from '@/components/admin/EnhancedLiveMonitor';
import { AdminQuestionBank } from '@/components/admin/AdminQuestionBank';
import { ExamManagement } from '@/components/admin/ExamManagement';
import { AdminStudentResults } from '@/components/admin/AdminStudentResults';
import { AdminResultsModal } from '@/components/admin/AdminResultsModal';
import { AdmissionsHub, type AdmissionTab } from '@/components/admin/admissions/AdmissionsHub';
import { EmailLogsViewer } from '@/components/admin/EmailLogsViewer';
import { EmailTestingPanel } from '@/components/admin/EmailTestingPanel';
import { NewsManager } from '@/components/admin/CMS/NewsManager';
import { GalleryManager } from '@/components/admin/CMS/GalleryManager';
import { TestimonialManager } from '@/components/admin/CMS/TestimonialManager';
import { SchoolInfoEditor } from '@/components/admin/CMS/SchoolInfoEditor';
import { SiteSettingsEditor } from '@/components/admin/CMS/SiteSettingsEditor';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FinanceHub } from '@/components/admin/finance/FinanceHub';
import { TimetableManager } from '@/components/admin/TimetableManager';
import { ReportCardGenerator } from '@/components/admin/ReportCardGenerator';
import { ResultsManagement } from '@/components/admin/results/ResultsManagement';
import { LibraryManager } from '@/components/admin/LibraryManager';
import { BulkNotificationSender } from '@/components/admin/BulkNotificationSender';
import { IDCardGenerator } from '@/components/admin/IDCardGenerator';
import { StudentsHub } from '@/components/admin/students/StudentsHub';
import { StudentDetail } from '@/components/admin/StudentDetail';
import { ParentsHub } from '@/components/admin/parents/ParentsHub';
import { ScanStation } from '@/components/attendance/ScanStation';
import { StaffIDCardGenerator } from '@/components/admin/StaffIDCardGenerator';
import { AnnouncementsComposer } from '@/components/admin/AnnouncementsComposer';
import { SettingsHub } from '@/components/admin/SettingsHub';
import { AttendanceReports } from '@/components/admin/attendance/AttendanceReports';
import { LeaveManagement } from '@/components/admin/hr/LeaveManagement';
import { PayrollHub } from '@/components/admin/hr/PayrollHub';
import { StaffManagement } from '@/components/admin/StaffManagement';
import { StaffAttendance } from '@/components/admin/StaffAttendance';
import { CareersManager } from '@/components/admin/hr/CareersManager';
import { TransportHub } from '@/components/admin/transport/TransportHub';
import { AssetsHub } from '@/components/admin/assets/AssetsHub';
import { HostelHub } from '@/components/admin/hostel/HostelHub';
import { GlobalSearch } from '@/components/admin/GlobalSearch';

import AdminOverview from '@/components/admin/overview/AdminOverview';

export const AdminDashboard = () => {
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';
  const activeSubTab = searchParams.get('subtab');




  // Breadcrumb + page title derived from the single navigation map in the sidebar.
  const navLocation = findNavLocation(activeTab, activeSubTab);
  const breadcrumb = {
    section: navLocation?.section ?? 'Admin',
    group: navLocation?.leaf ? navLocation.item.title : undefined,
    title: navLocation?.leaf?.title ?? navLocation?.item.title ?? 'Admin Dashboard',
  };

  const renderContent = () => {
    if (activeTab === 'overview') {
      return <AdminOverview />;
    }



    if (activeTab === 'admissions') {
      const subToTab: Record<string, AdmissionTab> = {
        sessions: 'sessions',
        payments: 'payments',
        'entrance-exams': 'exams',
        decisions: 'pipeline',
        analytics: 'analytics',
        interviews: 'interviews',
        applications: 'applications',
      };
      const initial = subToTab[activeSubTab || ''] ?? 'applications';
      return <AdmissionsHub initialTab={initial} />;
    }

    if (activeTab === 'academic') {
      switch (activeSubTab) {
        case 'results': return <AdminStudentResults />;
        case 'questions': return <AdminQuestionBank />;
        case 'classes': return <ClassManagement />;
        case 'students': return <StudentsHub />;
        case 'student-detail': return <StudentDetail />;
        case 'subjects': return <SubjectManagement />;
        case 'timetable': return <TimetableManager />;
        case 'report-cards': return <ReportCardGenerator />;
        default: return <ExamManagement />;
      }
    }

    if (activeTab === 'results-mgmt') {
      return <ResultsManagement />;
    }

    if (activeTab === 'fees') {
      return <FinanceHub subtab={activeSubTab} />;
    }

    if (activeTab === 'library') {
      return <LibraryManager />;
    }

    if (activeTab === 'notifications') {
      return <BulkNotificationSender />;
    }

    if (activeTab === 'id-cards') {
      switch (activeSubTab) {
        case 'staff': return <StaffIDCardGenerator />;
        case 'students':
        default: return <IDCardGenerator />;
      }
    }

    if (activeTab === 'announcements') {
      return <AnnouncementsComposer />;
    }

    if (activeTab === 'settings') {
      return <SettingsHub />;
    }

    if (activeTab === 'attendance-scan') {
      return <ScanStation />;
    }

    if (activeTab === 'attendance-reports') {
      return <AttendanceReports />;
    }

    if (activeTab === 'transport') return <TransportHub />;
    if (activeTab === 'assets') return <AssetsHub />;
    if (activeTab === 'hostel') return <HostelHub subtab={activeSubTab} />;
    if (activeTab === 'hr') {
      switch (activeSubTab) {
        case 'staff': return <StaffManagement />;
        case 'staff-attendance': return <StaffAttendance />;
        case 'payroll': return <PayrollHub />;
        case 'careers': return <CareersManager />;
        default: return <LeaveManagement />;
      }
    }

    if (activeTab === 'users') {
      return <UserManagement />;
    }

    if (activeTab === 'parents') {
      return <ParentsHub />;
    }

    if (activeTab === 'website') {
      switch (activeSubTab) {
        case 'gallery': return <GalleryManager />;
        case 'testimonials': return <TestimonialManager />;
        case 'school-info': return <SchoolInfoEditor />;
        case 'site-settings': return <SiteSettingsEditor />;
        default: return <NewsManager />;
      }
    }

    if (activeTab === 'system') {
      switch (activeSubTab) {
        case 'monitor-logs': return <EnhancedLiveMonitor />;
        case 'results-modal': 
          return (
            <>
              <AdminResultsModal open={resultsModalOpen} onOpenChange={setResultsModalOpen} />
              {!resultsModalOpen && (
                <div className="flex items-center justify-center py-12">
                  <Button onClick={() => setResultsModalOpen(true)} size="lg">
                    View All Exam Results
                  </Button>
                </div>
              )}
            </>
          );
        default: 
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <EmailLogsViewer />
              </div>
              <div>
                <EmailTestingPanel />
              </div>
            </div>
          );
      }
    }

    return null;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <GlobalSearch />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex items-center justify-between gap-3 px-4 lg:px-6 h-14">
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger />
                <Logo size="sm" showText={false} className="hidden sm:flex shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
                    {breadcrumb.section}
                    {breadcrumb.group ? ` › ${breadcrumb.group}` : ''}
                  </p>
                  <h1 className="text-base font-semibold leading-tight truncate">{breadcrumb.title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[200px]">
                  {user?.email}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 lg:p-6 space-y-6">
              {/* Compact KPI row — only on Overview */}

              {/* Content */}
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
