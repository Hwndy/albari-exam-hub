import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  BookOpen,
  Users,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ExamData {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  duration_minutes: number;
  total_questions: number;
  pass_mark: number;
  subject_name?: string;
  class_name?: string;
  allow_review: boolean;
  show_results_immediately: boolean;
  randomize_questions: boolean;
  shuffle_answers: boolean;
}

export const ExamInstructionsPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  const fetchExamData = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects(name),
          classes(name)
        `)
        .eq('id', examId)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      if (data) {
        setExam({
          ...data,
          subject_name: data.subjects?.name,
          class_name: data.classes?.name,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load exam details',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!exam || !user || !agreedToTerms) return;

    try {
      setStarting(true);

      // Create new exam session
      const { data: session, error } = await supabase
        .from('exam_sessions')
        .insert({
          exam_id: exam.id,
          student_id: user.id,
          status: 'not_started',
          time_remaining_seconds: exam.duration_minutes * 60,
          current_question_index: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to exam interface
      navigate(`/exam?session=${session.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start exam',
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Exam Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested exam could not be found or is no longer available.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="space-y-2">
              <Badge variant="secondary" className="mx-auto">
                <BookOpen className="h-3 w-3 mr-1" />
                Exam Instructions
              </Badge>
              <CardTitle className="text-2xl">{exam.title}</CardTitle>
              {exam.description && (
                <p className="text-muted-foreground">{exam.description}</p>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Exam Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{exam.duration_minutes} minutes</p>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{exam.total_questions} questions</p>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-accent/50 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{exam.pass_mark}%</p>
                  <p className="text-sm text-muted-foreground">Pass Mark</p>
                </div>
              </div>
            </div>

            {exam.subject_name && exam.class_name && (
              <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {exam.subject_name}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {exam.class_name}
                </span>
              </div>
            )}

            <Separator />

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-warning" />
                Important Instructions
              </h3>
              
              <div className="bg-accent/30 p-4 rounded-lg space-y-3 text-sm">
                {exam.instructions && (
                  <div>
                    <h4 className="font-medium mb-2">Exam-Specific Instructions:</h4>
                    <p className="text-muted-foreground">{exam.instructions}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium mb-2">General Guidelines:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Ensure you have a stable internet connection</li>
                    <li>• Do not refresh or close the browser tab during the exam</li>
                    <li>• Answer all questions before submitting</li>
                    <li>• The timer will start immediately when you begin</li>
                    {exam.randomize_questions && <li>• Questions will be presented in random order</li>}
                    {exam.shuffle_answers && <li>• Answer choices will be shuffled</li>}
                    {exam.allow_review && <li>• You can review and change your answers before submitting</li>}
                    {exam.show_results_immediately && <li>• Results will be shown immediately after submission</li>}
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Agreement and Start Button */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms" 
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  I have read and understood the exam instructions. I agree to follow all guidelines 
                  and understand that any violation of exam rules may result in disqualification.
                </label>
              </div>

              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleStartExam}
                  disabled={!agreedToTerms || starting}
                  className="min-w-32"
                >
                  {starting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Starting...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Start Exam
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};