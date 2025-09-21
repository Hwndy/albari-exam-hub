import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Edit, Trash2, Search, Upload, Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionBulkImport } from './QuestionBulkImport';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank';
  difficulty_level: 'easy' | 'medium' | 'hard';
  points: number;
  options: QuestionOption[];
  explanation?: string;
  media_url?: string;
  subject_name: string;
  created_at: string;
}

interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
}

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'mcq' as 'mcq' | 'true_false' | 'fill_blank',
    difficulty_level: 'medium' as 'easy' | 'medium' | 'hard',
    points: 1,
    subject_id: '',
    explanation: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch questions with options and subject info
      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          *,
          question_options(*),
          question_banks(
            subject_id,
            subjects(name)
          )
        `)
        .order('created_at', { ascending: false });

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (questionsData) {
        const formattedQuestions = questionsData.map(q => ({
          ...q,
          options: q.question_options?.sort((a: any, b: any) => a.option_order - b.option_order) || [],
          subject_name: q.question_banks?.subjects?.name || 'Unknown'
        }));
        setQuestions(formattedQuestions);
      }
      
      if (subjectsData) setSubjects(subjectsData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate that at least one option is marked as correct for MCQ
      if (questionForm.question_type === 'mcq') {
        const hasCorrectAnswer = questionForm.options.some(opt => opt.isCorrect);
        if (!hasCorrectAnswer) {
          toast({
            title: 'Error',
            description: 'Please mark at least one option as correct',
            variant: 'destructive',
          });
          return;
        }
      }

      // First create the question
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({
          question_text: questionForm.question_text,
          question_type: questionForm.question_type,
          difficulty_level: questionForm.difficulty_level,
          points: questionForm.points,
          explanation: questionForm.explanation || null,
          created_by: user?.id || '',
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Then create the options if it's MCQ or True/False
      if (questionForm.question_type === 'mcq' || questionForm.question_type === 'true_false') {
        const optionsToInsert = questionForm.options
          .filter(opt => opt.text.trim() !== '')
          .map((opt, index) => ({
            question_id: questionData.id,
            option_text: opt.text,
            is_correct: opt.isCorrect,
            option_order: index + 1,
          }));

        const { error: optionsError } = await supabase
          .from('question_options')
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      await fetchData();
      setIsAddingQuestion(false);
      resetQuestionForm();
      
      toast({
        title: 'Question Added',
        description: 'Question has been added to the bank successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add question',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: 'Question Deleted',
        description: 'Question has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete question',
        variant: 'destructive',
      });
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: '',
      question_type: 'mcq',
      difficulty_level: 'medium',
      points: 1,
      subject_id: '',
      explanation: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]
    });
  };

  const updateOption = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...questionForm.options];
    if (field === 'isCorrect' && value === true && questionForm.question_type === 'mcq') {
      // For MCQ, allow multiple correct answers
      newOptions[index].isCorrect = value as boolean;
    } else if (field === 'isCorrect' && value === true && questionForm.question_type === 'true_false') {
      // For True/False, only one correct answer
      newOptions.forEach((opt, i) => opt.isCorrect = i === index);
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value };
    }
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || question.subject_name === filterSubject;
    const matchesDifficulty = filterDifficulty === 'all' || question.difficulty_level === filterDifficulty;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const getStats = () => {
    return {
      total: questions.length,
      easy: questions.filter(q => q.difficulty_level === 'easy').length,
      medium: questions.filter(q => q.difficulty_level === 'medium').length,
      hard: questions.filter(q => q.difficulty_level === 'hard').length,
    };
  };

  const stats = getStats();

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.easy}</div>
            <div className="text-sm text-muted-foreground">Easy</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats.medium}</div>
            <div className="text-sm text-muted-foreground">Medium</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.hard}</div>
            <div className="text-sm text-muted-foreground">Hard</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.name}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddingQuestion} onOpenChange={setIsAddingQuestion}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question_text">Question</Label>
                  <Textarea
                    id="question_text"
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                    placeholder="Enter your question here..."
                    required
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="question_type">Question Type</Label>
                    <Select
                      value={questionForm.question_type}
                      onValueChange={(value: 'mcq' | 'true_false' | 'fill_blank') =>
                        setQuestionForm({ ...questionForm, question_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty_level">Difficulty</Label>
                    <Select
                      value={questionForm.difficulty_level}
                      onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                        setQuestionForm({ ...questionForm, difficulty_level: value })
                      }
                    >
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

                {(questionForm.question_type === 'mcq' || questionForm.question_type === 'true_false') && (
                  <div className="space-y-4">
                    <Label>Options</Label>
                    {questionForm.question_type === 'true_false' ? (
                      <RadioGroup 
                        value={questionForm.options.findIndex(opt => opt.isCorrect).toString()}
                        onValueChange={(value) => {
                          const newOptions = [
                            { text: 'True', isCorrect: value === '0' },
                            { text: 'False', isCorrect: value === '1' }
                          ];
                          setQuestionForm({ ...questionForm, options: newOptions });
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="0" id="true" />
                          <Label htmlFor="true">True</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="false" />
                          <Label htmlFor="false">False</Label>
                        </div>
                      </RadioGroup>
                    ) : (
                      <div className="space-y-3">
                        {questionForm.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={option.isCorrect}
                              onChange={(e) => updateOption(index, 'isCorrect', e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <Label className="text-sm font-medium">
                              {String.fromCharCode(65 + index)}.
                            </Label>
                            <Input
                              value={option.text}
                              onChange={(e) => updateOption(index, 'text', e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                              required={index < 2}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="explanation">Explanation (Optional)</Label>
                  <Textarea
                    id="explanation"
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    placeholder="Explain the correct answer..."
                    rows={2}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button type="submit">Add Question</Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddingQuestion(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({filteredQuestions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <div
                key={question.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        question.difficulty_level === 'hard'
                          ? 'destructive'
                          : question.difficulty_level === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {question.difficulty_level}
                    </Badge>
                    <Badge variant="outline">{question.question_type.toUpperCase()}</Badge>
                    <Badge variant="outline">{question.subject_name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {question.points} {question.points === 1 ? 'point' : 'points'}
                    </span>
                  </div>
                  <p className="font-medium line-clamp-2">{question.question_text}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(question.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewQuestion(question)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingQuestion(question)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteQuestion(question.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Question Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{previewQuestion.question_type.toUpperCase()}</Badge>
                <Badge variant="outline">{previewQuestion.difficulty_level}</Badge>
                <Badge variant="outline">{previewQuestion.subject_name}</Badge>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium">{previewQuestion.question_text}</p>
              </div>
              
              {previewQuestion.question_type !== 'fill_blank' && previewQuestion.options && (
                <div className="space-y-2">
                  <Label>Options:</Label>
                  {previewQuestion.options.map((option, index) => (
                    <div
                      key={option.id}
                      className={`p-2 rounded border ${
                        option.is_correct ? 'bg-success/10 border-success' : 'bg-background'
                      }`}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option.option_text}
                      {option.is_correct && (
                        <Badge className="ml-2" variant="outline">
                          Correct
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {previewQuestion.explanation && (
                <div className="space-y-2">
                  <Label>Explanation:</Label>
                  <p className="text-sm text-muted-foreground">{previewQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};