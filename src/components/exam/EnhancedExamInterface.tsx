import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Clock, 
  Flag, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  EyeOff,
  BookOpen,
  Timer,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank';
  points: number;
  options: QuestionOption[];
  explanation?: string;
}

interface QuestionOption {
  id: string;
  option_text: string;
  option_order: number;
}

interface ExamData {
  id: string;
  title: string;
  duration_minutes: number;
  pass_mark: number;
  instructions?: string;
  allow_review: boolean;
  allow_question_flagging: boolean;
  sequential_navigation: boolean;
  show_results_immediately: boolean;
  questions: Question[];
}

interface ExamResponse {
  question_id: string;
  selected_option_id?: string;
  text_answer?: string;
  is_flagged: boolean;
  time_spent_seconds: number;
}

export const EnhancedExamInterface: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, ExamResponse>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [examStatus, setExamStatus] = useState<'not_started' | 'in_progress' | 'completed'>('not_started');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    if (examId && user) {
      initializeExam();
    }
  }, [examId, user]);

  useEffect(() => {
    // Timer
    const timer = setInterval(() => {
      if (timeRemaining > 0 && examStatus === 'in_progress') {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, examStatus]);

  useEffect(() => {
    // Fullscreen handling
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && examStatus === 'in_progress') {
        addWarning('Fullscreen mode exited');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examStatus]);

  useEffect(() => {
    // Prevent context menu and keyboard shortcuts
    const preventRightClick = (e: MouseEvent) => {
      if (examStatus === 'in_progress') {
        e.preventDefault();
        addWarning('Right-click detected');
      }
    };

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if (examStatus === 'in_progress') {
        // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'u')
        ) {
          e.preventDefault();
          addWarning('Developer tools access attempted');
        }
      }
    };

    document.addEventListener('contextmenu', preventRightClick);
    document.addEventListener('keydown', preventKeyboardShortcuts);

    return () => {
      document.removeEventListener('contextmenu', preventRightClick);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, [examStatus]);

  const addWarning = (warning: string) => {
    setWarnings(prev => [...prev, `${new Date().toLocaleTimeString()}: ${warning}`]);
  };

  const initializeExam = async () => {
    try {
      setLoading(true);

      // Fetch exam data
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          exam_questions(
            question_order,
            points,
            questions(
              id,
              question_text,
              question_type,
              explanation,
              question_options(
                id,
                option_text,
                option_order
              )
            )
          )
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // Check if user already has a session for this exam
      const { data: existingSession } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user!.id)
        .single();

      if (existingSession) {
        if (existingSession.status === 'completed') {
          navigate(`/exam-results/${existingSession.id}`);
          return;
        }
        setSessionId(existingSession.id);
        setCurrentQuestionIndex(existingSession.current_question_index || 0);
        setTimeRemaining(existingSession.time_remaining_seconds || examData.duration_minutes * 60);
        setExamStatus(existingSession.status as 'not_started' | 'in_progress' | 'completed');

        // Load existing responses
        const { data: existingResponses } = await supabase
          .from('question_responses')
          .select('*')
          .eq('session_id', existingSession.id);

        if (existingResponses) {
          const responseMap: Record<string, ExamResponse> = {};
          const flagged = new Set<string>();

          existingResponses.forEach(response => {
            responseMap[response.question_id] = {
              question_id: response.question_id,
              selected_option_id: response.selected_option_id,
              text_answer: response.text_answer,
              is_flagged: response.is_flagged,
              time_spent_seconds: response.time_spent_seconds || 0
            };

            if (response.is_flagged) {
              flagged.add(response.question_id);
            }
          });

          setResponses(responseMap);
          setFlaggedQuestions(flagged);
        }
      } else {
        // Create new session
        const { data: newSession, error: sessionError } = await supabase
          .from('exam_sessions')
          .insert({
            exam_id: examId,
            student_id: user!.id,
            school_id: examData.school_id,
            status: 'not_started',
            time_remaining_seconds: examData.duration_minutes * 60,
            ip_address: 'Unknown', // Would get real IP in production
            user_agent: navigator.userAgent
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        setSessionId(newSession.id);
        setTimeRemaining(examData.duration_minutes * 60);
      }

      // Create a deterministic seed based on user ID and exam ID
      const seed = user!.id + examId!;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      const createSeededRandom = (seed: number) => {
        let m = 0x80000000;
        let a = 1103515245;
        let c = 12345;
        let state = seed ? seed : Math.floor(Math.random() * (m - 1));
        return () => {
          state = (a * state + c) % m;
          return state / (m - 1);
        };
      };

      const seededRandom = createSeededRandom(Math.abs(hash));

      const shuffleWithSeed = <T,>(arr: T[], random: () => number): T[] => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      // Format questions with optional answer shuffling
      let questions = examData.exam_questions
        .sort((a: any, b: any) => a.question_order - b.question_order)
        .map((eq: any) => {
          let options = eq.questions.question_options?.sort(
            (a: any, b: any) => a.option_order - b.option_order
          ) || [];
          
          // Shuffle answer options if enabled
          if (examData.shuffle_answers) {
            options = shuffleWithSeed(options, createSeededRandom(Math.abs(hash) + eq.questions.id.charCodeAt(0)));
          }
          
          return {
            ...eq.questions,
            points: eq.points,
            options
          };
        });

      // Shuffle questions if randomize_questions is enabled
      if (examData.randomize_questions) {
        questions = shuffleWithSeed(questions, seededRandom);
        console.log('Questions shuffled for student:', user!.id);
      }

      // Apply questions_per_student limit if set
      if (examData.questions_per_student && questions.length > examData.questions_per_student) {
        questions = questions.slice(0, examData.questions_per_student);
        console.log(`Limited to ${examData.questions_per_student} questions`);
      }

      // Format exam data
      const formattedExam: ExamData = {
        ...examData,
        questions: questions
      };

      setExam(formattedExam);
      setQuestionStartTime(Date.now());

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load exam',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const startExam = async () => {
    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      setExamStatus('in_progress');
      
      // Request fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          addWarning('Fullscreen request denied');
        });
      }

      toast({
        title: 'Exam Started',
        description: 'Good luck! Remember to manage your time wisely.',
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to start exam',
        variant: 'destructive',
      });
    }
  };

  const saveResponse = useCallback(async (questionId: string, response: ExamResponse) => {
    try {
      const { error } = await supabase
        .from('question_responses')
        .upsert({
          session_id: sessionId,
          question_id: questionId,
          selected_option_id: response.selected_option_id,
          text_answer: response.text_answer,
          is_flagged: response.is_flagged,
          time_spent_seconds: response.time_spent_seconds,
          answered_at: new Date().toISOString()
        }, {
          onConflict: 'session_id,question_id'
        });

      if (error) throw error;

    } catch (error: any) {
      console.error('Failed to save response:', error);
    }
  }, [sessionId]);

  const handleAnswerChange = (questionId: string, value: string | null) => {
    const currentQuestion = exam?.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
    const newResponse: ExamResponse = {
      question_id: questionId,
      selected_option_id: currentQuestion.question_type === 'mcq' || currentQuestion.question_type === 'true_false' ? value || undefined : undefined,
      text_answer: currentQuestion.question_type === 'fill_blank' ? value || undefined : undefined,
      is_flagged: flaggedQuestions.has(questionId),
      time_spent_seconds: (responses[questionId]?.time_spent_seconds || 0) + timeSpent
    };

    setResponses(prev => ({ ...prev, [questionId]: newResponse }));
    saveResponse(questionId, newResponse);
  };

  const toggleFlag = (questionId: string) => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(questionId)) {
      newFlagged.delete(questionId);
    } else {
      newFlagged.add(questionId);
    }
    setFlaggedQuestions(newFlagged);

    // Update response
    const currentResponse = responses[questionId];
    if (currentResponse) {
      const updatedResponse = { ...currentResponse, is_flagged: newFlagged.has(questionId) };
      setResponses(prev => ({ ...prev, [questionId]: updatedResponse }));
      saveResponse(questionId, updatedResponse);
    }
  };

  const navigateToQuestion = (index: number) => {
    if (!exam) return;

    // Save time spent on current question
    const currentQuestion = exam.questions[currentQuestionIndex];
    if (currentQuestion) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      const currentResponse = responses[currentQuestion.id] || {
        question_id: currentQuestion.id,
        is_flagged: flaggedQuestions.has(currentQuestion.id),
        time_spent_seconds: 0
      };

      const updatedResponse = {
        ...currentResponse,
        time_spent_seconds: currentResponse.time_spent_seconds + timeSpent
      };

      setResponses(prev => ({ ...prev, [currentQuestion.id]: updatedResponse }));
      saveResponse(currentQuestion.id, updatedResponse);
    }

    setCurrentQuestionIndex(index);
    setQuestionStartTime(Date.now());

    // Update session
    supabase
      .from('exam_sessions')
      .update({
        current_question_index: index,
        time_remaining_seconds: timeRemaining
      })
      .eq('id', sessionId);
  };

  const handleAutoSubmit = async () => {
    await submitExam(true);
  };

  const submitExam = async (isAutoSubmit = false) => {
    try {
      setSubmitting(true);

      // Final save of current question time
      const currentQuestion = exam?.questions[currentQuestionIndex];
      if (currentQuestion) {
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        const currentResponse = responses[currentQuestion.id];
        if (currentResponse) {
          await saveResponse(currentQuestion.id, {
            ...currentResponse,
            time_spent_seconds: currentResponse.time_spent_seconds + timeSpent
          });
        }
      }

      // Update session status
      const { error: sessionError } = await supabase
        .from('exam_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          time_remaining_seconds: timeRemaining
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // Calculate score (this would typically be done server-side)
      const { data: scoreResult } = await supabase.rpc('calculate_exam_score', {
        session_id_param: sessionId
      });

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      setExamStatus('completed');

      toast({
        title: isAutoSubmit ? 'Time Up!' : 'Exam Submitted',
        description: isAutoSubmit 
          ? 'Your exam has been automatically submitted due to time expiry.'
          : 'Your exam has been submitted successfully.',
      });

      // Navigate to results
      if (exam?.show_results_immediately) {
        navigate(`/exam-results/${sessionId}`);
      } else {
        navigate('/dashboard');
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to submit exam. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!exam) return 0;
    const answeredCount = Object.keys(responses).length;
    return (answeredCount / exam.questions.length) * 100;
  };

  const getTimeColor = () => {
    if (timeRemaining < 300) return 'text-destructive'; // Less than 5 minutes
    if (timeRemaining < 900) return 'text-warning'; // Less than 15 minutes
    return 'text-success';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <BookOpen className="h-8 w-8 animate-pulse mx-auto" />
          <p>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p>Exam not found</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (examStatus === 'not_started') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-6 w-6 mr-2" />
              {exam.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Timer className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="font-medium">{exam.duration_minutes} minutes</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
              <div className="text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="font-medium">{exam.questions.length}</div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
              <div className="text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="font-medium">{exam.pass_mark}%</div>
                <div className="text-sm text-muted-foreground">Pass Mark</div>
              </div>
            </div>

            {exam.instructions && (
              <div className="space-y-2">
                <h3 className="font-medium">Instructions:</h3>
                <div className="p-4 bg-muted rounded-lg text-sm">
                  {exam.instructions}
                </div>
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Once you start the exam, you will have {exam.duration_minutes} minutes to complete it.
                The exam will be automatically submitted when time expires.
                {!exam.allow_review && ' You cannot review or change answers once submitted.'}
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button onClick={startExam} className="flex-1">
                Start Exam
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestion?.id];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <User className="h-5 w-5" />
              <span className="font-medium">{exam.title}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span className={`font-medium ${getTimeColor()}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              <div className="text-sm">
                Question {currentQuestionIndex + 1} of {exam.questions.length}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="mt-2">
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Question Navigator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {exam.questions.map((question, index) => (
                    <Button
                      key={question.id}
                      variant={index === currentQuestionIndex ? "default" : "outline"}
                      size="sm"
                      onClick={() => navigateToQuestion(index)}
                      className={`relative ${
                        responses[question.id] ? 'border-success' : ''
                      }`}
                    >
                      {index + 1}
                      {flaggedQuestions.has(question.id) && (
                        <Flag className="absolute -top-1 -right-1 h-3 w-3 text-warning" />
                      )}
                    </Button>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border border-success rounded"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border rounded"></div>
                    <span>Not answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Flag className="h-4 w-4 text-warning" />
                    <span>Flagged</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {warnings.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm text-destructive">Warnings</CardTitle>
                </CardHeader>
                <CardContent className="max-h-32 overflow-y-auto">
                  <div className="space-y-1 text-xs">
                    {warnings.slice(-5).map((warning, index) => (
                      <div key={index} className="text-destructive">
                        {warning}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Question {currentQuestionIndex + 1}
                    <Badge variant="outline" className="ml-2">
                      {currentQuestion?.points} {currentQuestion?.points === 1 ? 'point' : 'points'}
                    </Badge>
                  </CardTitle>
                  
                  {exam.allow_question_flagging && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFlag(currentQuestion.id)}
                      className={flaggedQuestions.has(currentQuestion.id) ? 'text-warning' : ''}
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      {flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <p className="text-lg leading-relaxed">
                    {currentQuestion?.question_text}
                  </p>
                </div>

                {/* Answer Options */}
                {currentQuestion?.question_type === 'mcq' && (
                  <RadioGroup
                    value={currentResponse?.selected_option_id || ''}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  >
                    {currentQuestion.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/5">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          {option.option_text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion?.question_type === 'true_false' && (
                  <RadioGroup
                    value={currentResponse?.selected_option_id || ''}
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  >
                    {currentQuestion.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/5">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer text-lg">
                          {option.option_text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion?.question_type === 'fill_blank' && (
                  <div className="space-y-2">
                    <Label htmlFor="text-answer">Your Answer:</Label>
                    <Input
                      id="text-answer"
                      value={currentResponse?.text_answer || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="text-lg"
                    />
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex space-x-2">
                    {currentQuestionIndex === exam.questions.length - 1 ? (
                      <Button
                        onClick={() => setShowSubmitConfirm(true)}
                        disabled={submitting}
                        className="bg-success hover:bg-success/90"
                      >
                        {submitting ? 'Submitting...' : 'Submit Exam'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                        disabled={currentQuestionIndex === exam.questions.length - 1}
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to submit your exam?</p>
                <div className="text-sm space-y-1">
                  <p>• Questions answered: <span className="font-medium">{Object.keys(responses).length}</span> of <span className="font-medium">{exam.questions.length}</span></p>
                  <p>• Questions flagged: <span className="font-medium">{flaggedQuestions.size}</span></p>
                  {Object.keys(responses).length < exam.questions.length && (
                    <p className="text-warning font-medium mt-2">
                      ⚠️ You have {exam.questions.length - Object.keys(responses).length} unanswered question(s)
                    </p>
                  )}
                </div>
                <p className="font-medium text-destructive">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitExam()} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Yes, Submit Exam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};