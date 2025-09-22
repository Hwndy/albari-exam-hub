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
import { Slider } from '@/components/ui/slider';
import { Plus, Minus, Eye, Save, FileText, X, Flag, Copy, Shuffle, BookOpen, Target, Clock } from 'lucide-react';
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

interface QuestionCriteria {
  subjectId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
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
  sequentialNavigation: boolean;
  allowQuestionFlagging: boolean;
}

interface ConsolidatedExamCreatorProps {
  trigger: React.ReactNode;
  onExamCreated?: () => void;
  editingExam?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isTeacher?: boolean;
}

export const ConsolidatedExamCreator: React.FC<ConsolidatedExamCreatorProps> = ({
  trigger,
  onExamCreated,
  editingExam,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  isTeacher = false,
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('metadata');

  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  const handleOpenChange = controlledOnOpenChange || setOpen;

  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

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
    sequentialNavigation: false,
    allowQuestionFlagging: true,
  });

  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      let subjectsQuery = supabase.from('subjects').select('*').order('name');
      let classesQuery = supabase.from('classes').select('*').order('name');

      if (isTeacher) {
        const [subjectAssignments, classAssignments] = await Promise.all([
          supabase
            .from('subject_assignments')
            .select('subject_id')
            .eq('user_id', user?.id),
          supabase
            .from('teacher_class_assignments')
            .select('class_id')
            .eq('teacher_id', user?.id)
        ]);

        if (subjectAssignments.data && subjectAssignments.data.length > 0) {
          const subjectIds = subjectAssignments.data.map(a => a.subject_id);
          subjectsQuery = subjectsQuery.in('id', subjectIds);
        }

        if (classAssignments.data && classAssignments.data.length > 0) {
          const classIds = classAssignments.data.map(a => a.class_id);
          classesQuery = classesQuery.in('id', classIds);
        }
      }

      const [subjectsData, classesData] = await Promise.all([
        subjectsQuery,
        classesQuery
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addQuestion = useCallback(() => {
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
  }, []);

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

  const saveExam = async (status: 'draft' | 'published') => {
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
        sequential_navigation: metadata.sequentialNavigation,
        allow_question_flagging: metadata.allowQuestionFlagging,
        status,
        created_by: user?.id,
      };

      const { data: exam, error } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single();

      if (error) throw error;

      // Create question bank and save questions
      const { data: questionBank } = await supabase
        .from('question_banks')
        .insert({
          name: `${metadata.title} - Questions`,
          subject_id: metadata.subjectId,
          class_id: metadata.classId || null,
          created_by: user?.id,
        })
        .select()
        .single();

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
            exam_id: exam.id,
            question_id: questionRecord.id,
            question_order: i + 1,
            points: question.marks,
          });
        }
      }

      toast({
        title: 'Success',
        description: `Exam ${status === 'draft' ? 'saved as draft' : 'published'} successfully`,
      });

      if (onExamCreated) onExamCreated();
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save exam',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {editingExam ? 'Edit Exam' : 'Create New Exam'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="metadata">
                <FileText className="h-4 w-4 mr-2" />
                Exam Details
              </TabsTrigger>
              <TabsTrigger value="questions">
                <Plus className="h-4 w-4 mr-2" />
                Questions ({questions.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-hidden">
              <TabsContent value="metadata" className="h-full">
                <ScrollArea className="h-full">
                  <div className="pr-4 pb-4 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Exam Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                              id="title"
                              value={metadata.title}
                              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                              placeholder="Enter exam title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="subject">Subject *</Label>
                            <Select value={metadata.subjectId} onValueChange={(value) => setMetadata({ ...metadata, subjectId: value })}>
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="class">Class</Label>
                            <Select value={metadata.classId || "all"} onValueChange={(value) => setMetadata({ ...metadata, classId: value === "all" ? "" : value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select class (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {classes.filter(cls => cls.id && cls.id.trim()).map(cls => (
                                  <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Duration: {metadata.duration} minutes</Label>
                            <Slider
                              value={[metadata.duration]}
                              onValueChange={([value]) => setMetadata({ ...metadata, duration: value })}
                              max={240}
                              min={15}
                              step={15}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={metadata.description}
                            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                            placeholder="Enter exam description"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="instructions">Instructions</Label>
                          <Textarea
                            id="instructions"
                            value={metadata.instructions}
                            onChange={(e) => setMetadata({ ...metadata, instructions: e.target.value })}
                            placeholder="Enter exam instructions"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date & Time</Label>
                            <Input
                              id="startDate"
                              type="datetime-local"
                              value={metadata.startDate}
                              onChange={(e) => setMetadata({ ...metadata, startDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endDate">End Date & Time</Label>
                            <Input
                              id="endDate"
                              type="datetime-local"
                              value={metadata.endDate}
                              onChange={(e) => setMetadata({ ...metadata, endDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Pass Mark: {metadata.passMarks}%</Label>
                          <Slider
                            value={[metadata.passMarks]}
                            onValueChange={([value]) => setMetadata({ ...metadata, passMarks: value })}
                            max={100}
                            min={10}
                            step={5}
                          />
                        </div>

                        <div className="space-y-4">
                          <Label>Exam Settings</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="allowReview"
                                checked={metadata.allowReview}
                                onCheckedChange={(checked) => setMetadata({ ...metadata, allowReview: !!checked })}
                              />
                              <Label htmlFor="allowReview">Allow Review</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="shuffleQuestions"
                                checked={metadata.shuffleQuestions}
                                onCheckedChange={(checked) => setMetadata({ ...metadata, shuffleQuestions: !!checked })}
                              />
                              <Label htmlFor="shuffleQuestions">Shuffle Questions</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="shuffleAnswers"
                                checked={metadata.shuffleAnswers}
                                onCheckedChange={(checked) => setMetadata({ ...metadata, shuffleAnswers: !!checked })}
                              />
                              <Label htmlFor="shuffleAnswers">Shuffle Answers</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="showResults"
                                checked={metadata.showResultsImmediately}
                                onCheckedChange={(checked) => setMetadata({ ...metadata, showResultsImmediately: !!checked })}
                              />
                              <Label htmlFor="showResults">Show Results Immediately</Label>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="questions" className="h-full">
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold">Manual Question Creation</h3>
                    <Button onClick={addQuestion}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="pr-4 pb-4 space-y-4">
                      {questions.length === 0 ? (
                        <Card>
                          <CardContent className="text-center py-8">
                            <p className="text-muted-foreground">No questions added yet. Click "Add Question" to start.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        questions.map((question, index) => (
                          <Card key={question.id}>
                            <CardHeader className="flex flex-row items-center justify-between">
                              <CardTitle className="text-base">Question {index + 1}</CardTitle>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeQuestion(question.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Question Text *</Label>
                                <Textarea
                                  placeholder="Enter your question here..."
                                  value={question.questionText}
                                  onChange={(e) => updateQuestion(question.id, 'questionText', e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Answer Options</Label>
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
                                {question.options.length < 6 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addOption(question.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Option
                                  </Button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Difficulty</Label>
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
                                <div className="space-y-2">
                                  <Label>Marks</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={question.marks}
                                    onChange={(e) => updateQuestion(question.id, 'marks', Number(e.target.value))}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Explanation (Optional)</Label>
                                <Textarea
                                  placeholder="Explain the correct answer..."
                                  value={question.explanation}
                                  onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Total Questions:</span>
            <Badge variant="outline">{questions.length}</Badge>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveExam('draft')} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={() => saveExam('published')} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};