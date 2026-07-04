import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  FileText, 
  Users, 
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Timer,
  Shield
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ExamDetails {
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
  sequential_navigation: boolean;
  show_results_immediately: boolean;
  school_id?: string;
}

export const ExamInstructions: React.FC = () => {
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startingExam, setStartingExam] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const examId = searchParams.get('examId');

  useEffect(() => {
    if (examId) {
      fetchExamDetails();
    } else {
      navigate('/student');
    }
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      
      const { data: examData, error } = await supabase
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

      setExamDetails({
        ...examData,
        subject_name: examData.subjects?.name,
        class_name: examData.classes?.name,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load exam details',
        variant: 'destructive',
      });
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!agreedToTerms) {
      toast({
        title: 'Agreement Required',
        description: 'Please read and agree to the exam terms and conditions',
        variant: 'destructive',
      });
      return;
    }

    try {
      setStartingExam(true);

      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user?.id)
        .single();

      if (existingSession) {
        // Resume existing session
        navigate(`/exam?session=${existingSession.id}`);
        return;
      }

      // Create new session
      const { data: newSession, error } = await supabase
        .from('exam_sessions')
        .insert({
          exam_id: examId,
          student_id: user?.id,
                    status: 'in_progress',
          started_at: new Date().toISOString(),
          current_question_index: 0,
          time_remaining_seconds: examDetails!.duration_minutes * 60,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/exam?session=${newSession.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start exam',
        variant: 'destructive',
      });
    } finally {
      setStartingExam(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!examDetails) {
    return <div className="flex justify-center items-center min-h-screen">Exam not found</div>;
  }

  const defaultInstructions = [
    "Read each question carefully before selecting your answer.",
    "You can navigate between questions using the question panel.",
    "Flag questions you want to review later.",
    "Submit your exam before the time expires.",
    "Internet connection is required throughout the exam.",
    "Do not refresh or close the browser during the exam.",
  ];

  const instructions = examDetails.instructions 
    ? examDetails.instructions.split('\n').filter(line => line.trim())
    : defaultInstructions;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Exam Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{examDetails.title}</CardTitle>
              <Badge variant="default">
                <BookOpen className="h-4 w-4 mr-1" />
                {examDetails.subject_name || 'General'}
              </Badge>
            </div>
            {examDetails.description && (
              <p className="text-muted-foreground">{examDetails.description}</p>
            )}
          </CardHeader>
        </Card>

        {/* Exam Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{examDetails.duration_minutes}</div>
              <div className="text-sm text-muted-foreground">Minutes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{examDetails.total_questions}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{examDetails.pass_mark}%</div>
              <div className="text-sm text-muted-foreground">Pass Mark</div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-warning" />
              Exam Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <p className="text-sm">{instruction}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-info" />
              System Requirements & Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Exam Features:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Question navigation panel</li>
                  <li>• {examDetails.allow_review ? 'Review allowed' : 'No review allowed'}</li>
                  <li>• {examDetails.sequential_navigation ? 'Sequential navigation' : 'Free navigation'}</li>
                  <li>• {examDetails.show_results_immediately ? 'Immediate results' : 'Results after review'}</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Requirements:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Stable internet connection</li>
                  <li>• Modern web browser</li>
                  <li>• Full-screen recommended</li>
                  <li>• No browser refresh during exam</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Warnings */}
        <Alert>
          <Timer className="h-4 w-4" />
          <AlertDescription>
            <strong>Time Warning:</strong> The exam timer will start immediately when you click "Start Exam". 
            Make sure you're ready to begin and have a stable internet connection.
          </AlertDescription>
        </Alert>

        {/* Agreement and Start */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label 
                  htmlFor="terms" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have read and understood the exam instructions. I agree to the terms and conditions 
                  and confirm that I am ready to start this exam.
                </label>
              </div>
              
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate('/student')}
              >
                Back to Exams
              </Button>
              
              <Button 
                onClick={handleStartExam}
                disabled={!agreedToTerms || startingExam}
                className="px-8"
              >
                {startingExam ? 'Starting...' : 'Start Exam'}
              </Button>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};