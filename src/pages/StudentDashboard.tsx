import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Trophy, Clock, TrendingUp } from 'lucide-react';
import { ExamList } from '@/components/student/ExamList';
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
        // Get available exams count
        const { data: classAssignments } = await supabase
          .from('class_assignments')
          .select('class_id')
          .eq('student_id', user.id);

        const classIds = classAssignments?.map(ca => ca.class_id) || [];

        const { data: availableExams } = await supabase
          .from('exams')
          .select('id')
          .eq('status', 'published')
          .or(`class_id.is.null,class_id.in.(${classIds.join(',')})`);

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
          availableExams: availableExams?.length || 0,
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.availableExams}</p>
                  <p className="text-sm text-muted-foreground">Available Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedExams}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalStudyTime} min</p>
                  <p className="text-sm text-muted-foreground">Study Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exam List Component */}
        <ExamList />
      </div>
    </DashboardLayout>
  );
};