import React, { useState } from 'react';
import { JAMBExamInterface } from '@/components/exam/JAMBExamInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Users, Award } from 'lucide-react';
import { Exam } from '@/types/exam';

export const ExamPage: React.FC = () => {
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examResults, setExamResults] = useState<any>(null);

  // Mock exam data
  const mockExam: Exam = {
    id: 'jamb-2024',
    title: 'JAMB UTME Practice Test 2024',
    subject: 'Combined',
    class: 'SS3',
    duration: 120, // 2 hours
    totalQuestions: 20,
    questions: [], // Will be generated in the component
    randomizeQuestions: true,
    shuffleAnswers: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    status: 'published',
  };

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleSubmitExam = (answers: Record<string, string>) => {
    // Mock scoring
    const totalQuestions = mockExam.totalQuestions;
    const answeredQuestions = Object.keys(answers).length;
    const score = Math.floor(Math.random() * answeredQuestions) + Math.floor(answeredQuestions * 0.6);
    const percentage = Math.round((score / totalQuestions) * 100);

    setExamResults({
      score,
      totalQuestions,
      percentage,
      answers,
      passed: percentage >= 50,
    });
    setExamStarted(false);
    setExamSubmitted(true);
  };

  const handleExitExam = () => {
    if (confirm('Are you sure you want to exit the exam? Your progress will be lost.')) {
      setExamStarted(false);
    }
  };

  const resetExam = () => {
    setExamStarted(false);
    setExamSubmitted(false);
    setExamResults(null);
  };

  if (examStarted) {
    return (
      <JAMBExamInterface
        exam={mockExam}
        onSubmit={handleSubmitExam}
        onExit={handleExitExam}
      />
    );
  }

  if (examSubmitted && examResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                examResults.passed ? 'bg-success/10' : 'bg-destructive/10'
              }`}>
                <Award className={`h-8 w-8 ${
                  examResults.passed ? 'text-success' : 'text-destructive'
                }`} />
              </div>
              <CardTitle className="text-2xl">
                {examResults.passed ? 'Congratulations!' : 'Keep Practicing!'}
              </CardTitle>
              <p className="text-muted-foreground">Your exam has been submitted successfully.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{examResults.score}</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
                <div className="text-center p-4 bg-accent/5 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{examResults.totalQuestions}</div>
                  <div className="text-sm text-muted-foreground">Total Questions</div>
                </div>
              </div>

              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${
                  examResults.passed ? 'text-success' : 'text-destructive'
                }`}>
                  {examResults.percentage}%
                </div>
                <Badge variant={examResults.passed ? 'default' : 'destructive'} className="text-sm">
                  {examResults.passed ? 'PASSED' : 'FAILED'}
                </Badge>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Questions Answered:</span>
                  <span className="font-medium">{Object.keys(examResults.answers).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Correct Answers:</span>
                  <span className="font-medium text-success">{examResults.score}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wrong Answers:</span>
                  <span className="font-medium text-destructive">
                    {Object.keys(examResults.answers).length - examResults.score}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button onClick={resetExam} className="flex-1">
                  Take Another Practice Test
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">JAMB UTME Practice Test</h1>
          <p className="text-muted-foreground">
            Experience the real JAMB exam interface with our practice test
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="bg-primary/10 p-3 rounded-full">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{mockExam.duration} min</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="bg-success/10 p-3 rounded-full">
                <BookOpen className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{mockExam.totalQuestions}</div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="bg-warning/10 p-3 rounded-full">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">50%</div>
                <div className="text-sm text-muted-foreground">Pass Mark</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Exam Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <h3 className="font-semibold text-warning mb-2">Important Instructions:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You have {mockExam.duration} minutes to complete {mockExam.totalQuestions} questions</li>
                <li>• The exam will auto-submit when time expires</li>
                <li>• You can navigate between questions using the question panel</li>
                <li>• Flag questions you want to review before submission</li>
                <li>• Copy/paste and right-click are disabled during the exam</li>
                <li>• The exam will enter full-screen mode for security</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Question Types:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-3 p-3 bg-accent/5 rounded-lg">
                  <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
                  <span>Multiple Choice Questions</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-accent/5 rounded-lg">
                  <div className="w-4 h-4 bg-primary rounded"></div>
                  <span>True/False Questions</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Color Coding:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-success rounded"></div>
                  <span>Answered Questions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-warning rounded"></div>
                  <span>Flagged Questions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-muted rounded"></div>
                  <span>Unanswered Questions</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <Button onClick={handleStartExam} size="lg" className="w-full">
                Start Practice Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};