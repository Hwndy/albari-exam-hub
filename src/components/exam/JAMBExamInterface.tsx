import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
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
  AlertCircle
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

  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Fetch real questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoadingQuestions(true);
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

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
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

  const handleSubmit = useCallback(() => {
    onSubmit(answers);
  }, [answers, onSubmit]);

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

  const examContent = (
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

                {/* Stats */}
                <div className="mt-4 pt-3 border-t space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Answered:</span>
                    <Badge variant="secondary" className="h-5 text-xs">
                      {Object.keys(answers).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Flagged:</span>
                    <Badge variant="outline" className="h-5 text-xs">
                      {flaggedQuestions.size}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Remaining:</span>
                    <Badge variant="destructive" className="h-5 text-xs">
                      {questions.length - Object.keys(answers).length}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Question Content Panel */}
          <ResizablePanel defaultSize={75} minSize={65}>
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Question Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">Question {currentQuestion + 1}</h2>
                      <p className="text-sm text-muted-foreground">
                        {currentQ.subject} • {currentQ.difficulty}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFlag(currentQuestion)}
                      className={`${
                        flaggedQuestions.has(currentQuestion) 
                          ? 'bg-warning text-warning-foreground hover:bg-warning/90' 
                          : ''
                      }`}
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      {flaggedQuestions.has(currentQuestion) ? 'Unflag' : 'Flag'}
                    </Button>
                  </div>

                   {/* Question Text */}
                   <div className="bg-card rounded-lg p-6 border">
                     <p className="text-lg leading-relaxed font-medium mb-4">
                       {currentQ.question}
                     </p>
                     {/* Media Support */}
                     {currentQ.media_url && (
                       <div className="mt-4">
                         {currentQ.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                           <img 
                             src={currentQ.media_url} 
                             alt="Question media" 
                             className="max-w-full h-auto rounded border"
                           />
                         ) : currentQ.media_url.match(/\.(mp3|wav|ogg)$/i) ? (
                           <audio controls className="w-full">
                             <source src={currentQ.media_url} />
                           </audio>
                         ) : null}
                       </div>
                     )}
                   </div>

                  {/* Answer Options */}
                  <div className="space-y-4">
                    {currentQ.type === 'true_false' ? (
                      <div className="space-y-3">
                         {Object.entries(currentQ.options || {}).map(([key, value]) => (
                           <div
                             key={key}
                             className={`
                               flex items-center space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                               ${answers[currentQ.id] === key 
                                 ? 'border-primary bg-primary/5 shadow-sm' 
                                 : 'border-border hover:border-primary/50 hover:bg-accent/30'
                               }
                             `}
                             onClick={() => handleAnswerChange(currentQ.id, key)}
                           >
                             <Switch
                               checked={answers[currentQ.id] === key}
                               onCheckedChange={(checked) => {
                                 if (checked) handleAnswerChange(currentQ.id, key);
                               }}
                             />
                             <Label className="flex-1 text-base font-medium cursor-pointer">
                               {String(value)}
                             </Label>
                           </div>
                         ))}
                      </div>
                    ) : (
                      <RadioGroup
                        value={answers[currentQ.id] || ''}
                        onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                        className="space-y-3"
                      >
                         {Object.entries(currentQ.options || {}).map(([key, value]) => (
                           <div
                             key={key}
                             className={`
                               flex items-center space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                               ${answers[currentQ.id] === key 
                                 ? 'border-primary bg-primary/5 shadow-sm' 
                                 : 'border-border hover:border-primary/50 hover:bg-accent/30'
                               }
                             `}
                           >
                             <RadioGroupItem value={key} id={`option-${key}`} />
                             <Label
                               htmlFor={`option-${key}`}
                               className="flex-1 text-base cursor-pointer"
                             >
                               <span className="font-bold mr-3 text-primary">{key}.</span>
                               {String(value)}
                             </Label>
                           </div>
                         ))}
                      </RadioGroup>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Navigation Footer */}
              <div className="p-6 bg-muted/30 border-t">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex space-x-3">
                    {currentQuestion === questions.length - 1 ? (
                      <Button onClick={handleSubmit} className="bg-success hover:bg-success/90">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Submit Exam
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );

  return examContent;
};