import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, FileText, Plus, ClipboardCheck, Calculator, Loader2, Calendar } from 'lucide-react';
import { ConsolidatedExamCreator } from '@/components/shared/ConsolidatedExamCreator';
import { TeacherExamBuilder } from '@/components/teacher/TeacherExamBuilder';
import { EnhancedExamResults } from '@/components/teacher/EnhancedExamResults';
import { TeacherStudentCreator } from '@/components/teacher/TeacherStudentCreator';
import { TeacherClassAssignment } from '@/components/admin/TeacherClassAssignment';
import { AttendanceSystem } from '@/components/teacher/AttendanceSystem';
import { GradebookSystem } from '@/components/teacher/GradebookSystem';
import { TeacherTimetable } from '@/components/teacher/TeacherTimetable';
import { TeacherResultsManagement } from '@/components/teacher/TeacherResultsManagement';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TeacherStats {
  totalExams: number;
  questionsBank: number;
  studentSubmissions: number;
  isLoading: boolean;
}

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TeacherStats>({
    totalExams: 0,
    questionsBank: 0,
    studentSubmissions: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (user?.id) {
      fetchTeacherStats();
    }
  }, [user?.id]);

  const fetchTeacherStats = async () => {
    if (!user?.id) return;

    try {
      // Fetch exams created by this teacher
      const examsQuery = supabase
        .from('exams')
        .select('id', { count: 'exact' })
        .eq('created_by', user.id);
      
      const { count: examCount } = await examsQuery;

      // Fetch questions created by this teacher
      const questionsQuery = supabase
        .from('questions')
        .select('id', { count: 'exact' })
        .eq('created_by', user.id);
      
      const { count: questionCount } = await questionsQuery;

      // Fetch exam sessions (submissions) for this teacher's exams
      const { data: teacherExams } = await 
        supabase
          .from('exams')
          .select('id')
          .eq('created_by', user.id)
      ;

      let submissionCount = 0;
      if (teacherExams && teacherExams.length > 0) {
        const examIds = teacherExams.map(e => e.id);
        const { count } = await supabase
          .from('exam_sessions')
          .select('id', { count: 'exact' })
          .in('exam_id', examIds)
          .eq('status', 'completed');
        
        submissionCount = count || 0;
      }

      setStats({
        totalExams: examCount || 0,
        questionsBank: questionCount || 0,
        studentSubmissions: submissionCount,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {stats.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.totalExams}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  {stats.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.questionsBank}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Questions Bank</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  {stats.isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.studentSubmissions}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Student Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="exams" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
              <TabsTrigger value="exams" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">My Exams</TabsTrigger>
              <TabsTrigger value="results" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Student Results</TabsTrigger>
              <TabsTrigger value="timetable" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
                Timetable
              </TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <ClipboardCheck className="h-4 w-4 mr-1 hidden sm:inline" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="gradebook" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <Calculator className="h-4 w-4 mr-1 hidden sm:inline" />
                Gradebook
              </TabsTrigger>
              <TabsTrigger value="results-mgmt" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
                Results Management
              </TabsTrigger>
              <TabsTrigger value="students" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Create Student</TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Class Assignments</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="exams" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">My Exams</h2>
              <ConsolidatedExamCreator
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Exam
                  </Button>
                }
                isTeacher={true}
                onExamCreated={() => {
                  fetchTeacherStats();
                  window.location.reload();
                }}
              />
            </div>
            <TeacherExamBuilder />
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Student Results</h2>
            </div>
            <EnhancedExamResults />
          </TabsContent>

          <TabsContent value="timetable" className="space-y-4">
            <TeacherTimetable />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <AttendanceSystem />
          </TabsContent>

          <TabsContent value="gradebook" className="space-y-4">
            <GradebookSystem />
          </TabsContent>

          <TabsContent value="results-mgmt" className="space-y-4">
            <TeacherResultsManagement />
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Create Students</h2>
            </div>
            <TeacherStudentCreator />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Teacher Class Assignments</h2>
            </div>
            <TeacherClassAssignment teacherId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
