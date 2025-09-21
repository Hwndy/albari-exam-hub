import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, School, FileText, Shield, BookOpen, Clock, TrendingUp, Plus } from 'lucide-react';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';
import { SubjectManagement } from '@/components/admin/SubjectManagement';
import { AuditLogs } from '@/components/admin/AuditLogs';
import { EnhancedAuditLogs } from '@/components/admin/EnhancedAuditLogs';
import { LiveExamMonitor } from '@/components/admin/LiveExamMonitor';
import { EnhancedLiveMonitor } from '@/components/admin/EnhancedLiveMonitor';
import { AdminQuestionBank } from '@/components/admin/AdminQuestionBank';
import { EnhancedQuestionCreator } from '@/components/admin/EnhancedQuestionCreator';
import { ConsolidatedExamCreator } from '@/components/shared/ConsolidatedExamCreator';
import { ExamManagement } from '@/components/admin/ExamManagement';
import { AdminStudentResults } from '@/components/admin/AdminStudentResults';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch stats in parallel
      const [
        profilesResult,
        classesResult,
        subjectsResult,
        examsResult,
        questionsResult,
        sessionsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('classes').select('id'),
        supabase.from('subjects').select('id'),
        supabase.from('exams').select('id, status'),
        supabase.from('questions').select('id'),
        supabase.from('exam_sessions').select('id, status'),
      ]);

      // Calculate stats
      const profiles = profilesResult.data || [];
      const totalStudents = profiles.filter(p => p.role === 'student').length;
      const totalTeachers = profiles.filter(p => p.role === 'teacher').length;
      
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

      // Fetch recent exams with details
      const { data: recentExamsData } = await supabase
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

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Shield className="h-6 w-6 text-emerald-600" />
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
                <div className="p-2 bg-orange-100 rounded-lg">
                  <School className="h-6 w-6 text-orange-600" />
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
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
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
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
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
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? '...' : stats.activeSessions}</p>
                  <p className="text-sm text-muted-foreground">Live Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="exams" className="text-xs sm:text-sm">Exams</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="classes" className="text-xs sm:text-sm">Classes</TabsTrigger>
            <TabsTrigger value="subjects" className="text-xs sm:text-sm">Subjects</TabsTrigger>
            <TabsTrigger value="questions" className="text-xs sm:text-sm">Questions</TabsTrigger>
            <TabsTrigger value="monitor-logs" className="text-xs sm:text-sm">Monitor & Logs</TabsTrigger>
          </TabsList>

          {/* Exams Tab */}
          <TabsContent value="exams" className="space-y-6">
            <ConsolidatedExamCreator
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Exam
                </Button>
              }
              onExamCreated={fetchDashboardData}
            />
            <ExamManagement />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Exams</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>{exam.subject}</span>
                              <span>•</span>
                              <span>{exam.class}</span>
                              <span>•</span>
                              <span>{exam.duration_minutes} minutes</span>
                              <span>•</span>
                              <span>{exam.total_questions} questions</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                                {exam.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Created: {new Date(exam.created_at).toLocaleDateString()}
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
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <ClassManagement />
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <SubjectManagement />
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            <AdminQuestionBank />
            <EnhancedQuestionCreator />
          </TabsContent>

          {/* Combined Monitor & Logs Tab */}
          <TabsContent value="monitor-logs" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Live Monitor</CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedLiveMonitor />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedAuditLogs />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};