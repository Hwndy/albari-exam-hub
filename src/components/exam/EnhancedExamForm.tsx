import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, Send } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StaticFormLayout } from '@/components/layout/StaticFormLayout';
import { cn } from '@/lib/utils';

interface ExamFormData {
  title: string;
  description: string;
  instructions: string;
  subjectId: string;
  classId: string;
  durationMinutes: number;
  passmark: number;
  startDate: Date | undefined;
  endDate: Date | undefined;
  allowReview: boolean;
  randomizeQuestions: boolean;
  shuffleAnswers: boolean;
  showResultsImmediately: boolean;
  sequentialNavigation: boolean;
  allowQuestionFlagging: boolean;
}

interface EnhancedExamFormProps {
  onSubmit: (data: ExamFormData, asDraft: boolean) => void;
  existingExam?: any;
  onCancel?: () => void;
  isTeacher?: boolean;
}

export const EnhancedExamForm: React.FC<EnhancedExamFormProps> = ({
  onSubmit,
  existingExam,
  onCancel,
  isTeacher = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<ExamFormData>({
    title: '',
    description: '',
    instructions: '',
    subjectId: '',
    classId: '',
    durationMinutes: 60,
    passmark: 50,
    startDate: undefined,
    endDate: undefined,
    allowReview: true,
    randomizeQuestions: true,
    shuffleAnswers: true,
    showResultsImmediately: false,
    sequentialNavigation: false,
    allowQuestionFlagging: true
  });

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (existingExam) {
      setFormData({
        title: existingExam.title || '',
        description: existingExam.description || '',
        instructions: existingExam.instructions || '',
        subjectId: existingExam.subject_id || '',
        classId: existingExam.class_id || '',
        durationMinutes: existingExam.duration_minutes || 60,
        passmark: existingExam.pass_mark || 50,
        startDate: existingExam.start_date ? new Date(existingExam.start_date) : undefined,
        endDate: existingExam.end_date ? new Date(existingExam.end_date) : undefined,
        allowReview: existingExam.allow_review ?? true,
        randomizeQuestions: existingExam.randomize_questions ?? true,
        shuffleAnswers: existingExam.shuffle_answers ?? true,
        showResultsImmediately: existingExam.show_results_immediately ?? false,
        sequentialNavigation: existingExam.sequential_navigation ?? false,
        allowQuestionFlagging: existingExam.allow_question_flagging ?? true
      });
    }
  }, [existingExam]);

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

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Exam title is required',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.subjectId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a subject',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.classId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a class',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.durationMinutes < 1) {
      toast({
        title: 'Validation Error',
        description: 'Duration must be at least 1 minute',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.passmark < 0 || formData.passmark > 100) {
      toast({
        title: 'Validation Error',
        description: 'Pass mark must be between 0 and 100',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await onSubmit(formData, asDraft);
    } finally {
      setLoading(false);
    }
  };

  const formHeader = (
    <CardHeader>
      <CardTitle>
        {existingExam ? 'Edit Exam' : 'Create New Exam'}
      </CardTitle>
    </CardHeader>
  );

  const formFooter = (
    <div className="flex justify-between space-x-2">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <div className="flex space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => handleSubmit(true)}
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button 
          type="button" 
          onClick={() => handleSubmit(false)}
          disabled={loading}
        >
          <Send className="h-4 w-4 mr-2" />
          {existingExam ? 'Update Exam' : 'Publish Exam'}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full h-full flex flex-col">
      <StaticFormLayout
        header={formHeader}
        footer={formFooter}
      >
        <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter exam title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
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
                  value={formData.classId}
                  onValueChange={(value) => setFormData({ ...formData, classId: value })}
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

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="600"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passmark">Pass Mark (%)</Label>
                <Input
                  id="passmark"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passmark}
                  onChange={(e) => setFormData({ ...formData, passmark: parseInt(e.target.value) || 50 })}
                />
              </div>
            </div>

            {/* Description and Instructions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the exam"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Instructions for students taking the exam"
                  rows={4}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, "PPP") : "Pick a start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => setFormData({ ...formData, startDate: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, "PPP") : "Pick an end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => setFormData({ ...formData, endDate: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Exam Settings */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Exam Settings</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowReview"
                    checked={formData.allowReview}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, allowReview: checked as boolean })
                    }
                  />
                  <Label htmlFor="allowReview">Allow review before submission</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="randomizeQuestions"
                    checked={formData.randomizeQuestions}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, randomizeQuestions: checked as boolean })
                    }
                  />
                  <Label htmlFor="randomizeQuestions">Randomize question order</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shuffleAnswers"
                    checked={formData.shuffleAnswers}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, shuffleAnswers: checked as boolean })
                    }
                  />
                  <Label htmlFor="shuffleAnswers">Shuffle answer choices</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showResultsImmediately"
                    checked={formData.showResultsImmediately}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, showResultsImmediately: checked as boolean })
                    }
                  />
                  <Label htmlFor="showResultsImmediately">Show results immediately</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sequentialNavigation"
                    checked={formData.sequentialNavigation}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, sequentialNavigation: checked as boolean })
                    }
                  />
                  <Label htmlFor="sequentialNavigation">Sequential navigation only</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowQuestionFlagging"
                    checked={formData.allowQuestionFlagging}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, allowQuestionFlagging: checked as boolean })
                    }
                  />
                  <Label htmlFor="allowQuestionFlagging">Allow question flagging</Label>
                </div>
              </div>
            </div>
          </div>
      </StaticFormLayout>
    </Card>
  );
};