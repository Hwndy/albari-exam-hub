import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Trophy, Clock, TrendingUp, Calendar, Library, FileText, ClipboardList, NotebookPen } from 'lucide-react';
import { ExamList } from '@/components/student/ExamList';
import { StudentTimetable } from '@/components/student/StudentTimetable';
import { LibraryCatalog } from '@/components/student/LibraryCatalog';
import { StudentReportCards } from '@/components/student/StudentReportCards';
import { StudentAssignments } from '@/components/student/StudentAssignments';
import { StudentLessonNotes } from '@/components/student/StudentLessonNotes';
import { ProfileCompletionPrompt } from '@/components/student/ProfileCompletionPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const StudentDashboard = () => {
  const [stats, setStats] = useState({
    availableExams: 0,
    completedExams: 0,
    averageScore: 0,
    totalStudyTime: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Get available exams count - should match ExamList logic
        const { data: classAssignments } = await supabase
          .from('class_assignments')
          .select('class_id')
          .eq('student_id', user.id);

        const classIds = classAssignments?.map(ca => ca.class_id) || [];

        // Fetch published exams - same logic as ExamList
        let availableQuery = supabase
          .from('exams')
          .select('id, start_date, end_date')
          .eq('status', 'published');

        // Add class filtering only if student has class assignments
        if (classIds.length > 0) {
          availableQuery = availableQuery.or(`class_id.is.null,class_id.in.(${classIds.join(',')})`);
        } else {
          // If no class assignments, only show exams without class restrictions
          availableQuery = availableQuery.is('class_id', null);
        }

        const { data: availableExams } = await availableQuery;

        // Filter to only count active exams (not upcoming/missed)
        const currentTime = new Date();
        const activeExams = availableExams?.filter(exam => {
          const startDate = exam.start_date ? new Date(exam.start_date) : null;
          const endDate = exam.end_date ? new Date(exam.end_date) : null;
          
          // Active if: no end date or end date is future, AND no start date or start date is past
          const notExpired = !endDate || currentTime <= endDate;
          const notUpcoming = !startDate || currentTime >= startDate;
          
          return notExpired && notUpcoming;
        }) || [];

        // Get completed exams and calculate average
        const { data: completedSessions } = await supabase
          .from('exam_sessions')
          .select(`
            total_score, 
            max_score, 
            percentage, 
            started_at, 
            ended_at,
            time_remaining_seconds,
            question_responses(time_spent_seconds)
          `)
          .eq('student_id', user.id)
          .eq('status', 'completed');

        const completedCount = completedSessions?.length || 0;
        
        // Calculate proper average score based on actual scores
        const validSessions = completedSessions?.filter(s => s.percentage !== null) || [];
        const averageScore = validSessions.length > 0 
          ? Math.round(validSessions.reduce((sum, session) => sum + (session.percentage || 0), 0) / validSessions.length)
          : 0;

        // Calculate total study time from actual session data
        const totalStudyTime = completedSessions?.reduce((total, session) => {
          if (session.started_at && session.ended_at) {
            const sessionTime = Math.floor((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / (1000 * 60));
            return total + sessionTime;
          }
          // Fallback to question response times
          const responseTime = session.question_responses?.reduce((sum: number, r: any) => sum + (r.time_spent_seconds || 0), 0) || 0;
          return total + Math.floor(responseTime / 60);
        }, 0) || 0;

        setStats({
          availableExams: activeExams.length,
          completedExams: completedCount,
          averageScore,
          totalStudyTime
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user]);
  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-8">
        <ProfileCompletionPrompt />

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.availableExams}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Available Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="p-1.5 sm:p-2 bg-success/10 rounded-lg flex-shrink-0">
                  <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.completedExams}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="p-1.5 sm:p-2 bg-warning/10 rounded-lg flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.averageScore}%</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="p-1.5 sm:p-2 bg-accent/10 rounded-lg flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalStudyTime} min</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Study Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="exams" className="w-full">
          <div className="overflow-x-auto mb-6">
            <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
              <TabsTrigger value="exams" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <BookOpen className="h-4 w-4 mr-1 hidden sm:inline" />
                Exams
              </TabsTrigger>
              <TabsTrigger value="timetable" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
                Timetable
              </TabsTrigger>
              <TabsTrigger value="library" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <Library className="h-4 w-4 mr-1 hidden sm:inline" />
                Library
              </TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <ClipboardList className="h-4 w-4 mr-1 hidden sm:inline" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <NotebookPen className="h-4 w-4 mr-1 hidden sm:inline" />
                Lesson Notes
              </TabsTrigger>
              <TabsTrigger value="report-cards" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
                Report Cards
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="exams">
            <ExamList />
          </TabsContent>

          <TabsContent value="timetable">
            <StudentTimetable />
          </TabsContent>

          <TabsContent value="library">
            <LibraryCatalog />
          </TabsContent>

          <TabsContent value="assignments">
            <StudentAssignments />
          </TabsContent>

          <TabsContent value="notes">
            <StudentLessonNotes />
          </TabsContent>

          <TabsContent value="report-cards">
            <StudentReportCards />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};