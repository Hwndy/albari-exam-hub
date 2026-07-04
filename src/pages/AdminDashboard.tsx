import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/ui/admin-sidebar';
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
import { FeeManagement } from '@/components/admin/SMS/FeeManagement';
import { TimetableManager } from '@/components/admin/TimetableManager';
import { ReportCardGenerator } from '@/components/admin/ReportCardGenerator';
import { ResultsManagement } from '@/components/admin/results/ResultsManagement';
import { LibraryManager } from '@/components/admin/LibraryManager';
import { BulkNotificationSender } from '@/components/admin/BulkNotificationSender';
import { IDCardGenerator } from '@/components/admin/IDCardGenerator';
import { StudentsByClass } from '@/components/admin/StudentsByClass';
import { StudentDetail } from '@/components/admin/StudentDetail';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  totalExams: number;
  activeExams: number;
  totalQuestions: number;
  activeSessions: number;
}

interface RecentExam {
  id: string;
  title: string;
  subject: string;
  class: string;
  status: string;
  created_at: string;
  duration_minutes: number;
  total_questions: number;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    totalExams: 0,
    activeExams: 0,
    totalQuestions: 0,
    activeSessions: 0,
  });
  
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';
  const activeSubTab = searchParams.get('subtab');

  useEffect(() => {
    // Wait for undefined to be loaded before fetching data
    // undefined will be null for super admins (intentional - they see all)
    // undefined will be set for school admins (they see only their school)
  }, [false]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch stats in parallel, filtered by school
      // For user_roles, we need to join through profiles to filter by school_id
      const profilesQuery = supabase
        .from('profiles')
        .select('user_id');
      const schoolProfiles = await profilesQuery;
      const schoolUserIds = schoolProfiles.data?.map(p => p.user_id) || [];
      
      const [
        rolesResult,
        classesResult,
        subjectsResult,
        examsResult,
        questionsResult,
        sessionsResult,
      ] = await Promise.all([
        schoolUserIds.length > 0 
          ? supabase.from('user_roles').select('role').in('user_id', schoolUserIds)
          : Promise.resolve({ data: [] }),
        supabase.from('classes').select('id'),
        supabase.from('subjects').select('id'),
        supabase.from('exams').select('id, status'),
        supabase.from('questions').select('id'),
        supabase.from('exam_sessions').select('id, status'),
      ]);

      // Calculate stats
      const roles = rolesResult.data || [];
      const totalStudents = roles.filter(r => r.role === 'student').length;
      const totalTeachers = roles.filter(r => r.role === 'teacher').length;
      
      const exams = examsResult.data || [];
      const activeExams = exams.filter(e => e.status === 'published').length;
      
      const sessions = sessionsResult.data || [];
      const activeSessions = sessions.filter(s => s.status === 'in_progress').length;

      setStats({
        totalStudents,
        totalTeachers,
        totalClasses: classesResult.data?.length || 0,
        totalSubjects: subjectsResult.data?.length || 0,
        totalExams: exams.length,
        activeExams,
        totalQuestions: questionsResult.data?.length || 0,
        activeSessions,
      });

      // Fetch recent exams with details, filtered by school
      const recentExamsQuery = supabase
        .from('exams')
        .select(`
          id,
          title,
          status,
          created_at,
          duration_minutes,
          total_questions,
          subjects(name),
          classes(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentExamsData } = await recentExamsQuery;

      if (recentExamsData) {
        const formattedExams = recentExamsData.map((exam: any) => ({
          id: exam.id,
          title: exam.title,
          subject: exam.subjects?.name || 'N/A',
          class: exam.classes?.name || 'N/A',
          status: exam.status,
          created_at: exam.created_at,
          duration_minutes: exam.duration_minutes,
          total_questions: exam.total_questions,
        }));
        setRecentExams(formattedExams);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while school context is initializing
  const getPageTitle = () => {
    if (activeTab === 'overview') return 'Dashboard Overview';
    if (activeTab === 'admissions') {
      const titles: Record<string, string> = {
        'applications': 'Admission Applications',
        'sessions': 'Admission Sessions',
        'payments': 'Payment Verification',
        'entrance-exams': 'Entrance Exams',
        'decisions': 'Decision Board',
        'analytics': 'Admission Analytics',
      };
      return titles[activeSubTab || 'applications'] || 'Admissions';
    }
    if (activeTab === 'academic') {
      const titles: Record<string, string> = {
        'exams': 'Exam Management',
        'results': 'Student Results',
        'questions': 'Question Bank',
        'classes': 'Class Management',
        'students': 'Students',
        'subjects': 'Subject Management',
        'timetable': 'Timetable Management',
        'report-cards': 'Report Cards',
      };
      return titles[activeSubTab || 'exams'] || 'Academic';
    }
    if (activeTab === 'fees') return 'Fee Management';
    if (activeTab === 'library') return 'Library Management';
    if (activeTab === 'notifications') return 'Bulk Notifications';
    if (activeTab === 'id-cards') return 'Student ID Cards';
    if (activeTab === 'users') return 'User Management';
    if (activeTab === 'website') {
      const titles: Record<string, string> = {
        'news': 'News & Articles',
        'gallery': 'Gallery Manager',
        'testimonials': 'Testimonials',
        'school-info': 'School Information',
        'site-settings': 'Site Settings',
      };
      return titles[activeSubTab || 'news'] || 'Website CMS';
    }
    if (activeTab === 'system') {
      const titles: Record<string, string> = {
        'email-logs': 'Email Logs',
        'monitor-logs': 'Live Monitor',
        'results-modal': 'All Results',
      };
      return titles[activeSubTab || 'email-logs'] || 'System';
    }
    return 'Admin Dashboard';
  };

  const renderContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Exams</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentExams.length > 0 ? (
                <div className="space-y-4">
                  {recentExams.map((exam) => (
                    <Card key={exam.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{exam.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{exam.subject}</span>
                            <span>•</span>
                            <span>{exam.class}</span>
                            <span>•</span>
                            <span>{exam.duration_minutes} min</span>
                            <span>•</span>
                            <span>{exam.total_questions} questions</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                              {exam.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(exam.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent exams found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
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
        case 'students': return <StudentsByClass />;
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
      return <FeeManagement />;
    }

    if (activeTab === 'library') {
      return <LibraryManager />;
    }

    if (activeTab === 'notifications') {
      return <BulkNotificationSender />;
    }

    if (activeTab === 'id-cards') {
      return <IDCardGenerator />;
    }

    if (activeTab === 'users') {
      return <UserManagement />;
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
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b bg-card">
            <div className="flex items-center justify-between px-4 lg:px-6 py-3">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Logo className="h-8" />
                <h1 className="hidden sm:block text-lg font-semibold">{getPageTitle()}</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline text-sm text-muted-foreground">{user?.email}</span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 lg:p-6 space-y-6">
              {/* Stats Grid - Only on Overview */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{isLoading ? '...' : stats.totalStudents}</p>
                          <p className="text-sm text-muted-foreground">Students</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                          <Shield className="h-6 w-6 text-secondary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{isLoading ? '...' : stats.totalTeachers}</p>
                          <p className="text-sm text-muted-foreground">Teachers</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <School className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{isLoading ? '...' : stats.totalClasses}</p>
                          <p className="text-sm text-muted-foreground">Classes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{isLoading ? '...' : stats.totalSubjects}</p>
                          <p className="text-sm text-muted-foreground">Subjects</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                          <FileText className="h-6 w-6 text-secondary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{isLoading ? '...' : `${stats.activeExams}/${stats.totalExams}`}</p>
                          <p className="text-sm text-muted-foreground">Active Exams</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{isLoading ? '...' : stats.totalQuestions}</p>
                          <p className="text-sm text-muted-foreground">Questions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{isLoading ? '...' : stats.activeSessions}</p>
                          <p className="text-sm text-muted-foreground">Live Sessions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Content */}
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
