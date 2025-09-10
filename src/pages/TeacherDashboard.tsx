import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Users, FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { Exam, Question, ExamResult } from '@/types/exam';
import { useToast } from '@/hooks/use-toast';

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
];

const mockQuestions: Question[] = [
  {
    id: '1',
    question: 'What is 2 + 2?',
    options: { A: '3', B: '4', C: '5', D: '6' },
    correctAnswer: 'B',
    subject: 'Mathematics',
    difficulty: 'easy',
  },
  {
    id: '2',
    question: 'What is the square root of 16?',
    options: { A: '2', B: '3', C: '4', D: '5' },
    correctAnswer: 'C',
    subject: 'Mathematics',
    difficulty: 'medium',
  },
];

const mockResults: ExamResult[] = [
  {
    id: '1',
    examId: '1',
    studentId: '3',
    studentName: 'Jane Student',
    score: 17,
    totalQuestions: 20,
    answers: {},
    timeSpent: 45,
    completedAt: '2024-01-11',
  },
  {
    id: '2',
    examId: '1',
    studentId: '4',
    studentName: 'John Student',
    score: 15,
    totalQuestions: 20,
    answers: {},
    timeSpent: 50,
    completedAt: '2024-01-11',
  },
];

export const TeacherDashboard = () => {
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [results, setResults] = useState<ExamResult[]>(mockResults);
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const { toast } = useToast();

  // Create Exam Form State
  const [examForm, setExamForm] = useState({
    title: '',
    subject: '',
    class: '',
    duration: 60,
    randomizeQuestions: false,
    shuffleAnswers: false,
  });

  // Create Question Form State
  const [questionForm, setQuestionForm] = useState({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
    subject: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  });

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    const newExam: Exam = {
      id: Date.now().toString(),
      ...examForm,
      totalQuestions: 0,
      questions: [],
      createdBy: 'teacher1',
      createdAt: new Date().toISOString(),
      status: 'draft',
    };
    
    setExams([...exams, newExam]);
    setIsCreatingExam(false);
    setExamForm({
      title: '',
      subject: '',
      class: '',
      duration: 60,
      randomizeQuestions: false,
      shuffleAnswers: false,
    });
    
    toast({
      title: 'Exam Created',
      description: 'Your exam has been created successfully.',
    });
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: questionForm.question,
      options: {
        A: questionForm.optionA,
        B: questionForm.optionB,
        C: questionForm.optionC,
        D: questionForm.optionD,
      },
      correctAnswer: questionForm.correctAnswer,
      subject: questionForm.subject,
      difficulty: questionForm.difficulty,
    };
    
    setQuestions([...questions, newQuestion]);
    setIsCreatingQuestion(false);
    setQuestionForm({
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      subject: '',
      difficulty: 'medium',
    });
    
    toast({
      title: 'Question Added',
      description: 'Your question has been added to the question bank.',
    });
  };

  const calculateClassAverage = (examId: string) => {
    const examResults = results.filter(r => r.examId === examId);
    if (examResults.length === 0) return 0;
    const total = examResults.reduce((sum, result) => sum + (result.score / result.totalQuestions * 100), 0);
    return Math.round(total / examResults.length);
  };

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{exams.length}</p>
                  <p className="text-sm text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success/10 rounded-lg">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{questions.length}</p>
                  <p className="text-sm text-muted-foreground">Questions Bank</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Users className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Student Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="exams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="exams">My Exams</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
            <TabsTrigger value="results">Student Results</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Exams Tab */}
          <TabsContent value="exams" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Exams</h2>
              <Button onClick={() => setIsCreatingExam(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Exam
              </Button>
            </div>

            {isCreatingExam && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Exam</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateExam} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Exam Title</Label>
                        <Input
                          id="title"
                          value={examForm.title}
                          onChange={(e) => setExamForm({...examForm, title: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select onValueChange={(value) => setExamForm({...examForm, subject: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mathematics">Mathematics</SelectItem>
                            <SelectItem value="english">English Language</SelectItem>
                            <SelectItem value="science">Basic Science</SelectItem>
                            <SelectItem value="social">Social Studies</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="class">Class</Label>
                        <Select onValueChange={(value) => setExamForm({...examForm, class: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="JSS 1">JSS 1</SelectItem>
                            <SelectItem value="JSS 2">JSS 2</SelectItem>
                            <SelectItem value="JSS 3">JSS 3</SelectItem>
                            <SelectItem value="SSS 1">SSS 1</SelectItem>
                            <SelectItem value="SSS 2">SSS 2</SelectItem>
                            <SelectItem value="SSS 3">SSS 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={examForm.duration}
                          onChange={(e) => setExamForm({...examForm, duration: parseInt(e.target.value)})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="randomize"
                          checked={examForm.randomizeQuestions}
                          onCheckedChange={(checked) => setExamForm({...examForm, randomizeQuestions: checked as boolean})}
                        />
                        <Label htmlFor="randomize">Randomize question order</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="shuffle"
                          checked={examForm.shuffleAnswers}
                          onCheckedChange={(checked) => setExamForm({...examForm, shuffleAnswers: checked as boolean})}
                        />
                        <Label htmlFor="shuffle">Shuffle answer options</Label>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button type="submit">Create Exam</Button>
                      <Button type="button" variant="outline" onClick={() => setIsCreatingExam(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {exams.map((exam) => (
                <Card key={exam.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{exam.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{exam.subject}</span>
                          <span>•</span>
                          <span>{exam.class}</span>
                          <span>•</span>
                          <span>{exam.duration} minutes</span>
                          <span>•</span>
                          <span>{exam.totalQuestions} questions</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                            {exam.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Class Average: {calculateClassAverage(exam.id)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Question Bank</h2>
              <Button onClick={() => setIsCreatingQuestion(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {isCreatingQuestion && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Question</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateQuestion} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="question">Question</Label>
                      <Textarea
                        id="question"
                        value={questionForm.question}
                        onChange={(e) => setQuestionForm({...questionForm, question: e.target.value})}
                        placeholder="Enter your question here..."
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="optionA">Option A</Label>
                        <Input
                          id="optionA"
                          value={questionForm.optionA}
                          onChange={(e) => setQuestionForm({...questionForm, optionA: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="optionB">Option B</Label>
                        <Input
                          id="optionB"
                          value={questionForm.optionB}
                          onChange={(e) => setQuestionForm({...questionForm, optionB: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="optionC">Option C</Label>
                        <Input
                          id="optionC"
                          value={questionForm.optionC}
                          onChange={(e) => setQuestionForm({...questionForm, optionC: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="optionD">Option D</Label>
                        <Input
                          id="optionD"
                          value={questionForm.optionD}
                          onChange={(e) => setQuestionForm({...questionForm, optionD: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="correct">Correct Answer</Label>
                        <Select onValueChange={(value: 'A' | 'B' | 'C' | 'D') => setQuestionForm({...questionForm, correctAnswer: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">Option A</SelectItem>
                            <SelectItem value="B">Option B</SelectItem>
                            <SelectItem value="C">Option C</SelectItem>
                            <SelectItem value="D">Option D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select onValueChange={(value) => setQuestionForm({...questionForm, subject: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mathematics">Mathematics</SelectItem>
                            <SelectItem value="english">English Language</SelectItem>
                            <SelectItem value="science">Basic Science</SelectItem>
                            <SelectItem value="social">Social Studies</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="difficulty">Difficulty</Label>
                        <Select onValueChange={(value: 'easy' | 'medium' | 'hard') => setQuestionForm({...questionForm, difficulty: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button type="submit">Add Question</Button>
                      <Button type="button" variant="outline" onClick={() => setIsCreatingQuestion(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {questions.map((question, index) => (
                <Card key={question.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">Question {index + 1}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{question.subject}</Badge>
                          <Badge variant={
                            question.difficulty === 'easy' ? 'secondary' :
                            question.difficulty === 'medium' ? 'default' : 'destructive'
                          }>
                            {question.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-foreground">{question.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(question.options).map(([key, value]) => (
                          <div
                            key={key}
                            className={`p-2 rounded border ${
                              key === question.correctAnswer
                                ? 'bg-success/10 border-success text-success-foreground'
                                : 'bg-muted border-border'
                            }`}
                          >
                            <span className="font-medium">{key}.</span> {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <h2 className="text-2xl font-bold">Student Results</h2>
            <div className="grid gap-4">
              {results.map((result) => {
                const exam = exams.find(e => e.id === result.examId);
                const percentage = Math.round((result.score / result.totalQuestions) * 100);
                
                return (
                  <Card key={result.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div className="space-y-2">
                          <h3 className="font-semibold">{exam?.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Student: {result.studentName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Completed: {new Date(result.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="text-2xl font-bold">
                            {result.score}/{result.totalQuestions}
                          </div>
                          <Badge variant={percentage >= 70 ? 'default' : percentage >= 50 ? 'secondary' : 'destructive'}>
                            {percentage}%
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            Time: {result.timeSpent} minutes
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Analytics dashboard with charts and insights will be implemented here.
                  This would show exam performance trends, question difficulty analysis,
                  student progress tracking, and more detailed reporting features.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};