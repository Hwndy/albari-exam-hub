import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Upload, 
  FileText,
  Clock,
  Users,
  BookOpen,
  Target,
  AlertTriangle,
  CheckCircle,
  Copy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Subject {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionText: string;
  options: QuestionOption[];
  explanation?: string;
  marks: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  topic?: string;
  mediaUrl?: string;
}

interface ExamMetadata {
  title: string;
  description?: string;
  instructions?: string;
  subjectId: string;
  classId: string;
  duration: number;
  passMarks: number;
  totalMarks: number;
  startDate?: string;
  endDate?: string;
  allowReview: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResultsImmediately: boolean;
}

interface ExamCreationModalProps {
  trigger: React.ReactNode;
  onExamCreated?: () => void;
}

export const ExamCreationModal: React.FC<ExamCreationModalProps> = ({
  trigger,
  onExamCreated
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('metadata');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [metadata, setMetadata] = useState<ExamMetadata>({
    title: '',
    description: '',
    instructions: '',
    subjectId: '',
    classId: '',
    duration: 60,
    passMarks: 50,
    totalMarks: 0,
    allowReview: true,
    shuffleQuestions: true,
    shuffleAnswers: true,
    showResultsImmediately: false,
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSubjectsAndClasses();
    }
  }, [open]);

  useEffect(() => {
    // Auto-calculate total marks
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    setMetadata(prev => ({ ...prev, totalMarks }));
  }, [questions]);

  const fetchSubjectsAndClasses = async () => {
    try {
      const [subjectsData, classesData] = await Promise.all([
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('classes').select('id, name').order('name')
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects and classes',
        variant: 'destructive',
      });
    }
  };

  const addQuestion = useCallback(() => {
    if (questions.length >= 1000) {
      toast({
        title: 'Limit Reached',
        description: 'Maximum 1000 questions allowed per exam',
        variant: 'destructive',
      });
      return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}-${Math.random()}`,
      questionText: '',
      options: [
        { id: `opt-1-${Date.now()}`, text: '', isCorrect: true },
        { id: `opt-2-${Date.now()}`, text: '', isCorrect: false },
        { id: `opt-3-${Date.now()}`, text: '', isCorrect: false },
        { id: `opt-4-${Date.now()}`, text: '', isCorrect: false },
      ],
      explanation: '',
      marks: 1,
      difficultyLevel: 'medium',
      topic: '',
    };

    setQuestions(prev => [...prev, newQuestion]);
  }, [questions.length, toast]);

  const removeQuestion = useCallback((questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  }, []);

  const updateQuestion = useCallback((questionId: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  }, []);

  const addOption = useCallback((questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId && q.options.length < 6) {
        const newOption = {
          id: `opt-${Date.now()}-${Math.random()}`,
          text: '',
          isCorrect: false,
        };
        return { ...q, options: [...q.options, newOption] };
      }
      return q;
    }));
  }, []);

  const removeOption = useCallback((questionId: string, optionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId && q.options.length > 2) {
        return { ...q, options: q.options.filter(opt => opt.id !== optionId) };
      }
      return q;
    }));
  }, []);

  const updateOption = useCallback((questionId: string, optionId: string, text: string) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map(opt => 
            opt.id === optionId ? { ...opt, text } : opt
          )}
        : q
    ));
  }, []);

  const setCorrectOption = useCallback((questionId: string, optionId: string) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map(opt => 
            ({ ...opt, isCorrect: opt.id === optionId })
          )}
        : q
    ));
  }, []);

  const duplicateQuestion = useCallback((questionId: string) => {
    const questionToDuplicate = questions.find(q => q.id === questionId);
    if (questionToDuplicate && questions.length < 1000) {
      const newQuestion = {
        ...questionToDuplicate,
        id: `q-${Date.now()}-${Math.random()}`,
        options: questionToDuplicate.options.map(opt => ({
          ...opt,
          id: `opt-${Date.now()}-${Math.random()}`,
        })),
      };
      setQuestions(prev => [...prev, newQuestion]);
    }
  }, [questions]);

  const saveDraft = async () => {
    if (!metadata.title || !metadata.subjectId || questions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide exam title, subject, and at least one question',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const examData = {
        title: metadata.title,
        description: metadata.description,
        instructions: metadata.instructions,
        subject_id: metadata.subjectId,
        class_id: metadata.classId || null,
        duration_minutes: metadata.duration,
        total_questions: questions.length,
        pass_mark: metadata.passMarks,
        start_date: metadata.startDate || null,
        end_date: metadata.endDate || null,
        allow_review: metadata.allowReview,
        randomize_questions: metadata.shuffleQuestions,
        shuffle_answers: metadata.shuffleAnswers,
        show_results_immediately: metadata.showResultsImmediately,
        status: 'draft' as const,
        created_by: user?.id,
      };

      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single();

      if (examError) throw examError;

      // Save questions
      await saveQuestions(exam.id);

      toast({
        title: 'Success',
        description: 'Exam saved as draft',
      });

      if (onExamCreated) onExamCreated();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving exam:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save exam',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const publishExam = async () => {
    if (!metadata.title || !metadata.subjectId || questions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide exam title, subject, and at least one question',
        variant: 'destructive',
      });
      return;
    }

    // Validate all questions have correct answers
    const invalidQuestions = questions.filter(q => 
      !q.questionText.trim() || 
      !q.options.some(opt => opt.isCorrect && opt.text.trim()) ||
      q.options.filter(opt => opt.text.trim()).length < 2
    );

    if (invalidQuestions.length > 0) {
      toast({
        title: 'Validation Error',
        description: `${invalidQuestions.length} question(s) are incomplete`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const examData = {
        title: metadata.title,
        description: metadata.description,
        instructions: metadata.instructions,
        subject_id: metadata.subjectId,
        class_id: metadata.classId || null,
        duration_minutes: metadata.duration,
        total_questions: questions.length,
        pass_mark: metadata.passMarks,
        start_date: metadata.startDate || null,
        end_date: metadata.endDate || null,
        allow_review: metadata.allowReview,
        randomize_questions: metadata.shuffleQuestions,
        shuffle_answers: metadata.shuffleAnswers,
        show_results_immediately: metadata.showResultsImmediately,
        status: 'published' as const,
        created_by: user?.id,
      };

      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single();

      if (examError) throw examError;

      // Save questions
      await saveQuestions(exam.id);

      toast({
        title: 'Success',
        description: 'Exam published successfully',
      });

      if (onExamCreated) onExamCreated();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error publishing exam:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to publish exam',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveQuestions = async (examId: string) => {
    // First, create question bank if needed
    const { data: questionBank, error: bankError } = await supabase
      .from('question_banks')
      .insert({
        name: `${metadata.title} - Questions`,
        subject_id: metadata.subjectId,
        created_by: user?.id,
      })
      .select()
      .single();

    if (bankError) throw bankError;

    // Create questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      // Create question
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({
          question_text: question.questionText,
          question_type: 'mcq',
          difficulty_level: question.difficultyLevel,
          points: question.marks,
          explanation: question.explanation,
          question_bank_id: questionBank.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create options
      const optionsData = question.options
        .filter(opt => opt.text.trim())
        .map((option, index) => ({
          question_id: questionData.id,
          option_text: option.text,
          is_correct: option.isCorrect,
          option_order: index + 1,
        }));

      const { error: optionsError } = await supabase
        .from('question_options')
        .insert(optionsData);

      if (optionsError) throw optionsError;

      // Link question to exam
      const { error: examQuestionError } = await supabase
        .from('exam_questions')
        .insert({
          exam_id: examId,
          question_id: questionData.id,
          question_order: i + 1,
          points: question.marks,
        });

      if (examQuestionError) throw examQuestionError;
    }
  };

  const resetForm = () => {
    setMetadata({
      title: '',
      description: '',
      instructions: '',
      subjectId: '',
      classId: '',
      duration: 60,
      passMarks: 50,
      totalMarks: 0,
      allowReview: true,
      shuffleQuestions: true,
      shuffleAnswers: true,
      showResultsImmediately: false,
    });
    setQuestions([]);
    setActiveTab('metadata');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'hard': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Exam</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metadata">Exam Details</TabsTrigger>
            <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="metadata" className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Exam Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., First Term SS2 Mathematics Examination"
                      value={metadata.title}
                      onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={metadata.duration}
                      onChange={(e) => setMetadata(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Select value={metadata.subjectId} onValueChange={(value) => setMetadata(prev => ({ ...prev, subjectId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="class">Class (Optional)</Label>
                    <Select value={metadata.classId} onValueChange={(value) => setMetadata(prev => ({ ...prev, classId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="passMarks">Pass Mark (%)</Label>
                    <Input
                      id="passMarks"
                      type="number"
                      min="0"
                      max="100"
                      value={metadata.passMarks}
                      onChange={(e) => setMetadata(prev => ({ ...prev, passMarks: parseInt(e.target.value) || 50 }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the exam"
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Special instructions for students"
                    value={metadata.instructions}
                    onChange={(e) => setMetadata(prev => ({ ...prev, instructions: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date (Optional)</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={metadata.startDate}
                      onChange={(e) => setMetadata(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={metadata.endDate}
                      onChange={(e) => setMetadata(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Exam Settings</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allowReview"
                        checked={metadata.allowReview}
                        onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, allowReview: !!checked }))}
                      />
                      <Label htmlFor="allowReview">Allow question review</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffleQuestions"
                        checked={metadata.shuffleQuestions}
                        onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, shuffleQuestions: !!checked }))}
                      />
                      <Label htmlFor="shuffleQuestions">Shuffle questions</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffleAnswers"
                        checked={metadata.shuffleAnswers}
                        onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, shuffleAnswers: !!checked }))}
                      />
                      <Label htmlFor="shuffleAnswers">Shuffle answer options</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showResults"
                        checked={metadata.showResultsImmediately}
                        onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, showResultsImmediately: !!checked }))}
                      />
                      <Label htmlFor="showResults">Show results immediately</Label>
                    </div>
                  </div>
                </div>

                {metadata.totalMarks > 0 && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Marks:</span>
                      <span className="text-lg font-bold">{metadata.totalMarks}</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">Questions</h3>
                <Badge variant="outline">{questions.length}/1000</Badge>
              </div>
              <Button onClick={addQuestion} disabled={questions.length >= 1000}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <Card key={question.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge className={getDifficultyColor(question.difficultyLevel)}>
                            {question.difficultyLevel}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateQuestion(question.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeQuestion(question.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Question Text *</Label>
                        <Textarea
                          placeholder="Enter your question here..."
                          value={question.questionText}
                          onChange={(e) => updateQuestion(question.id, { questionText: e.target.value })}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Difficulty Level</Label>
                          <Select 
                            value={question.difficultyLevel} 
                            onValueChange={(value: any) => updateQuestion(question.id, { difficultyLevel: value })}
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
                        
                        <div>
                          <Label>Marks</Label>
                          <Input
                            type="number"
                            min="1"
                            value={question.marks}
                            onChange={(e) => updateQuestion(question.id, { marks: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        
                        <div>
                          <Label>Topic/Tag</Label>
                          <Input
                            placeholder="e.g., Algebra"
                            value={question.topic}
                            onChange={(e) => updateQuestion(question.id, { topic: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Answer Options *</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(question.id)}
                            disabled={question.options.length >= 6}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={option.id} className="flex items-center space-x-2">
                              <RadioGroup
                                value={question.options.find(opt => opt.isCorrect)?.id || ''}
                                onValueChange={(value) => setCorrectOption(question.id, value)}
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value={option.id} />
                                  <Label className="min-w-[20px] text-sm font-medium">
                                    {String.fromCharCode(65 + optionIndex)}
                                  </Label>
                                </div>
                              </RadioGroup>
                              <Input
                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                value={option.text}
                                onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                                className="flex-1"
                              />
                              {question.options.length > 2 && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeOption(question.id, option.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Explanation (Optional)</Label>
                        <Textarea
                          placeholder="Explain the correct answer..."
                          value={question.explanation}
                          onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {questions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <p>No questions added yet. Click "Add Question" to get started.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Exam Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Title:</strong> {metadata.title || 'Untitled Exam'}</div>
                      <div><strong>Duration:</strong> {metadata.duration} minutes</div>
                      <div><strong>Questions:</strong> {questions.length}</div>
                      <div><strong>Total Marks:</strong> {metadata.totalMarks}</div>
                      <div><strong>Pass Mark:</strong> {metadata.passMarks}%</div>
                      <div><strong>Subject:</strong> {subjects.find(s => s.id === metadata.subjectId)?.name || 'Not selected'}</div>
                    </div>
                    {metadata.description && (
                      <div>
                        <strong>Description:</strong>
                        <p className="text-sm text-muted-foreground mt-1">{metadata.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Question {index + 1}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge className={getDifficultyColor(question.difficultyLevel)}>
                            {question.difficultyLevel}
                          </Badge>
                          <Badge variant="outline">{question.marks} mark{question.marks > 1 ? 's' : ''}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">{question.questionText || 'Question text not provided'}</p>
                      <div className="space-y-2">
                        {question.options.filter(opt => opt.text.trim()).map((option, optionIndex) => (
                          <div 
                            key={option.id} 
                            className={`p-2 rounded border ${
                              option.isCorrect 
                                ? 'border-success bg-success/10 text-success' 
                                : 'border-border'
                            }`}
                          >
                            <span className="font-medium mr-2">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            {option.text}
                            {option.isCorrect && (
                              <CheckCircle className="h-4 w-4 inline ml-2" />
                            )}
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <div className="mt-4 p-3 bg-accent/10 rounded">
                          <strong className="text-sm">Explanation:</strong>
                          <p className="text-sm mt-1">{question.explanation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? 's' : ''} • 
            {metadata.totalMarks} total marks
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="secondary" 
              onClick={saveDraft}
              disabled={saving || !metadata.title || !metadata.subjectId || questions.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              onClick={publishExam}
              disabled={saving || !metadata.title || !metadata.subjectId || questions.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Publish Exam
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};