import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Edit, Trash2, Search, Eye, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BulkQuestionImport } from './BulkQuestionImport';
import { QuestionCategorizer } from '../shared/QuestionCategorizer';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  difficulty_level: 'easy' | 'medium' | 'hard';
  points: number;
  options: QuestionOption[];
  explanation?: string;
  subject_name: string;
  class_name: string;
  created_at: string;
}

interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
}

export const AdminQuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'mcq' as 'mcq' | 'true_false' | 'fill_blank',
    difficulty_level: 'medium' as 'easy' | 'medium' | 'hard',
    points: 1,
    subject_id: '',
    class_id: '',
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
      
      // Fetch questions with subject info
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

      // Fetch classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (questionsData) {
        const formattedQuestions = questionsData.map(q => ({
          ...q,
          options: q.question_options?.sort((a: any, b: any) => a.option_order - b.option_order) || [],
          subject_name: q.question_banks?.subjects?.name || 'Unknown',
          class_name: 'All Classes'
        }));
        setQuestions(formattedQuestions);
        setFilteredQuestions(formattedQuestions);
      }
      
      if (subjectsData) setSubjects(subjectsData);
      if (classesData) setClasses(classesData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
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
      if (!questionForm.subject_id) {
        toast({
          title: 'Error',
          description: 'Please select a subject',
          variant: 'destructive',
        });
        return;
      }

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

      // Get or create question bank
      let { data: questionBank } = await supabase
        .from('question_banks')
        .select('*')
        .eq('subject_id', questionForm.subject_id)
        .single();

      if (!questionBank) {
        const selectedSubject = subjects.find(s => s.id === questionForm.subject_id);
        
        const { data: newBank } = await supabase
          .from('question_banks')
          .insert({
            name: `${selectedSubject?.name} Question Bank`,
            description: `Question bank for ${selectedSubject?.name}`,
            subject_id: questionForm.subject_id,
            created_by: (await supabase.auth.getUser()).data.user?.id || ''
          })
          .select()
          .single();
        
        questionBank = newBank;
      }

      // Create the question
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({
          question_text: questionForm.question_text,
          question_type: questionForm.question_type,
          difficulty_level: questionForm.difficulty_level,
          points: questionForm.points,
          explanation: questionForm.explanation || null,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
          question_bank_id: questionBank?.id
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create options
      if (questionForm.question_type === 'mcq' || questionForm.question_type === 'true_false') {
        const optionsToInsert = questionForm.question_type === 'true_false'
          ? [
              { question_id: questionData.id, option_text: 'True', is_correct: questionForm.options[0].isCorrect, option_order: 1 },
              { question_id: questionData.id, option_text: 'False', is_correct: questionForm.options[1].isCorrect, option_order: 2 }
            ]
          : questionForm.options
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
        description: 'Question has been added successfully.',
      });
    } catch (error: any) {
      console.error('Error adding question:', error);
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
      class_id: '',
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
    if (field === 'isCorrect' && value === true && questionForm.question_type === 'true_false') {
      newOptions.forEach((opt, i) => opt.isCorrect = i === index);
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value };
    }
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const handleFilterChange = (filtered: Question[]) => {
    setFilteredQuestions(filtered);
  };

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Question Bank Management</h2>
          <p className="text-muted-foreground">Create and manage questions for all subjects and classes</p>
        </div>
        <Dialog open={isAddingQuestion} onOpenChange={setIsAddingQuestion}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Question</DialogTitle>
            </DialogHeader>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant={!bulkMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkMode(false)}
                >
                  Single Question
                </Button>
                <Button
                  type="button"
                  variant={bulkMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkMode(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </Button>
              </div>
            </div>

            {bulkMode ? (
              <BulkQuestionImport
                subjects={subjects}
                classes={classes}
                onComplete={() => {
                  fetchData();
                  setIsAddingQuestion(false);
                  setBulkMode(false);
                }}
                onCancel={() => setIsAddingQuestion(false)}
              />
            ) : (
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Select
                      value={questionForm.subject_id}
                      onValueChange={(value) => setQuestionForm({ ...questionForm, subject_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="class">Class *</Label>
                    <Select
                      value={questionForm.class_id}
                      onValueChange={(value) => setQuestionForm({ ...questionForm, class_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question_text">Question *</Label>
                  <Textarea
                    id="question_text"
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                    placeholder="Enter your question here..."
                    required
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      value={questionForm.points}
                      onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="10"
                    />
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
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Subject" />
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
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                className="p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{question.subject_name}</Badge>
                      <Badge 
                        variant={
                          question.difficulty_level === 'easy' ? 'default' :
                          question.difficulty_level === 'medium' ? 'secondary' : 'destructive'
                        }
                      >
                        {question.difficulty_level}
                      </Badge>
                      <Badge variant="outline">{question.points} pts</Badge>
                    </div>
                    <p className="font-medium line-clamp-2">{question.question_text}</p>
                    <div className="text-sm text-muted-foreground">
                      {question.options.length > 0 && (
                        <span>{question.options.length} options • </span>
                      )}
                      Created: {new Date(question.created_at).toLocaleDateString()}
                    </div>
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
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No questions found for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Question Modal */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{previewQuestion.subject_name}</Badge>
                <Badge variant="outline">{previewQuestion.difficulty_level}</Badge>
                <Badge variant="outline">{previewQuestion.points} points</Badge>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{previewQuestion.question_text}</p>
              </div>

              {previewQuestion.options.length > 0 && (
                <div className="space-y-2">
                  <Label>Options:</Label>
                  {previewQuestion.options.map((option, index) => (
                    <div 
                      key={option.id}
                      className={`p-3 rounded border ${
                        option.is_correct ? 'border-success bg-success/10' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                        <span>{option.option_text}</span>
                        {option.is_correct && (
                          <Badge variant="default" className="ml-auto">Correct</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.explanation && (
                <div className="space-y-2">
                  <Label>Explanation:</Label>
                  <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    {previewQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};