import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  Menu,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Exam } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MobileExamInterfaceProps {
  exam: Exam;
  onSubmit: (answers: Record<string, string>) => void;
  onExit: () => void;
}

export const MobileExamInterface: React.FC<MobileExamInterfaceProps> = ({
  exam,
  onSubmit,
  onExit,
}) => {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(exam.duration * 60);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Fetch real questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoadingQuestions(true);
        
        // Start the exam session
        if (user?.id) {
          const { error: sessionError } = await supabase
            .from('exam_sessions')
            .update({
              status: 'in_progress',
              started_at: new Date().toISOString()
            })
            .eq('exam_id', exam.id)
            .eq('student_id', user.id);
            
          if (sessionError) {
            console.error('Error starting session:', sessionError);
          }
        }

        // Get exam details to check shuffle settings
        const { data: examData } = await supabase
          .from('exams')
          .select('questions_per_student, randomize_questions, shuffle_answers')
          .eq('id', exam.id)
          .single();

        const { data: examQuestions, error } = await supabase
          .from('exam_questions')
          .select(`
            *,
            questions!inner(
              *,
              question_options(*),
              question_banks(
                subjects(name)
              )
            )
          `)
          .eq('exam_id', exam.id)
          .order('question_order');

        if (error) throw error;

        // Create a deterministic seed based on user ID and exam ID
        const seed = (user?.id || '') + exam.id;
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

        let formattedQuestions = examQuestions?.map((eq: any) => {
          let options = eq.questions.question_options
            ?.sort((a: any, b: any) => a.option_order - b.option_order) || [];
          
          if (examData?.shuffle_answers) {
            options = shuffleWithSeed(options, createSeededRandom(Math.abs(hash) + eq.questions.id.charCodeAt(0)));
          }
          
          return {
            id: eq.questions.id,
            question: eq.questions.question_text,
            options: options.reduce((acc: any, opt: any, index: number) => {
              const letter = String.fromCharCode(65 + index);
              acc[letter] = opt.option_text;
              return acc;
            }, {}),
            correctAnswer: (() => {
              const correctOpt = options.findIndex((opt: any) => opt.is_correct);
              return correctOpt >= 0 ? String.fromCharCode(65 + correctOpt) : 'A';
            })(),
            subject: eq.questions.question_banks?.subjects?.name || 'Unknown',
            difficulty: eq.questions.difficulty_level,
            type: eq.questions.question_type === 'true_false' ? 'true_false' : 'mcq',
            points: eq.points,
            explanation: eq.questions.explanation,
            media_url: eq.questions.media_url,
          };
        }) || [];

        // Shuffle questions if enabled
        if (examData?.randomize_questions) {
          formattedQuestions = shuffleWithSeed(formattedQuestions, seededRandom);
        }

        // Apply limit if set
        if (examData?.questions_per_student && formattedQuestions.length > examData.questions_per_student) {
          formattedQuestions = formattedQuestions.slice(0, examData.questions_per_student);
        }

        setQuestions(formattedQuestions);
      } catch (error) {
        console.error('Error fetching questions:', error);
        setQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };

    if (exam.id) {
      fetchQuestions();
    }
  }, [exam.id, user]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = async (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));

    // Save the response to the database
    if (user?.id) {
      try {
        const { data: sessionData } = await supabase
          .from('exam_sessions')
          .select('id')
          .eq('exam_id', exam.id)
          .eq('student_id', user.id)
          .single();

        if (sessionData) {
          const question = questions.find(q => q.id === questionId);
          let selectedOptionId = null;
          
          if (question && ['mcq', 'true_false'].includes(question.type)) {
            const optionIndex = answer.charCodeAt(0) - 65;
            const { data: optionData } = await supabase
              .from('question_options')
              .select('id')
              .eq('question_id', questionId)
              .eq('option_order', optionIndex + 1)
              .single();
            
            selectedOptionId = optionData?.id;
          }

          await supabase
            .from('question_responses')
            .upsert({
              session_id: sessionData.id,
              question_id: questionId,
              selected_option_id: selectedOptionId,
              text_answer: question?.type === 'fill_blank' ? answer : null,
              answered_at: new Date().toISOString(),
            }, {
              onConflict: 'session_id,question_id'
            });
        }
      } catch (error) {
        console.error('Error saving answer:', error);
      }
    }
  };

  const handleFlag = (questionIndex: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (user?.id) {
      try {
        const { data: sessionData } = await supabase
          .from('exam_sessions')
          .select('id')
          .eq('exam_id', exam.id)
          .eq('student_id', user.id)
          .single();

        if (sessionData) {
          await supabase.rpc('calculate_exam_score', {
            session_id_param: sessionData.id
          });
        }
      } catch (error) {
        console.error('Error calculating final score:', error);
      }
    }
    
    onSubmit(answers);
  }, [answers, onSubmit, exam.id, user]);

  const getQuestionStatus = (index: number) => {
    if (answers[questions[index].id]) return 'answered';
    if (flaggedQuestions.has(index)) return 'flagged';
    return 'unanswered';
  };

  const getStatusIcon = (index: number): React.ReactNode => {
    const status = getQuestionStatus(index);
    if (index === currentQuestion) return <Circle className="h-4 w-4 fill-current" />;
    if (status === 'answered') return <CheckCircle2 className="h-4 w-4" />;
    if (status === 'flagged') return <AlertCircle className="h-4 w-4" />;
    return <Circle className="h-4 w-4" />;
  };

  const currentQ = questions[currentQuestion];
  const isTimeWarning = timeRemaining < 300; // 5 minutes
  const isTimeCritical = timeRemaining < 60; // 1 minute

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading exam questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">No questions found for this exam</p>
          <Button onClick={onExit}>Exit</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <header className="bg-card border-b shadow-sm px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Question Navigation</SheetTitle>
                  <SheetDescription>
                    {Object.keys(answers).length} of {questions.length} answered
                  </SheetDescription>
                </SheetHeader>
                
                <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((_, index) => {
                      const status = getQuestionStatus(index);
                      const isCurrent = index === currentQuestion;
                      
                      return (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className={`
                            relative h-12 w-12 p-0 text-xs font-medium transition-all
                            ${isCurrent 
                              ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20' 
                              : status === 'answered'
                                ? 'bg-success text-success-foreground'
                                : status === 'flagged'
                                  ? 'bg-warning text-warning-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }
                          `}
                          onClick={() => {
                            setCurrentQuestion(index);
                            setIsNavOpen(false);
                          }}
                        >
                          <span className="absolute inset-0 flex items-center justify-center">
                            {index + 1}
                          </span>
                          {flaggedQuestions.has(index) && (
                            <Flag className="h-2 w-2 absolute -top-0.5 -right-0.5 text-orange-500 fill-current" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-success"></div>
                      <span>Answered ({Object.keys(answers).length})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-warning"></div>
                      <span>Flagged ({flaggedQuestions.size})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-muted"></div>
                      <span>Unanswered ({questions.length - Object.keys(answers).length})</span>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="text-lg font-bold text-primary truncate">{exam.title}</h1>
              <p className="text-xs text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-center">
              <div className={`text-sm font-bold ${
                isTimeCritical 
                  ? 'text-destructive animate-pulse' 
                  : isTimeWarning 
                    ? 'text-warning' 
                    : 'text-primary'
              }`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs text-muted-foreground">Time Left</div>
            </div>
            
            <Button 
              onClick={onExit} 
              variant="outline" 
              size="sm"
            >
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Question Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 pb-20">
          {currentQ && (
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                <div className="space-y-6">
                  {/* Question Header */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {currentQ.subject} • {currentQ.difficulty}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFlag(currentQuestion)}
                      className={flaggedQuestions.has(currentQuestion) ? 'text-warning' : ''}
                    >
                      <Flag className="h-4 w-4" />
                      {flaggedQuestions.has(currentQuestion) ? 'Unflag' : 'Flag'}
                    </Button>
                  </div>

                  {/* Question Text */}
                  <div className="prose prose-sm max-w-none">
                    <div 
                      className="text-foreground leading-relaxed text-base"
                      dangerouslySetInnerHTML={{ __html: currentQ.question }}
                    />
                  </div>

                  {/* Question Image */}
                  {currentQ.media_url && (
                    <div className="flex justify-center">
                      <img 
                        src={currentQ.media_url} 
                        alt="Question diagram"
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  )}

                  {/* Answer Options */}
                  <div className="space-y-3">
                    <RadioGroup
                      value={answers[currentQ.id] || ''}
                      onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                    >
                      {Object.entries(currentQ.options || {}).map(([key, value]) => (
                        <div key={key} className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value={key} id={`option-${key}`} className="mt-0.5 flex-shrink-0" />
                          <Label 
                            htmlFor={`option-${key}`} 
                            className="flex-1 cursor-pointer leading-relaxed"
                          >
                            <span className="font-medium text-primary mr-2">{key}.</span>
                            <span dangerouslySetInnerHTML={{ __html: value as string }} />
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Mobile Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-4 safe-area">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>
          
          <div className="text-xs text-center px-2 font-medium">
            {currentQuestion + 1} / {questions.length}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
            disabled={currentQuestion === questions.length - 1}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {Object.keys(answers).length} answered • {flaggedQuestions.size} flagged
          </div>
          
          <Button onClick={() => setShowSubmitConfirm(true)} variant="default" size="sm">
            Submit Exam
          </Button>
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
                  <p>• Questions answered: <span className="font-medium">{Object.keys(answers).length}</span> of <span className="font-medium">{questions.length}</span></p>
                  <p>• Questions flagged: <span className="font-medium">{flaggedQuestions.size}</span></p>
                  {Object.keys(answers).length < questions.length && (
                    <p className="text-warning font-medium mt-2">
                      ⚠️ You have {questions.length - Object.keys(answers).length} unanswered question(s)
                    </p>
                  )}
                </div>
                <p className="font-medium text-destructive">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Yes, Submit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};