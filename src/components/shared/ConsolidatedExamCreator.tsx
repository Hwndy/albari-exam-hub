import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Upload, Calculator, Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EnhancedQuestionForm } from '@/components/shared/EnhancedQuestionForm';

interface Question {
  id: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  marks: number;
  explanation: string;
  mediaUrl?: string;
  formulaLatex?: string;
  correctAnswers?: string[];
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
  const [showQuestionForm, setShowQuestionForm] = useState(false);

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

  // Manual questions
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Question bank selection
  const [questionBankQuestions, setQuestionBankQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  
  // Randomized criteria
  const [criteria, setCriteria] = useState<QuestionCriteria[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (editingExam) {
        loadExamData();
      }
    }
  }, [isOpen, editingExam]);

  // Fetch question bank based on selected subject and class
  useEffect(() => {
    if (metadata.subjectId) {
      fetchQuestionBank();
    }
  }, [metadata.subjectId, metadata.classId]);

  const fetchData = async () => {
    try {
      let subjectsQuery = supabase.from('subjects').select('*');
      let classesQuery = supabase.from('classes').select('*');

      if (isTeacher && user) {
        const [subjectAssignments, classAssignments] = await Promise.all([
          supabase.from('subject_assignments').select('subject_id').eq('user_id', user.id),
          supabase.from('teacher_class_assignments').select('class_id').eq('teacher_id', user.id)
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

  const fetchQuestionBank = async () => {
    try {
      let query = supabase.from('questions').select(`
        *,
        question_options(*),
        question_banks!inner(
          id,
          name,
          subject_id,
          subjects(name)
        )
      `);

      // Filter by subject
      if (metadata.subjectId) {
        query = query.eq('question_banks.subject_id', metadata.subjectId);
      }

      // Filter by class if specified
      if (metadata.classId) {
        query = query.eq('class_id', metadata.classId);
      }

      const { data: questionsData } = await query.order('created_at', { ascending: false });

      if (questionsData) {
        setQuestionBankQuestions(questionsData);
        
        // Process available questions count by subject and difficulty
        const questionCounts: Record<string, Record<string, number>> = {};
        questionsData.forEach((q: any) => {
          const subjectId = q.question_banks?.subject_id || metadata.subjectId;
          const difficulty = q.difficulty_level;
          
          if (!questionCounts[subjectId]) {
            questionCounts[subjectId] = { easy: 0, medium: 0, hard: 0 };
          }
          
          questionCounts[subjectId][difficulty] = (questionCounts[subjectId][difficulty] || 0) + 1;
        });
        setAvailableQuestions(questionCounts);
      }
    } catch (error) {
      console.error('Error fetching question bank:', error);
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
            question_type,
            difficulty_level,
            explanation,
            media_url,
            formula_latex,
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
        const loadedQuestions = examQuestions.map((eq: any) => {
          const q = eq.questions;
          return {
            id: q.id,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.question_options
              .sort((a: any, b: any) => a.option_order - b.option_order)
              .map((opt: any) => ({
                id: opt.id,
                text: opt.option_text,
                isCorrect: opt.is_correct
              })),
            difficultyLevel: q.difficulty_level,
            marks: eq.points,
            explanation: q.explanation || '',
            mediaUrl: q.media_url,
            formulaLatex: q.formula_latex,
            correctAnswers: q.question_type === 'fill_blank' 
              ? q.question_options.filter((opt: any) => opt.is_correct).map((opt: any) => opt.option_text)
              : []
          };
        });
        setQuestions(loadedQuestions);
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
    setShowQuestionForm(false);
    setActiveTab('metadata');
  };

  const addQuestionFromForm = useCallback((questionData: any) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      questionText: questionData.questionText,
      questionType: questionData.questionType,
      options: questionData.options,
      difficultyLevel: questionData.difficulty,
      marks: questionData.points,
      explanation: questionData.explanation,
      mediaUrl: questionData.mediaUrl,
      formulaLatex: questionData.formulaLatex,
      correctAnswers: questionData.correctAnswers
    };
    setQuestions(prev => [...prev, newQuestion]);
    setShowQuestionForm(false);
  }, []);

  const removeQuestion = useCallback((questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
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
      } else {
        const { data: newExam, error } = await supabase
          .from('exams')
          .insert(examData)
          .select()
          .single();
        
        if (error) throw error;
        exam = newExam;
      }

      // Handle different question sources
      if (activeTab === 'manual') {
        await saveManualQuestions(exam.id);
      } else if (activeTab === 'question-bank') {
        await saveSelectedQuestions(exam.id);
      } else if (activeTab === 'randomized') {
        await generateRandomizedQuestions(exam.id);
      }

      toast({
        title: 'Success',
        description: `Exam ${status === 'draft' ? 'saved as draft' : 'published'} successfully!`,
      });

      handleOpenChange(false);
      resetForm();
      onExamCreated?.();
    } catch (error) {
      console.error('Error saving exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exam. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveManualQuestions = async (examId: string) => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Get or create question bank for this subject and class
      let questionBankId = null;
      if (metadata.subjectId) {
        let { data: questionBank } = await supabase
          .from('question_banks')
          .select('id')
          .eq('subject_id', metadata.subjectId)
          .eq('class_id', metadata.classId || null)
          .maybeSingle();

        if (!questionBank) {
          const { data: newQuestionBank, error: bankError } = await supabase
            .from('question_banks')
            .insert({
              name: `${subjects.find(s => s.id === metadata.subjectId)?.name || 'Subject'} - ${classes.find(c => c.id === metadata.classId)?.name || 'All Classes'}`,
              subject_id: metadata.subjectId,
              class_id: metadata.classId || null,
              created_by: user?.id
            })
            .select()
            .single();

          if (bankError) throw bankError;
          questionBank = newQuestionBank;
        }

        questionBankId = questionBank.id;
      }

      // Insert question
      const questionData = {
        question_text: q.questionText,
        question_type: q.questionType,
        difficulty_level: q.difficultyLevel,
        points: q.marks,
        explanation: q.explanation,
        created_by: user?.id,
        question_bank_id: questionBankId,
        class_id: metadata.classId || null,
        media_url: q.mediaUrl,
        formula_latex: q.formulaLatex
      };

      const { data: questionResponse, error: questionError } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();

      if (questionError) {
        console.error('Error inserting question:', questionError);
        throw questionError;
      }

      // Insert question options based on question type
      let optionsData: any[] = [];
      
      if (q.questionType === 'mcq' || q.questionType === 'diagram') {
        optionsData = q.options.map((option, index) => ({
          question_id: questionResponse.id,
          option_text: option.text,
          is_correct: option.isCorrect,
          option_order: index + 1
        }));
      } else if (q.questionType === 'true_false') {
        optionsData = q.options.map((option, index) => ({
          question_id: questionResponse.id,
          option_text: option.text,
          is_correct: option.isCorrect,
          option_order: index + 1
        }));
      } else if (q.questionType === 'fill_blank') {
        // For fill_blank, store correct answers as options
        optionsData = (q.correctAnswers || []).map((answer, index) => ({
          question_id: questionResponse.id,
          option_text: answer,
          is_correct: true,
          option_order: index + 1
        }));
      }

      if (optionsData.length > 0) {
        const { error: optionsError } = await supabase
          .from('question_options')
          .insert(optionsData);

        if (optionsError) {
          console.error('Error inserting question options:', optionsError);
          throw optionsError;
        }
      }

      // Link question to exam
      const { error: examQuestionError } = await supabase
        .from('exam_questions')
        .insert({
          exam_id: examId,
          question_id: questionResponse.id,
          question_order: i + 1,
          points: q.marks
        });

      if (examQuestionError) {
        console.error('Error linking question to exam:', examQuestionError);
        throw examQuestionError;
      }
    }
  };

  const saveSelectedQuestions = async (examId: string) => {
    const examQuestionsData = selectedQuestionIds.map((questionId, index) => ({
      exam_id: examId,
      question_id: questionId,
      question_order: index + 1,
      points: 1, // Default points, could be customizable
    }));

    const { error } = await supabase
      .from('exam_questions')
      .insert(examQuestionsData);

    if (error) {
      console.error('Error linking questions to exam:', error);
      throw error;
    }
  };

  const generateRandomizedQuestions = async (examId: string) => {
    const selectedQuestions: any[] = [];
    
    for (const criterion of criteria) {
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          *,
          question_banks!inner(subject_id)
        `)
        .eq('question_banks.subject_id', criterion.subjectId)
        .eq('difficulty_level', criterion.difficulty)
        .limit(criterion.count * 2); // Get more than needed for randomization

      if (questions && questions.length > 0) {
        // Shuffle and take required count
        const shuffled = questions.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, criterion.count);
        selectedQuestions.push(...selected);
      }
    }

    // Insert exam questions
    const examQuestionsData = selectedQuestions.map((question, index) => ({
      exam_id: examId,
      question_id: question.id,
      question_order: index + 1,
      points: question.points || 1,
    }));

    const { error } = await supabase
      .from('exam_questions')
      .insert(examQuestionsData);

    if (error) {
      console.error('Error inserting randomized questions:', error);
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <DialogTitle>
            {editingExam ? 'Edit Exam' : 'Create New Exam'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="flex-shrink-0 px-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="metadata">Details</TabsTrigger>
                <TabsTrigger value="manual">Manual Questions</TabsTrigger>
                <TabsTrigger value="question-bank">Question Bank</TabsTrigger>
                <TabsTrigger value="randomized">Randomized</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {/* Details Tab */}
                  <TabsContent value="metadata" className="space-y-6 mt-0">
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

                  {/* Manual Questions Tab */}
                  <TabsContent value="manual" className="space-y-6 mt-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Manual Question Creation</h3>
                      <Button onClick={() => setShowQuestionForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                    
                    {showQuestionForm && (
                      <Card>
                        <CardContent className="p-6">
                          <EnhancedQuestionForm
                            onAddQuestion={addQuestionFromForm}
                            onCancel={() => setShowQuestionForm(false)}
                            classes={classes}
                            subjects={subjects}
                          />
                        </CardContent>
                      </Card>
                    )}
                    
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
                              <CardTitle className="text-base">
                                Question {index + 1} ({question.questionType.replace('_', ' ').toUpperCase()}) - {question.marks} marks
                              </CardTitle>
                              <Button variant="outline" size="sm" onClick={() => removeQuestion(question.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Question Text</Label>
                                <div className="prose prose-sm max-w-none">
                                  {question.questionText || 'No question text'}
                                </div>
                              </div>
                              
                              {question.mediaUrl && (
                                <div className="space-y-2">
                                  <Label>Media</Label>
                                  <img 
                                    src={question.mediaUrl} 
                                    alt="Question media" 
                                    className="max-w-full h-auto border rounded-lg"
                                  />
                                </div>
                              )}
                              
                              {question.formulaLatex && (
                                <div className="space-y-2">
                                  <Label>Formula</Label>
                                  <div className="p-2 bg-muted rounded border">
                                    <code>{question.formulaLatex}</code>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label>Answer Options</Label>
                                {question.questionType === 'mcq' && (
                                  <div className="space-y-2">
                                    {question.options.map((option, optIndex) => (
                                      <div key={option.id} className={`flex items-center space-x-2 p-2 rounded ${option.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                        <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                        <span>{option.text}</span>
                                        {option.isCorrect && <Badge variant="secondary">Correct</Badge>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {question.questionType === 'true_false' && (
                                  <div className="space-y-2">
                                    {question.options.map((option, optIndex) => (
                                      <div key={option.id} className={`flex items-center space-x-2 p-2 rounded ${option.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                        <span className="font-medium">{option.text}:</span>
                                        {option.isCorrect && <Badge variant="secondary">Correct Answer</Badge>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {question.questionType === 'fill_blank' && (
                                  <div className="space-y-2">
                                    <Label>Correct Answers:</Label>
                                    <div className="flex flex-wrap gap-2">
                                      {question.correctAnswers?.map((answer, idx) => (
                                        <Badge key={idx} variant="secondary">{answer}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {question.questionType === 'diagram' && (
                                  <div className="space-y-2">
                                    {question.options.length > 0 ? (
                                      <div className="space-y-2">
                                        {question.options.map((option, optIndex) => (
                                          <div key={option.id} className={`flex items-center space-x-2 p-2 rounded ${option.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                            <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                            <span>{option.text}</span>
                                            {option.isCorrect && <Badge variant="secondary">Correct</Badge>}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-muted-foreground">Short answer question</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {question.explanation && (
                                <div className="space-y-2">
                                  <Label>Explanation</Label>
                                  <div className="p-3 bg-blue-50 rounded border">
                                    {question.explanation}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <Badge variant="outline">{question.difficultyLevel}</Badge>
                                <span>{question.marks} mark{question.marks !== 1 ? 's' : ''}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Question Bank Tab */}
                  <TabsContent value="question-bank" className="space-y-6 mt-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Select from Question Bank</h3>
                      <Badge>{selectedQuestionIds.length} selected</Badge>
                    </div>

                    {!metadata.subjectId ? (
                      <Card>
                        <CardContent className="text-center py-8">
                          <p className="text-muted-foreground">Please select a subject in the Details tab first.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {questionBankQuestions.length === 0 ? (
                          <Card>
                            <CardContent className="text-center py-8">
                              <p className="text-muted-foreground">
                                No questions available for the selected subject
                                {metadata.classId ? ' and class' : ''}.
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          questionBankQuestions.map((question) => (
                            <Card key={question.id} className={selectedQuestionIds.includes(question.id) ? 'ring-2 ring-primary' : ''}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={selectedQuestionIds.includes(question.id)}
                                        onCheckedChange={() => toggleQuestionSelection(question.id)}
                                      />
                                      <h4 className="font-medium">{question.question_text}</h4>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                      <Badge variant="outline">{question.question_type}</Badge>
                                      <Badge variant="outline">{question.difficulty_level}</Badge>
                                      <span>{question.points} points</span>
                                      {question.question_banks?.subjects?.name && (
                                        <span>Subject: {question.question_banks.subjects.name}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Randomized Tab */}
                  <TabsContent value="randomized" className="space-y-6 mt-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Randomized Question Generation</h3>
                      <Button onClick={addCriteria}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Criteria
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {criteria.map((criterion, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium">Criteria {index + 1}</h4>
                              <Button variant="outline" size="sm" onClick={() => removeCriteria(index)}>
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Subject</Label>
                                <Select 
                                  value={criterion.subjectId}
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
                                  value={criterion.difficulty}
                                  onValueChange={(value: 'easy' | 'medium' | 'hard') => updateCriteria(index, 'difficulty', value)}
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
                                <Label>Count</Label>
                                <Input
                                  type="number"
                                  value={criterion.count}
                                  onChange={(e) => updateCriteria(index, 'count', parseInt(e.target.value) || 0)}
                                  min={1}
                                />
                              </div>
                            </div>
                            
                            {availableQuestions[criterion.subjectId] && (
                              <div className="mt-4 text-sm text-muted-foreground">
                                Available: {availableQuestions[criterion.subjectId][criterion.difficulty] || 0} questions
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      
                      {criteria.length === 0 && (
                        <Card>
                          <CardContent className="text-center py-8">
                            <p className="text-muted-foreground">No criteria added yet. Click "Add Criteria" to start.</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 border-t bg-background p-4">
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => saveExam('draft')}
                disabled={saving}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => saveExam('published')}
                disabled={saving}
              >
                {saving ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};