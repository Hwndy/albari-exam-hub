import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  BookOpen, 
  Calendar, 
  Users, 
  Timer, 
  FileText,
  Play,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AvailableExam {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  duration_minutes: number;
  total_questions: number;
  pass_mark: number;
  start_date?: string;
  end_date?: string;
  subject_name?: string;
  class_name?: string;
  status: 'upcoming' | 'active' | 'completed' | 'missed';
  session?: {
    id: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'expired';
    current_question_index: number;
    time_remaining_seconds: number;
    total_score?: number;
    max_score?: number;
    percentage?: number;
  };
}

export const ExamList: React.FC = () => {
  const [exams, setExams] = useState<AvailableExam[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchExams();
    }
  }, [user]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      console.log('Fetching exams for student:', user?.id);
      
      // Get student's class assignments with school filter
      const { data: classAssignments } = await 
        supabase
          .from('class_assignments')
          .select('class_id')
          .eq('student_id', user?.id)
      ;

      const classIds = classAssignments?.map(ca => ca.class_id) || [];
      console.log('Student class assignments:', classIds);

      // Fetch published exams for student's classes with school filter
      let query = 
        supabase
          .from('exams')
          .select(`
            *,
            subjects(name),
            classes(name)
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
      ;

      // Add class filtering - show exams for student's classes OR general exams (no class restriction)
      if (classIds.length > 0) {
        query = query.or(`class_id.is.null,class_id.in.(${classIds.join(',')})`);
      } else {
        // If no class assignments, show general exams (no class restriction) + debug log
        console.log('Student has no class assignments, showing general exams only');
        query = query.is('class_id', null);
      }

      const { data: examsData } = await query;

      console.log('Available exams:', examsData);

      // Fetch existing exam sessions for this student
      const { data: sessionsData } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('student_id', user?.id);

      console.log('Existing sessions:', sessionsData);

      if (examsData) {
        const currentTime = new Date();
        const formattedExams = examsData.map(exam => {
          const session = sessionsData?.find(s => s.exam_id === exam.id);
          const startDate = exam.start_date ? new Date(exam.start_date) : null;
          const endDate = exam.end_date ? new Date(exam.end_date) : null;
          
          let status: 'upcoming' | 'active' | 'completed' | 'missed' = 'active';
          
          if (session?.status === 'completed') {
            status = 'completed';
          } else if (endDate && currentTime > endDate) {
            status = 'missed';
          } else if (startDate && currentTime < startDate) {
            status = 'upcoming';
          }

          return {
            ...exam,
            subject_name: exam.subjects?.name,
            class_name: exam.classes?.name,
            status,
            session: session ? {
              id: session.id,
              status: session.status,
              current_question_index: session.current_question_index || 0,
              time_remaining_seconds: session.time_remaining_seconds || exam.duration_minutes * 60,
              total_score: session.total_score,
              max_score: session.max_score,
              percentage: session.percentage,
            } : undefined,
          };
        });
        
        setExams(formattedExams);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch exams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (examId: string) => {
    try {
      console.log('Starting exam:', examId);
      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user?.id)
        .maybeSingle();

      console.log('Existing session:', existingSession);

      if (existingSession) {
        // Auto-submit existing session and close it
        try {
          await supabase
            .from('exam_sessions')
            .update({ 
              status: 'completed',
              ended_at: new Date().toISOString() 
            })
            .eq('id', existingSession.id);
            
          toast({
            title: 'Previous Session Closed',
            description: 'Your previous exam session has been automatically closed.',
            variant: 'destructive',
          });
        } catch (error) {
          console.error('Error closing previous session:', error);
        }
        
        // Start new session - go to instructions
        window.location.href = `/exam/instructions/${examId}`;
      } else {
        // New exam - go to instructions first  
        window.location.href = `/exam/instructions/${examId}`;
      }
    } catch (error: any) {
      console.error('Error starting exam:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start exam',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'upcoming': return 'secondary';
      case 'completed': return 'outline';
      case 'missed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4" />;
      case 'upcoming': return <Calendar className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'missed': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const activeExams = exams.filter(e => e.status === 'active');
  const upcomingExams = exams.filter(e => e.status === 'upcoming');
  const completedExams = exams.filter(e => e.status === 'completed');
  const missedExams = exams.filter(e => e.status === 'missed');

  return (
    <div className="space-y-6">
      {/* Active Exams */}
      {activeExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2 text-success" />
              Available Exams ({activeExams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {activeExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors space-y-4 lg:space-y-0"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <h3 className="font-semibold text-base lg:text-lg">{exam.title}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusColor(exam.status)}>
                          {getStatusIcon(exam.status)}
                          <span className="ml-1 capitalize">{exam.status}</span>
                        </Badge>
                        {exam.session?.status === 'in_progress' && (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center lg:space-x-4 gap-2 lg:gap-0 text-sm text-muted-foreground">
                      {exam.subject_name && (
                        <span className="flex items-center">
                          <BookOpen className="h-3 w-3 mr-1 flex-shrink-0" />
                          {exam.subject_name}
                        </span>
                      )}
                      {exam.class_name && (
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                          {exam.class_name}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                        {exam.duration_minutes} minutes
                      </span>
                      <span className="flex items-center">
                        <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                        {exam.total_questions} questions
                      </span>
                    </div>
                    
                    {exam.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {exam.description}
                      </p>
                    )}
                    
                    {exam.session?.status === 'in_progress' && (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm">
                          <span>Progress: {exam.session.current_question_index + 1}/{exam.total_questions}</span>
                          <span className="flex items-center text-warning">
                            <Timer className="h-3 w-3 mr-1" />
                            {formatTimeRemaining(exam.session.time_remaining_seconds)}
                          </span>
                        </div>
                        <Progress 
                          value={(exam.session.current_question_index / exam.total_questions) * 100} 
                          className="w-full"
                        />
                      </div>
                    )}
                    
                    {exam.start_date && exam.end_date && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Available: {format(new Date(exam.start_date), 'PPP')}</span>
                        <span>Until: {format(new Date(exam.end_date), 'PPP')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 lg:ml-4">
                    <Button 
                      onClick={() => handleStartExam(exam.id)}
                      className={`w-full lg:w-auto ${exam.session?.status === 'in_progress' ? 'bg-warning hover:bg-warning/90' : ''}`}
                      size="lg"
                    >
                      {exam.session?.status === 'in_progress' ? 'Resume' : 'Start'} Exam
                    </Button>
                    {exam.pass_mark && (
                      <div className="text-xs text-center text-muted-foreground">
                        Pass: {exam.pass_mark}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              Upcoming Exams ({upcomingExams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-border rounded-lg opacity-75 space-y-4 lg:space-y-0"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <h3 className="font-semibold">{exam.title}</h3>
                      <Badge variant="secondary">
                        <Calendar className="h-3 w-3 mr-1" />
                        Upcoming
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center lg:space-x-4 gap-2 lg:gap-0 text-sm text-muted-foreground">
                      {exam.subject_name && <span>{exam.subject_name}</span>}
                      {exam.class_name && <span>{exam.class_name}</span>}
                      <span>{exam.duration_minutes} minutes</span>
                      <span>{exam.total_questions} questions</span>
                    </div>
                    
                    {exam.start_date && (
                      <div className="text-sm font-medium text-primary">
                        Starts: {format(new Date(exam.start_date), 'PPP p')}
                      </div>
                    )}
                  </div>
                  
                  <Button disabled variant="outline" className="w-full lg:w-auto" size="lg">
                    Not Yet Available
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Exams */}
      {completedExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-success" />
              Completed Exams ({completedExams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {completedExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-border rounded-lg space-y-4 lg:space-y-0"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <h3 className="font-semibold">{exam.title}</h3>
                      <Badge variant="outline">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center lg:space-x-4 gap-2 lg:gap-0 text-sm text-muted-foreground">
                      {exam.subject_name && <span>{exam.subject_name}</span>}
                      {exam.class_name && <span>{exam.class_name}</span>}
                      <span>{exam.duration_minutes} minutes</span>
                      <span>{exam.total_questions} questions</span>
                    </div>
                  </div>
                  
                  <div className="text-center lg:text-right space-y-2 lg:ml-4">
                    {exam.session?.total_score !== undefined && exam.session?.max_score !== undefined && (
                      <>
                        <div className="text-xl lg:text-2xl font-bold">
                          {exam.session.total_score}/{exam.session.max_score}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center lg:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                          <Progress 
                            value={exam.session.percentage || 0} 
                            className="w-full sm:w-20"
                          />
                          <span className="text-sm font-medium">
                            {Math.round(exam.session.percentage || 0)}%
                          </span>
                        </div>
                        <div className={`text-sm font-medium ${
                          (exam.session.percentage || 0) >= exam.pass_mark 
                            ? 'text-success' 
                            : 'text-destructive'
                        }`}>
                          {(exam.session.percentage || 0) >= exam.pass_mark ? 'Passed' : 'Failed'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Exams Message */}
      {exams.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Exams Available</h3>
            <p className="text-muted-foreground">
              There are currently no exams available for you. Please check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};