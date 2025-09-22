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
  isTeacher?: boolean; // Restrict access for teachers
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
  const [availableQuestions, setAvailableQuestions] = useState<Record<string, Record<string, number>>>({});

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

  // Manual question creation
  const [questions, setQuestions] = useState<Question[]>([]);

  // Question bank selection
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionBankQuestions, setQuestionBankQuestions] = useState<any[]>([]);

  // Randomized generation
  const [criteria, setCriteria] = useState<QuestionCriteria[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingExam && isOpen) {
      loadExamData();
    } else if (!editingExam && isOpen) {
      resetForm();
    }
  }, [editingExam, isOpen]);

  const fetchData = async () => {
    try {
      let subjectsQuery = supabase.from('subjects').select('*').order('name');
      let classesQuery = supabase.from('classes').select('*').order('name');

      // If teacher, restrict to assigned subjects and classes
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

      const [subjectsData, classesData, questionsData] = await Promise.all([
        subjectsQuery,
        classesQuery,
        supabase.from('questions').select(`
          *,
          question_options(*),
          question_banks!inner(
            id,
            name,
            subject_id,
            subjects(name)
          )
        `).order('created_at', { ascending: false })
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);
      if (questionsData.data) {
        setQuestionBankQuestions(questionsData.data);
        
        // Process available questions count by subject and difficulty
        const questionCounts: Record<string, Record<string, number>> = {};
        questionsData.data.forEach((q: any) => {
          const subjectId = q.question_banks.subject_id;
          const difficulty = q.difficulty_level;
          
          if (!questionCounts[subjectId]) {
            questionCounts[subjectId] = { easy: 0, medium: 0, hard: 0 };
          }
          
          questionCounts[subjectId][difficulty] = (questionCounts[subjectId][difficulty] || 0) + 1;
        });
        setAvailableQuestions(questionCounts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const loadExamData = async () => {
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
      sequentialNavigation: editingExam.sequential_navigation ?? false,
      allowQuestionFlagging: editingExam.allow_question_flagging ?? true,
    });

    if (editingExam.id) {
      await loadExamQuestions(editingExam.id);
    }
  };

  const loadExamQuestions = async (examId: string) => {
    try {
      const { data: examQuestions } = await supabase
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

      if (examQuestions) {
        setSelectedQuestionIds(examQuestions.map((eq: any) => eq.questions.id));
      }
    } catch (error) {
      console.error('Error loading exam questions:', error);
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
      sequentialNavigation: false,
      allowQuestionFlagging: true,
    });
    setQuestions([]);
    setSelectedQuestionIds([]);
    setCriteria([]);
    setActiveTab('metadata');
  };

  // Manual question creation functions
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

  // Question bank selection functions
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  // Randomized generation functions
  const addCriteria = () => {
    if (subjects.length > 0) {
      setCriteria([...criteria, {
        subjectId: subjects[0].id,
        difficulty: 'medium',
        count: 5,
      }]);
    }
  };

  const removeCriteria = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriteria = (index: number, field: keyof QuestionCriteria, value: any) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setCriteria(newCriteria);
  };

  const getTotalQuestionCount = () => {
    switch (activeTab) {
      case 'manual':
        return questions.length;
      case 'question-bank':
        return selectedQuestionIds.length;
      case 'randomized':
        return criteria.reduce((sum, c) => sum + c.count, 0);
      default:
        return 0;
    }
  };

  const saveExam = async (status: 'draft' | 'published') => {
    if (!metadata.title || !metadata.subjectId) {
      toast({
        title: 'Validation Error',
        description: 'Please provide exam title and subject',
        variant: 'destructive',
      });
      return;
    }

    const totalQuestions = getTotalQuestionCount();
    if (totalQuestions === 0) {
      toast({
        title: 'No Questions',
        description: 'Please add at least one question to the exam',
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
        total_questions: totalQuestions,
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

      let exam;
      if (editingExam) {
        const { data: updatedExam, error } = await supabase
          .from('exams')
          .update(examData)
          .eq('id', editingExam.id)
          .select()
          .single();

        if (error) throw error;
        exam = updatedExam;

        // Delete existing exam questions
        await supabase.from('exam_questions').delete().eq('exam_id', editingExam.id);
      } else {
        const { data: newExam, error } = await supabase
          .from('exams')
          .insert(examData)
          .select()
          .single();

        if (error) throw error;
        exam = newExam;
      }

      // Save questions based on active tab
      await saveExamQuestions(exam.id);

      toast({
        title: 'Success',
        description: `Exam ${editingExam ? 'updated' : 'created'} successfully`,
      });

      if (onExamCreated) onExamCreated();
      handleOpenChange(false);
      if (!editingExam) resetForm();
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

  const saveExamQuestions = async (examId: string) => {
    let questionsToSave: any[] = [];

    switch (activeTab) {
      case 'manual':
        // Create question bank and save manual questions
        const { data: questionBank } = await supabase
          .from('question_banks')
          .insert({
            name: `${metadata.title} - Questions`,
            subject_id: metadata.subjectId,
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
            // Save options
            const optionsToInsert = question.options.map((opt, index) => ({
              question_id: questionRecord.id,
              option_text: opt.text,
              is_correct: opt.isCorrect,
              option_order: index + 1,
            }));

            await supabase.from('question_options').insert(optionsToInsert);

            questionsToSave.push({
              exam_id: examId,
              question_id: questionRecord.id,
              question_order: i + 1,
              points: question.marks,
            });
          }
        }
        break;

      case 'question-bank':
        questionsToSave = selectedQuestionIds.map((questionId, index) => ({
          exam_id: examId,
          question_id: questionId,
          question_order: index + 1,
          points: 1,
        }));
        break;

      case 'randomized':
        let questionOrder = 1;
        for (const c of criteria) {
          const { data: questions } = await supabase
            .from('questions')
            .select(`
              id,
              points,
              question_banks!inner(subject_id)
            `)
            .eq('question_banks.subject_id', c.subjectId)
            .eq('difficulty_level', c.difficulty)
            .limit(c.count * 2);

          const shuffled = questions?.sort(() => 0.5 - Math.random()) || [];
          const selectedQuestions = shuffled.slice(0, c.count);

          const examQuestions = selectedQuestions.map(q => ({
            exam_id: examId,
            question_id: q.id,
            question_order: questionOrder++,
            points: q.points || 1,
          }));

          questionsToSave.push(...examQuestions);
        }
        break;
    }

    if (questionsToSave.length > 0) {
      await supabase.from('exam_questions').insert(questionsToSave);
    }
  };

  const filteredQuestionBankQuestions = questionBankQuestions.filter(q => 
    !metadata.subjectId || q.question_banks.subject_id === metadata.subjectId
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {editingExam ? 'Edit Exam' : 'Create New Exam'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="metadata">Details</TabsTrigger>
              <TabsTrigger value="manual">Manual Questions</TabsTrigger>
              <TabsTrigger value="question-bank">Question Bank</TabsTrigger>
              <TabsTrigger value="randomized">Randomized</TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4">
              <ScrollArea className="h-full">
            <TabsContent value="metadata" className="space-y-6">
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
                          id="showResultsImmediately"
                          checked={metadata.showResultsImmediately}
                          onCheckedChange={(checked) => setMetadata({ ...metadata, showResultsImmediately: !!checked })}
                        />
                        <Label htmlFor="showResultsImmediately">Show Results Immediately</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sequentialNavigation"
                          checked={metadata.sequentialNavigation}
                          onCheckedChange={(checked) => setMetadata({ ...metadata, sequentialNavigation: !!checked })}
                        />
                        <Label htmlFor="sequentialNavigation">Sequential Navigation</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allowQuestionFlagging"
                          checked={metadata.allowQuestionFlagging}
                          onCheckedChange={(checked) => setMetadata({ ...metadata, allowQuestionFlagging: !!checked })}
                        />
                        <Label htmlFor="allowQuestionFlagging">Allow Question Flagging</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Manual Question Creation</h3>
                <Button onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
              
              {questions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No questions added yet. Click "Add Question" to start.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <Card key={question.id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Question {index + 1}</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => removeQuestion(question.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Question Text</Label>
                          <Textarea
                            value={question.questionText}
                            onChange={(e) => updateQuestion(question.id, 'questionText', e.target.value)}
                            placeholder="Enter question text"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Difficulty</Label>
                            <Select
                              value={question.difficultyLevel}
                              onValueChange={(value: 'easy' | 'medium' | 'hard') => updateQuestion(question.id, 'difficultyLevel', value)}
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
                              value={question.marks}
                              onChange={(e) => updateQuestion(question.id, 'marks', parseInt(e.target.value) || 1)}
                              min={1}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Options</Label>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={option.isCorrect}
                                  onCheckedChange={(checked) => {
                                    const newOptions = question.options.map(opt => ({
                                      ...opt,
                                      isCorrect: opt.id === option.id ? !!checked : false
                                    }));
                                    updateQuestion(question.id, 'options', newOptions);
                                  }}
                                />
                                <Input
                                  placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  value={option.text}
                                  onChange={(e) => {
                                    const newOptions = question.options.map(opt =>
                                      opt.id === option.id ? { ...opt, text: e.target.value } : opt
                                    );
                                    updateQuestion(question.id, 'options', newOptions);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Explanation (Optional)</Label>
                          <Textarea
                            value={question.explanation}
                            onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                            placeholder="Enter explanation for the correct answer"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="question-bank" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Select from Question Bank</h3>
                <Badge>{selectedQuestionIds.length} selected</Badge>
              </div>

              {!metadata.subjectId ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Please select a subject first to view available questions.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredQuestionBankQuestions.map((question) => (
                    <Card key={question.id} className={selectedQuestionIds.includes(question.id) ? 'ring-2 ring-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <Checkbox
                              checked={selectedQuestionIds.includes(question.id)}
                              onCheckedChange={() => toggleQuestionSelection(question.id)}
                            />
                            <div className="space-y-2 flex-1">
                              <p className="font-medium">{question.question_text}</p>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{question.difficulty_level}</Badge>
                                <Badge variant="secondary">{question.points} point(s)</Badge>
                                <Badge variant="outline">{question.question_banks.subjects?.name}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="randomized" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Randomized Question Generation</h3>
                <Button onClick={addCriteria}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Criteria
                </Button>
              </div>

              {criteria.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No criteria added yet. Click "Add Criteria" to start.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {criteria.map((c, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select
                              value={c.subjectId}
                              onValueChange={(value) => updateCriteria(index, 'subjectId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
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
                            <Label>Difficulty</Label>
                            <Select
                              value={c.difficulty}
                              onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                                updateCriteria(index, 'difficulty', value)
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
                            <Label>Questions</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                value={c.count}
                                onChange={(e) => updateCriteria(index, 'count', parseInt(e.target.value) || 0)}
                                min={1}
                                max={availableQuestions[c.subjectId]?.[c.difficulty] || 0}
                              />
                              <Badge variant="outline" className="text-xs">
                                /{availableQuestions[c.subjectId]?.[c.difficulty] || 0}
                              </Badge>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeCriteria(index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {criteria.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Total Questions:</span>
                          <Badge>{criteria.reduce((sum, c) => sum + c.count, 0)}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </div>

        <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Total Questions:</span>
            <Badge variant="outline">{getTotalQuestionCount()}</Badge>
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
      </Tabs>
    </div>
  </DialogContent>
</Dialog>
  );
};