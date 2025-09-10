import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { Question, Exam } from '@/types/exam';

interface ExamInterfaceProps {
  exam: Exam;
  onSubmit: (answers: Record<string, string>) => void;
  onExit: () => void;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({
  exam,
  onSubmit,
  onExit,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(exam.duration * 60); // Convert to seconds
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // Mock questions for demo
  const mockQuestions: Question[] = [
    {
      id: '1',
      question: 'What is the sum of 15 + 27?',
      options: { A: '40', B: '42', C: '44', D: '45' },
      correctAnswer: 'B',
      subject: 'Mathematics',
      difficulty: 'easy',
    },
    {
      id: '2',
      question: 'Which of the following is a prime number?',
      options: { A: '15', B: '21', C: '23', D: '27' },
      correctAnswer: 'C',
      subject: 'Mathematics',
      difficulty: 'medium',
    },
    {
      id: '3',
      question: 'What is the square root of 144?',
      options: { A: '11', B: '12', C: '13', D: '14' },
      correctAnswer: 'B',
      subject: 'Mathematics',
      difficulty: 'easy',
    },
  ];

  const questions = mockQuestions.slice(0, exam.totalQuestions || 3);

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

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleFlag = () => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion)) {
        newSet.delete(currentQuestion);
      } else {
        newSet.add(currentQuestion);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary">{exam.title}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Time Remaining</span>
                </div>
                <div className={`text-lg font-bold ${timeRemaining < 300 ? 'text-destructive' : 'text-primary'}`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Progress</div>
                <div className="text-lg font-bold text-primary">
                  {getAnsweredCount()}/{questions.length}
                </div>
              </div>
              
              <Button onClick={onExit} variant="outline">
                Exit Exam
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                  {questions.map((_, index) => (
                    <Button
                      key={index}
                      variant={
                        index === currentQuestion
                          ? 'default'
                          : answers[questions[index].id]
                          ? 'secondary'
                          : 'outline'
                      }
                      size="sm"
                      className="relative"
                      onClick={() => setCurrentQuestion(index)}
                    >
                      {index + 1}
                      {flaggedQuestions.has(index) && (
                        <Flag className="h-3 w-3 absolute -top-1 -right-1 text-warning" fill="currentColor" />
                      )}
                    </Button>
                  ))}
                </div>
                
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Answered:</span>
                    <Badge variant="secondary">{getAnsweredCount()}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Flagged:</span>
                    <Badge variant="outline">{flaggedQuestions.size}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Remaining:</span>
                    <Badge variant="destructive">{questions.length - getAnsweredCount()}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Question {currentQuestion + 1}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFlag}
                      className={flaggedQuestions.has(currentQuestion) ? 'text-warning' : ''}
                    >
                      <Flag className="h-4 w-4" />
                      {flaggedQuestions.has(currentQuestion) ? 'Unflag' : 'Flag'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-lg font-medium leading-relaxed">
                  {currentQ.question}
                </div>
                
                <RadioGroup
                  value={answers[currentQ.id] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                  className="space-y-4"
                >
                  {Object.entries(currentQ.options).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                      <RadioGroupItem value={key} id={`option-${key}`} />
                      <Label
                        htmlFor={`option-${key}`}
                        className="flex-1 text-base cursor-pointer"
                      >
                        <span className="font-medium mr-2">{key}.</span>
                        {value}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                {/* Navigation */}
                <div className="flex items-center justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex space-x-4">
                    {currentQuestion === questions.length - 1 ? (
                      <Button onClick={handleSubmit} className="bg-success hover:bg-success/90">
                        Submit Exam
                      </Button>
                    ) : (
                      <Button onClick={handleNext}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};