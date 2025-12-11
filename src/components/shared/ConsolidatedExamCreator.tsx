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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Minus, Eye, Save, FileText, X, Flag, Copy, Shuffle, BookOpen, Target, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { useToast } from '@/hooks/use-toast';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';
import { EnhancedQuestionForm } from './EnhancedQuestionForm';

// Default to show all questions (high number that will be capped by total)
const DEFAULT_QUESTIONS_PER_STUDENT = 9999;

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  options: QuestionOption[];
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
  questionsPerStudent: number;
  examCategory: 'regular' | 'entrance';
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
  const { withSchoolFilter, withSchoolData, schoolId } = useSchoolQuery();
  
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
    questionsPerStudent: DEFAULT_QUESTIONS_PER_STUDENT,
    examCategory: 'regular',
  });

  // Manual question creation
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // Question bank selection
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionBankQuestions, setQuestionBankQuestions] = useState<any[]>([]);

  // Randomized generation
  const [criteria, setCriteria] = useState<QuestionCriteria[]>([]);

  const { isLoading: schoolLoading } = useSchool();

  useEffect(() => {
    if (isOpen && !schoolLoading && schoolId) {
      fetchData();
    }
  }, [isOpen, schoolLoading, schoolId]);

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

      const [subjectsData, classesData, questionsQueryResult] = await Promise.all([
        withSchoolFilter(subjectsQuery),
        withSchoolFilter(classesQuery),
        withSchoolFilter(supabase.from('questions').select(`
          *,
          question_options(*),
          question_banks!inner(
            id,
            name,
            subject_id,
            class_id,
            subjects(name)
          ),
          classes(name)
        `).order('created_at', { ascending: false }))
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);
      if (questionsQueryResult.data) {
        setQuestionBankQuestions(questionsQueryResult.data);
        
        // Process available questions count by subject and difficulty
        const questionCounts: Record<string, Record<string, number>> = {};
        questionsQueryResult.data.forEach((q: any) => {
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
      questionsPerStudent: editingExam.questions_per_student ?? 20,
      examCategory: editingExam.exam_category || 'regular',
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
      questionsPerStudent: DEFAULT_QUESTIONS_PER_STUDENT,
      examCategory: 'regular',
    });
    setQuestions([]);
    setSelectedQuestionIds([]);
    setCriteria([]);
    setActiveTab('metadata');
  };

  // Manual question creation functions
  const handleAddQuestion = (questionData: any) => {
    const newQuestion: Question = {
      id: `q-${Date.now()}-${Math.random()}`,
      questionText: questionData.questionText,
      questionType: questionData.questionType,
      options: questionData.options,
      difficultyLevel: questionData.difficulty,
      marks: questionData.points,
      explanation: questionData.explanation,
      mediaUrl: questionData.mediaUrl,
      formulaLatex: questionData.formulaLatex,
      correctAnswers: questionData.correctAnswers,
    };
    setQuestions(prev => [...prev, newQuestion]);
    // Don't automatically close the form - let user decide
  };

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

  const selectAllQuestions = () => {
    const allQuestionIds = filteredQuestionBankQuestions.map(q => q.id);
    const allSelected = allQuestionIds.every(id => selectedQuestionIds.includes(id));
    
    if (allSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !allQuestionIds.includes(id)));
    } else {
      setSelectedQuestionIds(prev => [...new Set([...prev, ...allQuestionIds])]);
    }
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
      const poolSize = totalQuestions;
      const qps = Math.min(metadata.questionsPerStudent || poolSize, poolSize);

      const examData = withSchoolData({
        title: metadata.title,
        description: metadata.description,
        instructions: metadata.instructions,
        subject_id: metadata.subjectId,
        class_id: metadata.classId || null,
        duration_minutes: metadata.duration,
        total_questions: totalQuestions,
        questions_per_student: qps,
        question_pool_size: poolSize,
        pass_mark: metadata.passMarks,
        start_date: metadata.startDate ? new Date(metadata.startDate).toISOString() : null,
        end_date: metadata.endDate ? new Date(metadata.endDate).toISOString() : null,
        allow_review: metadata.allowReview,
        randomize_questions: metadata.shuffleQuestions,
        shuffle_answers: metadata.shuffleAnswers,
        show_results_immediately: metadata.showResultsImmediately,
        sequential_navigation: metadata.sequentialNavigation,
        allow_question_flagging: metadata.allowQuestionFlagging,
        exam_category: metadata.examCategory,
        status,
        created_by: user?.id,
      });

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
          .insert(withSchoolData({
            name: `${metadata.title} - Questions`,
            subject_id: metadata.subjectId,
            class_id: metadata.classId,
            created_by: user?.id,
          }))
          .select()
          .single();

        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          const { data: questionRecord } = await supabase
            .from('questions')
            .insert(withSchoolData({
              question_text: question.questionText,
              question_type: question.questionType,
              difficulty_level: question.difficultyLevel,
              points: question.marks,
              explanation: question.explanation,
              media_url: question.mediaUrl,
              formula_latex: question.formulaLatex,
              created_by: user?.id,
              question_bank_id: questionBank?.id,
              class_id: metadata.classId,
            }))
            .select()
            .single();

          if (questionRecord) {
            // Save options based on question type
            let optionsToInsert: any[] = [];
            
            if (question.questionType === 'mcq' || question.questionType === 'true_false') {
              optionsToInsert = question.options.map((opt, index) => ({
                question_id: questionRecord.id,
                option_text: opt.text,
                is_correct: opt.isCorrect,
                option_order: index + 1,
              }));
            } else if (question.questionType === 'fill_blank') {
              // For fill in the blank, save correct answers as options
              optionsToInsert = question.correctAnswers?.map((answer, index) => ({
                question_id: questionRecord.id,
                option_text: answer,
                is_correct: true,
                option_order: index + 1,
              })) || [];
            } else if (question.questionType === 'diagram') {
              // For diagram questions, save options if they exist (MCQ-style)
              optionsToInsert = question.options.map((opt, index) => ({
                question_id: questionRecord.id,
                option_text: opt.text,
                is_correct: opt.isCorrect,
                option_order: index + 1,
              }));
            }

            if (optionsToInsert.length > 0) {
              await supabase.from('question_options').insert(optionsToInsert);
            }

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
          let questionQuery = supabase
            .from('questions')
            .select(`
              id,
              points,
              question_banks!inner(subject_id, class_id)
            `)
            .eq('question_banks.subject_id', c.subjectId)
            .eq('difficulty_level', c.difficulty)
            .limit(c.count * 2);

          // Apply class filtering for randomized generation
          if (metadata.classId) {
            questionQuery = questionQuery.or(`question_banks.class_id.is.null,question_banks.class_id.eq.${metadata.classId}`);
          }

          const { data: questions } = await questionQuery;

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

  const filteredQuestionBankQuestions = questionBankQuestions.filter(q => {
    // Filter by subject
    const subjectMatches = !metadata.subjectId || q.question_banks.subject_id === metadata.subjectId;
    
    // Filter by class - show questions that:
    // 1. Have no class assigned (available to all classes), OR
    // 2. Are assigned to the selected class, OR
    // 3. When "All Classes" is selected, show all questions for the subject
    const classMatches = !metadata.classId || 
                        !q.question_banks.class_id || 
                        q.question_banks.class_id === metadata.classId;
    
    return subjectMatches && classMatches;
  });

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="metadata">Details</TabsTrigger>
            <TabsTrigger value="manual">Manual Questions</TabsTrigger>
            <TabsTrigger value="question-bank">Question Bank</TabsTrigger>
            <TabsTrigger value="randomized">Randomized</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full pr-4">
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
                      <Label htmlFor="examCategory">Exam Category</Label>
                      <Select value={metadata.examCategory} onValueChange={(value) => setMetadata({ ...metadata, examCategory: value as 'regular' | 'entrance' })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular Exam</SelectItem>
                          <SelectItem value="entrance">Entrance Exam</SelectItem>
                        </SelectContent>
                      </Select>
                      {metadata.examCategory === 'entrance' && (
                        <p className="text-xs text-muted-foreground">
                          Entrance exams should use question bank for standardized testing
                        </p>
                      )}
                    </div>
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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Questions per Student</Label>
                      <span className="text-sm font-medium">
                        {getTotalQuestionCount() > 0 
                          ? Math.min(metadata.questionsPerStudent, getTotalQuestionCount()) 
                          : 'Add questions first'}
                      </span>
                    </div>
                    {getTotalQuestionCount() > 0 ? (
                      <>
                        <Slider
                          value={[Math.min(metadata.questionsPerStudent, getTotalQuestionCount())]}
                          onValueChange={([value]) => setMetadata({ ...metadata, questionsPerStudent: value })}
                          max={getTotalQuestionCount()}
                          min={1}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground">
                          Total questions in pool: {getTotalQuestionCount()}
                        </p>
                        {metadata.questionsPerStudent < getTotalQuestionCount() && (
                          <Alert className="bg-amber-50 border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800 text-sm">
                              Each student will see a random subset of {Math.min(metadata.questionsPerStudent, getTotalQuestionCount())} questions 
                              from the pool of {getTotalQuestionCount()}. Students may get different questions.
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Add questions in the Manual, Question Bank, or Randomized tab first.
                      </p>
                    )}
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
              {!showQuestionForm ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Manual Question Creation</h3>
                    <Button onClick={() => setShowQuestionForm(true)}>
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
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{question.questionType.toUpperCase()}</Badge>
                                  <Badge variant="secondary">{question.difficultyLevel}</Badge>
                                  <span className="text-sm text-muted-foreground">{question.marks} points</span>
                                </div>
                                <p className="font-medium mb-2">{index + 1}. {question.questionText}</p>
                                {question.mediaUrl && (
                                  <div className="mb-2">
                                    <img src={question.mediaUrl} alt="Question media" className="max-w-xs max-h-32 rounded border" />
                                  </div>
                                )}
                                {question.formulaLatex && (
                                  <div className="mb-2 p-2 bg-gray-50 rounded">
                                    <code className="text-sm">{question.formulaLatex}</code>
                                  </div>
                                )}
                                {question.questionType === 'mcq' || question.questionType === 'true_false' ? (
                                  <ul className="text-sm space-y-1">
                                    {question.options.map((opt, optIndex) => (
                                      <li key={opt.id} className={`flex items-center gap-2 ${opt.isCorrect ? 'text-green-600 font-medium' : ''}`}>
                                        <span className="min-w-0 flex-shrink-0">{String.fromCharCode(65 + optIndex)}.</span>
                                        <span>{opt.text}</span>
                                        {opt.isCorrect && <span className="text-xs">(Correct)</span>}
                                      </li>
                                    ))}
                                  </ul>
                                ) : question.questionType === 'fill_blank' && question.correctAnswers ? (
                                  <div className="text-sm">
                                    <span className="font-medium">Correct answers: </span>
                                    {question.correctAnswers.join(', ')}
                                  </div>
                                ) : null}
                                {question.explanation && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    <strong>Explanation:</strong> {question.explanation}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(question.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Create New Question</h3>
                    <Button variant="outline" onClick={() => setShowQuestionForm(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                  <EnhancedQuestionForm
                    onAddQuestion={handleAddQuestion}
                    classes={classes}
                    subjects={subjects}
                    onCancel={() => setShowQuestionForm(false)}
                    onSaveAndClose={() => setShowQuestionForm(false)}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="question-bank" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Select from Question Bank</h3>
                <div className="flex items-center gap-2">
                  {filteredQuestionBankQuestions.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={selectAllQuestions}
                    >
                      {filteredQuestionBankQuestions.every(q => selectedQuestionIds.includes(q.id)) 
                        ? 'Deselect All' 
                        : 'Select All'}
                    </Button>
                  )}
                  <Badge>{selectedQuestionIds.length} selected</Badge>
                </div>
              </div>

              {!metadata.subjectId ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">Please select a subject first to view available questions.</p>
                  </CardContent>
                </Card>
              ) : filteredQuestionBankQuestions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="space-y-2">
                      <p className="text-muted-foreground">No questions available for the selected subject and class combination.</p>
                      <p className="text-sm text-muted-foreground">
                        {metadata.classId 
                          ? `Try selecting "All Classes" or create questions for this specific class.`
                          : `Create some questions first or select a different subject.`
                        }
                      </p>
                    </div>
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
                                 {question.classes?.name && (
                                   <Badge variant="outline" className="text-xs">
                                     Class: {question.classes.name}
                                   </Badge>
                                 )}
                                 {!question.question_banks.class_id && (
                                   <Badge variant="outline" className="text-xs text-muted-foreground">
                                     All Classes
                                   </Badge>
                                 )}
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
      </DialogContent>
    </Dialog>
  );
};