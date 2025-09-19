import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  CalendarIcon, 
  Clock, 
  Settings, 
  Eye,
  Save,
  Send,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Exam {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  subject_id?: string;
  class_id?: string;
  duration_minutes: number;
  total_questions: number;
  pass_mark: number;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'published' | 'archived';
  randomize_questions: boolean;
  shuffle_answers: boolean;
  allow_review: boolean;
  show_results_immediately: boolean;
  sequential_navigation: boolean;
  allow_question_flagging: boolean;
  subject_name?: string;
  class_name?: string;
  created_at: string;
  created_by: string;
}

export const ExamBuilder: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    instructions: '',
    subject_id: '',
    class_id: '',
    duration_minutes: 60,
    total_questions: 20,
    pass_mark: 50,
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    randomize_questions: true,
    shuffle_answers: true,
    allow_review: true,
    show_results_immediately: false,
    sequential_navigation: false,
    allow_question_flagging: true,
  });

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch exams
      const { data: examsData } = await supabase
        .from('exams')
        .select(`
          *,
          subjects(name),
          classes(name)
        `)
        .order('created_at', { ascending: false });

      // Fetch subjects, classes, and questions
      const [subjectsData, classesData, questionsData] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('questions').select(`
          *,
          question_options(*),
          question_banks(subjects(name))
        `).order('created_at', { ascending: false })
      ]);

      if (examsData) {
        const formattedExams = examsData.map(exam => ({
          ...exam,
          subject_name: exam.subjects?.name,
          class_name: exam.classes?.name,
        }));
        setExams(formattedExams);
      }
      
      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);
      if (questionsData.data) setQuestions(questionsData.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert({
          title: examForm.title,
          description: examForm.description || null,
          instructions: examForm.instructions || null,
          subject_id: examForm.subject_id || null,
          class_id: examForm.class_id || null,
          duration_minutes: examForm.duration_minutes,
          total_questions: examForm.total_questions,
          pass_mark: examForm.pass_mark,
          start_date: examForm.start_date?.toISOString() || null,
          end_date: examForm.end_date?.toISOString() || null,
          created_by: user?.id || '',
          randomize_questions: examForm.randomize_questions,
          shuffle_answers: examForm.shuffle_answers,
          allow_review: examForm.allow_review,
          show_results_immediately: examForm.show_results_immediately,
          sequential_navigation: examForm.sequential_navigation,
          allow_question_flagging: examForm.allow_question_flagging,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchData();
      setIsCreatingExam(false);
      resetExamForm();
      
      toast({
        title: 'Exam Created',
        description: 'Exam has been created successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create exam',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;

    try {
      const { error } = await supabase
        .from('exams')
        .update({
          title: examForm.title,
          description: examForm.description || null,
          instructions: examForm.instructions || null,
          subject_id: examForm.subject_id || null,
          class_id: examForm.class_id || null,
          duration_minutes: examForm.duration_minutes,
          total_questions: examForm.total_questions,
          pass_mark: examForm.pass_mark,
          start_date: examForm.start_date?.toISOString() || null,
          end_date: examForm.end_date?.toISOString() || null,
          randomize_questions: examForm.randomize_questions,
          shuffle_answers: examForm.shuffle_answers,
          allow_review: examForm.allow_review,
          show_results_immediately: examForm.show_results_immediately,
          sequential_navigation: examForm.sequential_navigation,
          allow_question_flagging: examForm.allow_question_flagging,
        })
        .eq('id', editingExam.id);

      if (error) throw error;

      await fetchData();
      setEditingExam(null);
      resetExamForm();
      
      toast({
        title: 'Exam Updated',
        description: 'Exam has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update exam',
        variant: 'destructive',
      });
    }
  };

  const handlePublishExam = async (examId: string) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ status: 'published' })
        .eq('id', examId);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: 'Exam Published',
        description: 'Exam is now available to students.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to publish exam',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateExam = async (exam: Exam) => {
    try {
      const { error } = await supabase
        .from('exams')
        .insert({
          title: `${exam.title} (Copy)`,
          description: exam.description,
          instructions: exam.instructions,
          subject_id: exam.subject_id,
          class_id: exam.class_id,
          duration_minutes: exam.duration_minutes,
          total_questions: exam.total_questions,
          pass_mark: exam.pass_mark,
          randomize_questions: exam.randomize_questions,
          shuffle_answers: exam.shuffle_answers,
          allow_review: exam.allow_review,
          show_results_immediately: exam.show_results_immediately,
          sequential_navigation: exam.sequential_navigation,
          allow_question_flagging: exam.allow_question_flagging,
          created_by: user?.id || '', // Use actual user ID from auth context
          status: 'draft',
        });

      if (error) throw error;

      await fetchData();
      
      toast({
        title: 'Exam Duplicated',
        description: 'Exam has been duplicated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate exam',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${examTitle}"?`)) return;

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: 'Exam Deleted',
        description: 'Exam has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete exam',
        variant: 'destructive',
      });
    }
  };

  const resetExamForm = () => {
    setExamForm({
      title: '',
      description: '',
      instructions: '',
      subject_id: '',
      class_id: '',
      duration_minutes: 60,
      total_questions: 20,
      pass_mark: 50,
      start_date: undefined,
      end_date: undefined,
      randomize_questions: true,
      shuffle_answers: true,
      allow_review: true,
      show_results_immediately: false,
      sequential_navigation: false,
      allow_question_flagging: true,
    });
  };

  const startEditing = (exam: Exam) => {
    setEditingExam(exam);
    setExamForm({
      title: exam.title,
      description: exam.description || '',
      instructions: exam.instructions || '',
      subject_id: exam.subject_id || '',
      class_id: exam.class_id || '',
      duration_minutes: exam.duration_minutes,
      total_questions: exam.total_questions,
      pass_mark: exam.pass_mark,
      start_date: exam.start_date ? new Date(exam.start_date) : undefined,
      end_date: exam.end_date ? new Date(exam.end_date) : undefined,
      randomize_questions: exam.randomize_questions,
      shuffle_answers: exam.shuffle_answers,
      allow_review: exam.allow_review,
      show_results_immediately: exam.show_results_immediately,
      sequential_navigation: exam.sequential_navigation,
      allow_question_flagging: exam.allow_question_flagging,
    });
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStats = () => {
    return {
      total: exams.length,
      draft: exams.filter(e => e.status === 'draft').length,
      published: exams.filter(e => e.status === 'published').length,
      archived: exams.filter(e => e.status === 'archived').length,
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
            <div className="text-sm text-muted-foreground">Total Exams</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats.draft}</div>
            <div className="text-sm text-muted-foreground">Draft</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.published}</div>
            <div className="text-sm text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.archived}</div>
            <div className="text-sm text-muted-foreground">Archived</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreatingExam} onOpenChange={setIsCreatingExam}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleCreateExam}>
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Exam Title</Label>
                      <Input
                        id="title"
                        value={examForm.title}
                        onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                        placeholder="Enter exam title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Select
                        value={examForm.subject_id}
                        onValueChange={(value) => setExamForm({ ...examForm, subject_id: value })}
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
                      <Label htmlFor="class">Class</Label>
                      <Select
                        value={examForm.class_id}
                        onValueChange={(value) => setExamForm({ ...examForm, class_id: value })}
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
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={examForm.duration_minutes}
                        onChange={(e) => setExamForm({ ...examForm, duration_minutes: parseInt(e.target.value) })}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={examForm.description}
                      onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                      placeholder="Brief description of the exam"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={examForm.instructions}
                      onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
                      placeholder="Instructions for students taking the exam"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {examForm.start_date ? format(examForm.start_date, 'PPP') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={examForm.start_date}
                            onSelect={(date) => setExamForm({ ...examForm, start_date: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {examForm.end_date ? format(examForm.end_date, 'PPP') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={examForm.end_date}
                            onSelect={(date) => setExamForm({ ...examForm, end_date: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Question Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="randomize"
                            checked={examForm.randomize_questions}
                            onCheckedChange={(checked) => 
                              setExamForm({ ...examForm, randomize_questions: checked as boolean })
                            }
                          />
                          <Label htmlFor="randomize">Randomize question order</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="shuffle"
                            checked={examForm.shuffle_answers}
                            onCheckedChange={(checked) => 
                              setExamForm({ ...examForm, shuffle_answers: checked as boolean })
                            }
                          />
                          <Label htmlFor="shuffle">Shuffle answer options</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="flagging"
                            checked={examForm.allow_question_flagging}
                            onCheckedChange={(checked) => 
                              setExamForm({ ...examForm, allow_question_flagging: checked as boolean })
                            }
                          />
                          <Label htmlFor="flagging">Allow question flagging</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-semibold">Navigation & Review</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sequential"
                            checked={examForm.sequential_navigation}
                            onCheckedChange={(checked) => 
                              setExamForm({ ...examForm, sequential_navigation: checked as boolean })
                            }
                          />
                          <Label htmlFor="sequential">Sequential navigation only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="review"
                            checked={examForm.allow_review}
                            onCheckedChange={(checked) => 
                              setExamForm({ ...examForm, allow_review: checked as boolean })
                            }
                          />
                          <Label htmlFor="review">Allow review before submit</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="immediate"
                            checked={examForm.show_results_immediately}
                            onCheckedChange={(checked) => 
                              setExamForm({ ...examForm, show_results_immediately: checked as boolean })
                            }
                          />
                          <Label htmlFor="immediate">Show results immediately</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="total_questions">Total Questions</Label>
                      <Input
                        id="total_questions"
                        type="number"
                        value={examForm.total_questions}
                        onChange={(e) => setExamForm({ ...examForm, total_questions: parseInt(e.target.value) })}
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pass_mark">Pass Mark (%)</Label>
                      <Input
                        id="pass_mark"
                        type="number"
                        value={examForm.pass_mark}
                        onChange={(e) => setExamForm({ ...examForm, pass_mark: parseInt(e.target.value) })}
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="questions" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Question selection will be available after creating the exam.</p>
                    <p className="text-sm">You can add questions from your question bank in the edit mode.</p>
                  </div>
                </TabsContent>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsCreatingExam(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Create Exam
                  </Button>
                </div>
              </form>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle>Exams ({filteredExams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{exam.title}</h3>
                    <Badge
                      variant={
                        exam.status === 'published'
                          ? 'default'
                          : exam.status === 'draft'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {exam.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    {exam.subject_name && <span>{exam.subject_name}</span>}
                    {exam.class_name && (
                      <>
                        <span>•</span>
                        <span>{exam.class_name}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {exam.duration_minutes} min
                    </span>
                    <span>•</span>
                    <span>{exam.total_questions} questions</span>
                    <span>•</span>
                    <span>{exam.pass_mark}% pass mark</span>
                  </div>
                  
                  {exam.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {exam.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    {exam.start_date && (
                      <span>Starts: {format(new Date(exam.start_date), 'PPP')}</span>
                    )}
                    {exam.end_date && (
                      <span>Ends: {format(new Date(exam.end_date), 'PPP')}</span>
                    )}
                    <span>Created: {format(new Date(exam.created_at), 'PPP')}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewExam(exam)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(exam)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateExam(exam)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {exam.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handlePublishExam(exam.id)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteExam(exam.id, exam.title)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};