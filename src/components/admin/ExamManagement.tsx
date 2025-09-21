import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Edit, 
  Trash2, 
  Search, 
  Eye,
  Send,
  Copy,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ConsolidatedExamCreator } from '@/components/shared/ConsolidatedExamCreator';

interface Exam {
  id: string;
  title: string;
  description?: string;
  subject_id?: string;
  class_id?: string;
  subject_name?: string;
  class_name?: string;
  duration_minutes: number;
  total_questions: number;
  pass_mark: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  created_by: string;
}

export const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const { data: examsData } = await supabase
        .from('exams')
        .select(`
          *,
          subjects(name),
          classes(name)
        `)
        .order('created_at', { ascending: false });

      if (examsData) {
        const formattedExams = examsData.map(exam => ({
          ...exam,
          subject_name: exam.subjects?.name,
          class_name: exam.classes?.name,
        }));
        setExams(formattedExams);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch exams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

      await fetchExams();
      
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

  const handlePublishExam = async (examId: string) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ status: 'published' })
        .eq('id', examId);

      if (error) throw error;

      await fetchExams();
      
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

  const handleArchiveExam = async (examId: string) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ status: 'archived' })
        .eq('id', examId);

      if (error) throw error;

      await fetchExams();
      
      toast({
        title: 'Exam Archived',
        description: 'Exam has been archived.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive exam',
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
          subject_id: exam.subject_id,
          class_id: exam.class_id,
          duration_minutes: exam.duration_minutes,
          total_questions: exam.total_questions,
          pass_mark: exam.pass_mark,
          status: 'draft',
          created_by: '1', // Will be updated to use actual user ID
        });

      if (error) throw error;

      await fetchExams();
      
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
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
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="space-y-2 flex-1">
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
                    <span>{exam.duration_minutes} minutes</span>
                    <span>•</span>
                    <span>{exam.total_questions} questions</span>
                    <span>•</span>
                    <span>Pass: {exam.pass_mark}%</span>
                  </div>
                  
                  {exam.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {exam.description}
                    </p>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(exam.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <ConsolidatedExamCreator
                    trigger={
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                    editingExam={exam}
                    onExamCreated={fetchExams}
                  />
                  
                  {exam.status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePublishExam(exam.id)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {exam.status === 'published' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveExam(exam.id)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateExam(exam)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
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