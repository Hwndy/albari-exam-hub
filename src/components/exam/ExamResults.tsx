import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Target,
  BookOpen,
  TrendingUp,
  Download,
  Home,
  RotateCcw
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExamResult {
  session_id: string;
  exam_title: string;
  subject_name?: string;
  total_questions: number;
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  pass_mark: number;
  time_spent: number;
  duration_minutes: number;
  completed_at: string;
  correct_answers: number;
  incorrect_answers: number;
  unanswered: number;
}

export const ExamResults: React.FC = () => {
  const [results, setResults] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const sessionId = searchParams.get('session');

  useEffect(() => {
    if (sessionId) {
      fetchResults();
    } else {
      navigate('/student');
    }
  }, [sessionId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // Ensure the score is calculated first
      await supabase.rpc('calculate_exam_score', {
        session_id_param: sessionId
      });
      
      // Fetch session with exam details
      const { data: sessionData, error: sessionError } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          exams (
            title,
            total_questions,
            duration_minutes,
            pass_mark,
            subjects(name)
          )
        `)
        .eq('id', sessionId)
        .eq('student_id', user?.id)
        .eq('status', 'completed')
        .single();

      if (sessionError) throw sessionError;

      // Fetch question responses for detailed analysis
      const { data: responses, error: responsesError } = await supabase
        .from('question_responses')
        .select('is_correct, time_spent_seconds')
        .eq('session_id', sessionId);

      if (responsesError) throw responsesError;

      const correctAnswers = responses?.filter(r => r.is_correct).length || 0;
      const totalResponses = responses?.length || 0;
      const incorrectAnswers = totalResponses - correctAnswers;
      const unanswered = sessionData.exams.total_questions - totalResponses;
      const totalTimeSpent = responses?.reduce((acc, r) => acc + (r.time_spent_seconds || 0), 0) || 0;

      setResults({
        session_id: sessionData.id,
        exam_title: sessionData.exams.title,
        subject_name: sessionData.exams.subjects?.name,
        total_questions: sessionData.exams.total_questions,
        total_score: sessionData.total_score || 0,
        max_score: sessionData.max_score || sessionData.exams.total_questions,
        percentage: sessionData.percentage || 0,
        passed: sessionData.passed || false,
        pass_mark: sessionData.exams.pass_mark,
        time_spent: totalTimeSpent,
        duration_minutes: sessionData.exams.duration_minutes,
        completed_at: sessionData.ended_at || sessionData.updated_at,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load exam results',
        variant: 'destructive',
      });
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getPerformanceMessage = (percentage: number, passed: boolean) => {
    if (passed) {
      if (percentage >= 90) return { message: "Excellent work! Outstanding performance!", color: "text-success" };
      if (percentage >= 80) return { message: "Great job! Well done!", color: "text-success" };
      if (percentage >= 70) return { message: "Good work! You passed!", color: "text-success" };
      return { message: "You passed! Keep improving!", color: "text-success" };
    } else {
      return { message: "Keep studying and try again!", color: "text-destructive" };
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading results...</div>;
  }

  if (!results) {
    return <div className="flex justify-center items-center min-h-screen">Results not found</div>;
  }

  const performance = getPerformanceMessage(results.percentage, results.passed);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {results.passed ? (
                <CheckCircle2 className="h-20 w-20 text-success" />
              ) : (
                <XCircle className="h-20 w-20 text-destructive" />
              )}
            </div>
            <CardTitle className="text-3xl">
              {results.passed ? 'Congratulations!' : 'Exam Completed'}
            </CardTitle>
            <p className={`text-lg ${performance.color}`}>
              {performance.message}
            </p>
          </CardHeader>
        </Card>

        {/* Overall Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Your Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold">
                {Math.round(results.percentage)}%
              </div>
              <div className="text-lg text-muted-foreground">
                {results.total_score} out of {results.max_score} points
              </div>
              <Progress value={results.percentage} className="w-full h-3" />
              <div className="flex justify-center">
                <Badge 
                  variant={results.passed ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {results.passed ? 'PASSED' : 'FAILED'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exam Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exam Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Exam:</span>
                <span className="font-medium">{results.exam_title}</span>
              </div>
              {results.subject_name && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subject:</span>
                  <Badge variant="secondary">{results.subject_name}</Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pass Mark:</span>
                <span className="font-medium">{results.pass_mark}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-medium">
                  {format(new Date(results.completed_at), 'PPP p')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Time Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time Allowed:</span>
                <span className="font-medium">{results.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time Used:</span>
                <span className="font-medium">{formatTime(results.time_spent)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Efficiency:</span>
                <span className="font-medium">
                  {Math.round((results.time_spent / (results.duration_minutes * 60)) * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Question Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-success">{results.correct_answers}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
                <Progress value={(results.correct_answers / results.total_questions) * 100} className="w-full" />
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-destructive">{results.incorrect_answers}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
                <Progress value={(results.incorrect_answers / results.total_questions) * 100} className="w-full" />
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-muted-foreground">{results.unanswered}</div>
                <div className="text-sm text-muted-foreground">Unanswered</div>
                <Progress value={(results.unanswered / results.total_questions) * 100} className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/student')} className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <Button variant="outline" onClick={() => window.print()} className="flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Print Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};