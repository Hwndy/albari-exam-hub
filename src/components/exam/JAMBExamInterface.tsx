import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Clock, 
  Flag, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2,
  AlertTriangle,
  CheckCircle2,
  Circle,
  AlertCircle,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Exam } from '@/types/exam';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface JAMBExamInterfaceProps {
  exam: Exam;
  onSubmit: (answers: Record<string, string>) => void;
  onExit: () => void;
}

interface ExamSection {
  id: string;
  name: string;
  questions: number[];
}

export const JAMBExamInterface: React.FC<JAMBExamInterfaceProps> = ({
  exam,
  onSubmit,
  onExit,
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(exam.duration * 60);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Fetch real questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoadingQuestions(true);
        
        // First, start the exam session to allow access to questions
        if (user?.id) {
          console.log('Starting exam session for user:', user.id, 'exam:', exam.id);
          
          // Update session status to 'in_progress' to allow question access
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

        const formattedQuestions = examQuestions?.map((eq: any) => ({
          id: eq.questions.id,
          question: eq.questions.question_text,
          options: eq.questions.question_options
            ?.sort((a: any, b: any) => a.option_order - b.option_order)
            ?.reduce((acc: any, opt: any, index: number) => {
              const letter = String.fromCharCode(65 + index);
              acc[letter] = opt.option_text;
              return acc;
            }, {}),
          correctAnswer: eq.questions.question_options
            ?.find((opt: any) => opt.is_correct)
            ?.option_order 
            ? String.fromCharCode(64 + eq.questions.question_options.find((opt: any) => opt.is_correct).option_order)
            : 'A',
          subject: eq.questions.question_banks?.subjects?.name || 'Unknown',
          difficulty: eq.questions.difficulty_level,
          type: eq.questions.question_type === 'true_false' ? 'true_false' : 'mcq',
          points: eq.points,
          explanation: eq.questions.explanation,
          media_url: eq.questions.media_url,
        })) || [];

        setQuestions(formattedQuestions);
      } catch (error) {
        console.error('Error fetching questions:', error);
        // Fallback to empty array
        setQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };

    if (exam.id) {
      fetchQuestions();
    }
  }, [exam.id]);

  // Create sections (JAMB-style: Mathematics, English, etc.)
  const sections: ExamSection[] = [
    {
      id: 'math',
      name: 'Mathematics',
      questions: questions
        .map((q, index) => ({ ...q, index }))
        .filter(q => q.subject === 'Mathematics')
        .map(q => q.index),
    },
    {
      id: 'english',
      name: 'English Language',
      questions: questions
        .map((q, index) => ({ ...q, index }))
        .filter(q => q.subject === 'English')
        .map(q => q.index),
    },
    {
      id: 'other',
      name: 'Other Subjects',
      questions: questions
        .map((q, index) => ({ ...q, index }))
        .filter(q => !['Mathematics', 'English'].includes(q.subject))
        .map(q => q.index),
    },
  ].filter(section => section.questions.length > 0);

  // Auto-save answers periodically
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        // Save answers to session
        console.log('Auto-saving answers...', answers);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSave);
  }, [answers]);

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

  // Full screen handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable copy/paste and other shortcuts
      if (e.ctrlKey && ['a', 'c', 'v', 'x', 's', 'z', 'y'].includes(e.key)) {
        e.preventDefault();
      }
      // Disable F12, right-click, etc.
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    if (isFullScreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('contextmenu', handleContextMenu);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.body.style.userSelect = '';
    };
  }, [isFullScreen]);

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
        // Get the session first
        const { data: sessionData } = await supabase
          .from('exam_sessions')
          .select('id')
          .eq('exam_id', exam.id)
          .eq('student_id', user.id)
          .single();

        if (sessionData) {
          // Find the question option ID for MCQ/True-False questions
          const question = questions.find(q => q.id === questionId);
          let selectedOptionId = null;
          
          if (question && ['mcq', 'true_false'].includes(question.type)) {
            const optionIndex = answer.charCodeAt(0) - 65; // Convert A,B,C,D to 0,1,2,3
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
    // First, submit all final answers to ensure they're saved
    if (user?.id) {
      try {
        const { data: sessionData } = await supabase
          .from('exam_sessions')
          .select('id')
          .eq('exam_id', exam.id)
          .eq('student_id', user.id)
          .single();

        if (sessionData) {
          // Calculate and save final score
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-success text-success-foreground';
      case 'flagged': return 'bg-warning text-warning-foreground';
      case 'current': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const getStatusIcon = (index: number): React.ReactNode => {
    const status = getQuestionStatus(index);
    if (index === currentQuestion) return <Circle className="h-3 w-3 fill-current" />;
    if (status === 'answered') return <CheckCircle2 className="h-3 w-3" />;
    if (status === 'flagged') return <AlertCircle className="h-3 w-3" />;
    return <Circle className="h-3 w-3" />;
  };

  const currentQ = questions[currentQuestion];
  const isTimeWarning = timeRemaining < 300; // 5 minutes
  const isTimeCritical = timeRemaining < 60; // 1 minute

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading exam questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">No questions found for this exam</p>
          <Button onClick={onExit}>Exit</Button>
        </div>
      </div>
    );
  }

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullScreen(!isFullScreen);
  };

  if (isMobile) {
    // Mobile Interface
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
                <h1 className="text-base font-bold text-primary truncate">{exam.title}</h1>
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
            
            <Button onClick={handleSubmit} variant="default" size="sm">
              Submit Exam
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Interface  
  return (
    <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-background' : ''} flex flex-col h-screen`}>
      {/* Header */}
      <header className="bg-card border-b shadow-sm px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary">{exam.title}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Time Remaining</span>
              </div>
              <div className={`text-sm font-bold ${
                isTimeCritical 
                  ? 'text-destructive animate-pulse' 
                  : isTimeWarning 
                    ? 'text-warning' 
                    : 'text-primary'
              }`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullScreen}
              className="hidden sm:flex"
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            <Button 
              onClick={onExit} 
              variant="outline" 
              size="sm"
              disabled={isFullScreen}
            >
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Question Navigation Panel */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="h-full bg-muted/30 border-r">
              {/* Section Navigation */}
              {sections.length > 1 && (
                <div className="p-3 border-b bg-card">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Sections</div>
                  <div className="flex flex-wrap gap-1">
                    {sections.map((section, index) => (
                      <Button
                        key={section.id}
                        variant={index === currentSection ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          setCurrentSection(index);
                          setCurrentQuestion(section.questions[0]);
                        }}
                      >
                        {section.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions Grid */}
              <div className="p-3">
                <div className="text-xs font-medium text-muted-foreground mb-3">Questions</div>
                <ScrollArea className="h-[calc(100vh-200px)]">
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
                            relative h-10 w-10 p-0 text-xs font-medium transition-all
                            ${isCurrent 
                              ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20' 
                              : getStatusColor(status)
                            }
                          `}
                          onClick={() => setCurrentQuestion(index)}
                        >
                           <span className="absolute inset-0 flex items-center justify-center">
                             {index + 1}
                           </span>
                           {flaggedQuestions.has(index) && (
                             <Flag className="h-2 w-2 absolute -top-0.5 -right-0.5 text-warning fill-current" />
                           )}
                           <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                             {getStatusIcon(index)}
                           </div>
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Legend */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-success"></div>
                    <span className="text-muted-foreground">Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-warning"></div>
                    <span className="text-muted-foreground">Flagged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-muted"></div>
                    <span className="text-muted-foreground">Unanswered</span>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Question Content Panel */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full flex flex-col">
              {/* Question Header */}
              <div className="flex-shrink-0 p-4 border-b bg-background">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      Question {currentQuestion + 1} of {questions.length}
                    </Badge>
                    {currentQ && (
                      <Badge variant="secondary">
                        {currentQ.subject} • {currentQ.difficulty}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFlag(currentQuestion)}
                    className={flaggedQuestions.has(currentQuestion) ? 'text-warning' : ''}
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    {flaggedQuestions.has(currentQuestion) ? 'Unflag' : 'Flag'}
                  </Button>
                </div>
              </div>

              {/* Question Content */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {currentQ && (
                    <div className="max-w-4xl mx-auto space-y-6">
                      {/* Question Text */}
                      <div className="prose prose-lg max-w-none">
                        <div 
                          className="text-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: currentQ.question }}
                        />
                      </div>

                      {/* Question Image */}
                      {currentQ.media_url && (
                        <div className="flex justify-center">
                          <img 
                            src={currentQ.media_url} 
                            alt="Question diagram"
                            className="max-w-full h-auto rounded-lg border shadow-sm"
                          />
                        </div>
                      )}

                      {/* Answer Options */}
                      <div className="space-y-4">
                        <RadioGroup
                          value={answers[currentQ.id] || ''}
                          onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                        >
                          {Object.entries(currentQ.options || {}).map(([key, value]) => (
                            <div key={key} className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                              <RadioGroupItem value={key} id={`option-${key}`} className="mt-1" />
                              <Label 
                                htmlFor={`option-${key}`} 
                                className="flex-1 cursor-pointer leading-relaxed"
                              >
                                <span className="font-medium text-primary mr-3 text-lg">{key}.</span>
                                <span dangerouslySetInnerHTML={{ __html: value as string }} />
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Navigation Footer */}
              <div className="flex-shrink-0 border-t bg-background p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                  >
                    Previous Question
                  </Button>
                  
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                      disabled={currentQuestion === questions.length - 1}
                    >
                      Next Question
                    </Button>
                    
                    <Button onClick={handleSubmit} variant="default" size="lg">
                      Submit Exam
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};