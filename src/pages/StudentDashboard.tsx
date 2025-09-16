import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, BookOpen, Trophy, TrendingUp } from 'lucide-react';
import { Exam, ExamResult } from '@/types/exam';
import { ExamList } from '@/components/student/ExamList';

// Mock data
const mockExams: Exam[] = [
  {
    id: '1',
    title: 'Mathematics Mid-Term Exam',
    subject: 'Mathematics',
    class: 'JSS 1',
    duration: 60,
    totalQuestions: 20,
    questions: [],
    randomizeQuestions: true,
    shuffleAnswers: true,
    createdBy: 'teacher1',
    createdAt: '2024-01-10',
    status: 'published',
  },
  {
    id: '2',
    title: 'English Language Quiz',
    subject: 'English',
    class: 'JSS 1',
    duration: 45,
    totalQuestions: 15,
    questions: [],
    randomizeQuestions: false,
    shuffleAnswers: true,
    createdBy: 'teacher2',
    createdAt: '2024-01-12',
    status: 'published',
  },
];

const mockResults: ExamResult[] = [
  {
    id: '1',
    examId: '1',
    studentId: '3',
    studentName: 'Jane Student',
    score: 85,
    totalQuestions: 20,
    answers: {},
    timeSpent: 45,
    completedAt: '2024-01-11',
  },
];

export const StudentDashboard = () => {
  const [availableExams, setAvailableExams] = useState<Exam[]>(mockExams);
  const [results, setResults] = useState<ExamResult[]>(mockResults);

  const handleStartExam = (examId: string) => {
    // Navigate to exam interface - would be implemented with React Router
    console.log('Starting exam:', examId);
  };

  const calculateAverageScore = () => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, result) => sum + result.score, 0);
    return Math.round(total / results.length);
  };

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{availableExams.length}</p>
                  <p className="text-sm text-muted-foreground">Available Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{calculateAverageScore()}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {results.reduce((sum, r) => sum + r.timeSpent, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Minutes Studied</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exam List Component */}
        <ExamList />
      </div>
    </DashboardLayout>
  );
};