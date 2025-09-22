import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Eye, Save, FileText, X, Flag, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionText: string;
  options: QuestionOption[];
  difficultyLevel: 'easy' | 'medium' | 'hard';
  marks: number;
  explanation: string;
  tags: string;
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
  editingExam?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ExamCreationModal: React.FC<ExamCreationModalProps> = ({
  trigger,
  onExamCreated,
  editingExam,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  const handleOpenChange = controlledOnOpenChange || setOpen;

  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('metadata');

  const [metadata, setMetadata] = useState<ExamMetadata>({
    title: '',
    description: '',
    instructions: '',
    subjectId: '',
    classId: '',
    duration: 60,
    passMarks: 50,
    totalMarks: 100,
    startDate: '',
    endDate: '',
    allowReview: true,
    shuffleQuestions: true,
    shuffleAnswers: true,
    showResultsImmediately: false,
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-1',
      questionText: '',
      options: [
        { id: 'opt-1', text: '', isCorrect: false },
        { id: 'opt-2', text: '', isCorrect: false },
        { id: 'opt-3', text: '', isCorrect: false },
        { id: 'opt-4', text: '', isCorrect: false },
      ],
      difficultyLevel: 'medium',
      marks: 1,
      explanation: '',
      tags: '',
    }
  ]);

  useEffect(() => {
    fetchSubjects();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (editingExam && isOpen) {
      setMetadata({
        title: editingExam.title || '',
        description: editingExam.description || '',
        instructions: editingExam.instructions || '',
        subjectId: editingExam.subject_id || '',
        classId: editingExam.class_id || '',
        duration: editingExam.duration_minutes || 60,
        passMarks: editingExam.pass_mark || 50,
        totalMarks: 100,
        startDate: editingExam.start_date ? new Date(editingExam.start_date).toISOString().slice(0, 16) : '',
        endDate: editingExam.end_date ? new Date(editingExam.end_date).toISOString().slice(0, 16) : '',
        allowReview: editingExam.allow_review ?? true,
        shuffleQuestions: editingExam.randomize_questions ?? true,
        shuffleAnswers: editingExam.shuffle_answers ?? true,
        showResultsImmediately: editingExam.show_results_immediately ?? false,
      });

      if (editingExam.id) {
        loadExamQuestions(editingExam.id);
      }
    } else if (!editingExam && isOpen) {
      resetForm();
    }
  }, [editingExam, isOpen]);

  const loadExamQuestions = async (examId: string) => {
    try {
      const { data: examQuestions, error } = await supabase
        .from('exam_questions')
        .select(`
          question_order,
          points,
          questions (
            id,
            question_text,
            difficulty_level,
            explanation,
            question_options (
              id,
              option_text,
              is_correct,
              option_order
            )
          )
        `)
        .eq('exam_id', examId)
        .order('question_order');

      if (error) throw error;

      const loadedQuestions = examQuestions?.map((eq: any) => ({
        id: eq.questions.id,
        questionText: eq.questions.question_text,
        options: eq.questions.question_options
          .sort((a: any, b: any) => a.option_order - b.option_order)
          .map((opt: any) => ({
            id: opt.id,
            text: opt.option_text,
            isCorrect: opt.is_correct,
          })),
        difficultyLevel: eq.questions.difficulty_level,
        marks: eq.points,
        explanation: eq.questions.explanation || '',
        tags: '',
      })) || [];

      setQuestions(loadedQuestions);
    } catch (error) {
      console.error('Error loading exam questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exam questions',
        variant: 'destructive',
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
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
        { id: `opt-${Date.now()}-1`, text: '', isCorrect: false },
        { id: `opt-${Date.now()}-2`, text: '', isCorrect: false },
        { id: `opt-${Date.now()}-3`, text: '', isCorrect: false },
        { id: `opt-${Date.now()}-4`, text: '', isCorrect: false },
      ],
      difficultyLevel: 'medium',
      marks: 1,
      explanation: '',
      tags: '',
    };

    setQuestions(prev => [...prev, newQuestion]);
  }, [questions.length, toast]);

  const removeQuestion = useCallback((questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  }, []);

  const updateQuestion = useCallback((questionId: string, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  }, []);

  const addOption = useCallback((questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId && q.options.length < 6) {
        const newOption = { id: `opt-${Date.now()}-${Math.random()}`, text: '', isCorrect: false };
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
        start_date: metadata.startDate ? new Date(metadata.startDate).toISOString() : null,
        end_date: metadata.endDate ? new Date(metadata.endDate).toISOString() : null,
        allow_review: metadata.allowReview,
        randomize_questions: metadata.shuffleQuestions,
        shuffle_answers: metadata.shuffleAnswers,
        show_results_immediately: metadata.showResultsImmediately,
        status: 'draft' as const,
        created_by: user?.id,
      };

      let exam;
      if (editingExam) {
        const { data: updatedExam, error: examError } = await supabase
          .from('exams')
          .update(examData)
          .eq('id', editingExam.id)
          .select()
          .single();

        if (examError) throw examError;
        exam = updatedExam;

        await supabase
          .from('exam_questions')
          .delete()
          .eq('exam_id', editingExam.id);
      } else {
        const { data: newExam, error: examError } = await supabase
          .from('exams')
          .insert(examData)
          .select()
          .single();

        if (examError) throw examError;
        exam = newExam;
      }

      await saveQuestions(exam.id);

      toast({
        title: 'Success',
        description: editingExam ? 'Exam updated successfully' : 'Exam saved as draft',
      });

      if (onExamCreated) onExamCreated();
      handleOpenChange(false);
      if (!editingExam) resetForm();
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
        start_date: metadata.startDate ? new Date(metadata.startDate).toISOString() : null,
        end_date: metadata.endDate ? new Date(metadata.endDate).toISOString() : null,
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

      await saveQuestions(exam.id);

      toast({
        title: 'Success',
        description: 'Exam published successfully',
      });

      if (onExamCreated) onExamCreated();
      handleOpenChange(false);
      if (!editingExam) resetForm();
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
    const { data: questionBank, error: bankError } = await supabase
      .from('question_banks')
      .insert({
        name: `${metadata.title} - Questions`,
        subject_id: metadata.subjectId,
        class_id: metadata.classId || null,
        created_by: user?.id,
      })
      .select()
      .single();

    if (bankError) throw bankError;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const { data: questionRecord } = await supabase
        .from('questions')
        .insert({
          question_text: question.questionText,
          question_type: 'mcq',
          difficulty_level: question.difficultyLevel,
          points: question.marks,
          explanation: question.explanation,
          created_by: user?.id,
          question_bank_id: questionBank?.id,
        })
        .select()
        .single();

      if (questionRecord) {
        const optionsToInsert = question.options.map((opt, index) => ({
          question_id: questionRecord.id,
          option_text: opt.text,
          is_correct: opt.isCorrect,
          option_order: index + 1,
        }));

        await supabase.from('question_options').insert(optionsToInsert);

        await supabase.from('exam_questions').insert({
          exam_id: examId,
          question_id: questionRecord.id,
          question_order: i + 1,
          points: question.marks,
        });
      }
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
      totalMarks: 100,
      startDate: '',
      endDate: '',
      allowReview: true,
      shuffleQuestions: true,
      shuffleAnswers: true,
      showResultsImmediately: false,
    });
    setQuestions([{
      id: 'q-1',
      questionText: '',
      options: [
        { id: 'opt-1', text: '', isCorrect: false },
        { id: 'opt-2', text: '', isCorrect: false },
        { id: 'opt-3', text: '', isCorrect: false },
        { id: 'opt-4', text: '', isCorrect: false },
      ],
      difficultyLevel: 'medium',
      marks: 1,
      explanation: '',
      tags: '',
    }]);
    setActiveTab('metadata');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {editingExam ? 'Edit Exam' : 'Create New Exam'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="metadata">
                <FileText className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="questions">
                <Plus className="h-4 w-4 mr-2" />
                Questions ({questions.length})
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-hidden">
              <TabsContent value="metadata" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-6 pr-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Exam Title *</Label>
                        <Input
                          id="title"
                          placeholder="e.g. First Term SS2 Mathematics Examination"
                          value={metadata.title}
                          onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <Select
                          value={metadata.subjectId}
                          onValueChange={(value) => setMetadata(prev => ({ ...prev, subjectId: value }))}
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

                      <div>
                        <Label htmlFor="class">Class</Label>
                        <Select
                          value={metadata.classId}
                          onValueChange={(value) => setMetadata(prev => ({ ...prev, classId: value === "all" ? "" : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            {classes.map(cls => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          value={metadata.duration}
                          onChange={(e) => setMetadata(prev => ({ ...prev, duration: Number(e.target.value) }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="passMarks">Pass Mark (%)</Label>
                        <Input
                          id="passMarks"
                          type="number"
                          min="0"
                          max="100"
                          value={metadata.passMarks}
                          onChange={(e) => setMetadata(prev => ({ ...prev, passMarks: Number(e.target.value) }))}
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
                          <Label htmlFor="allowReview">Allow Review</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="shuffleQuestions"
                            checked={metadata.shuffleQuestions}
                            onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, shuffleQuestions: !!checked }))}
                          />
                          <Label htmlFor="shuffleQuestions">Shuffle Questions</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="shuffleAnswers"
                            checked={metadata.shuffleAnswers}
                            onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, shuffleAnswers: !!checked }))}
                          />
                          <Label htmlFor="shuffleAnswers">Shuffle Answers</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showResults"
                            checked={metadata.showResultsImmediately}
                            onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, showResultsImmediately: !!checked }))}
                          />
                          <Label htmlFor="showResults">Show Results Immediately</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="questions" className="h-full">
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <span className="font-medium">Questions ({questions.length}/1000)</span>
                    </div>
                    <Button onClick={addQuestion} disabled={questions.length >= 1000}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="space-y-6 pr-4 pb-4">
                      {questions.map((question, qIndex) => (
                        <Card key={question.id} className="p-4">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => duplicateQuestion(question.id)}
                                disabled={questions.length >= 1000}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {questions.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeQuestion(question.id)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label>Question Text *</Label>
                              <Textarea
                                placeholder="Enter your question here..."
                                value={question.questionText}
                                onChange={(e) => updateQuestion(question.id, 'questionText', e.target.value)}
                              />
                            </div>

                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <Label>Answer Options *</Label>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addOption(question.id)}
                                  disabled={question.options.length >= 6}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Option
                                </Button>
                              </div>

                              {question.options.map((option, optIndex) => (
                                <div key={option.id} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={option.isCorrect}
                                    onCheckedChange={() => setCorrectOption(question.id, option.id)}
                                  />
                                  <Input
                                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                    value={option.text}
                                    onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                                  />
                                  {question.options.length > 2 && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => removeOption(question.id, option.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Difficulty Level</Label>
                                <Select
                                  value={question.difficultyLevel}
                                  onValueChange={(value) => updateQuestion(question.id, 'difficultyLevel', value)}
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
                                  onChange={(e) => updateQuestion(question.id, 'marks', Number(e.target.value))}
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Explanation (Optional)</Label>
                              <Textarea
                                placeholder="Explain the correct answer..."
                                value={question.explanation}
                                onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="h-full">
                <div className="h-full flex flex-col">
                  <div className="text-center space-y-4 flex-shrink-0 mb-4">
                    <h3 className="text-lg font-semibold">{metadata.title || 'Untitled Exam'}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Duration:</span> {metadata.duration} mins
                      </div>
                      <div>
                        <span className="font-medium">Questions:</span> {questions.length}
                      </div>
                      <div>
                        <span className="font-medium">Pass Mark:</span> {metadata.passMarks}%
                      </div>
                      <div>
                        <span className="font-medium">Total Marks:</span> {questions.reduce((sum, q) => sum + q.marks, 0)}
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-4 pb-4">
                      {questions.map((question, index) => (
                        <Card key={question.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium">Question {index + 1}</h4>
                              <div className="flex gap-2">
                                <Badge variant={question.difficultyLevel === 'easy' ? 'default' : question.difficultyLevel === 'hard' ? 'destructive' : 'secondary'}>
                                  {question.difficultyLevel}
                                </Badge>
                                <Badge variant="outline">{question.marks} mark{question.marks > 1 ? 's' : ''}</Badge>
                              </div>
                            </div>
                            <p>{question.questionText || 'Question text not provided'}</p>
                            <div className="space-y-2">
                              {question.options.filter(opt => opt.text.trim()).map((option, optIndex) => (
                                <div key={option.id} className={`p-2 rounded border ${option.isCorrect ? 'bg-green-50 border-green-200' : ''}`}>
                                  {String.fromCharCode(65 + optIndex)}. {option.text}
                                  {option.isCorrect && <span className="ml-2 text-green-600 font-medium">(Correct)</span>}
                                </div>
                              ))}
                            </div>
                            {question.explanation && (
                              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                                <span className="font-medium text-blue-800">Explanation:</span> {question.explanation}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-between items-center pt-6 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveDraft} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {editingExam ? 'Update' : 'Save Draft'}
            </Button>
            {!editingExam && (
              <Button onClick={publishExam} disabled={saving}>
                <Eye className="h-4 w-4 mr-2" />
                Publish Exam
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};