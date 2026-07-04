import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Eye, Calendar, User, FileText, Award } from 'lucide-react';

interface AdminResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExamResult {
  id: string;
  student_name: string;
  exam_title: string;
  subject_name: string;
  class_name: string;
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  completed_at: string;
  time_spent: number;
}

export const AdminResultsModal: React.FC<AdminResultsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all-subjects');
  const [filterClass, setFilterClass] = useState('all-classes');
  const [filterStatus, setFilterStatus] = useState('all-status');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const { toast } = useToast();
  useEffect(() => {
    if (open) {
      fetchResults();
      fetchFilters();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [results, searchTerm, filterSubject, filterClass, filterStatus]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const sessionsQuery = supabase
        .from('exam_sessions')
        .select(`
          id,
          total_score,
          max_score,
          percentage,
          passed,
          ended_at,
          time_remaining_seconds,
          exams (
            id,
            title,
            duration_minutes,
            subjects (
              id,
              name
            ),
            classes (
              id,
              name
            )
          ),
          profiles (
            full_name
          )
        `)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false });

      const { data, error } = await sessionsQuery;

      if (error) throw error;

      const formattedResults = data?.map((session: any) => ({
        id: session.id,
        student_name: session.profiles?.full_name || 'Unknown',
        exam_title: session.exams?.title || 'Unknown Exam',
        subject_name: session.exams?.subjects?.name || 'Unknown Subject',
        class_name: session.exams?.classes?.name || 'All Classes',
        total_score: session.total_score || 0,
        max_score: session.max_score || 0,
        percentage: session.percentage || 0,
        passed: session.passed || false,
        completed_at: session.ended_at,
        time_spent: session.exams?.duration_minutes ? 
          session.exams.duration_minutes - Math.floor((session.time_remaining_seconds || 0) / 60) : 0,
      })) || [];

      setResults(formattedResults);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch exam results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [subjectsData, classesData] = await Promise.all([
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('classes').select('id, name').order('name')
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.exam_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterSubject && filterSubject !== 'all-subjects') {
      filtered = filtered.filter(result => result.subject_name === filterSubject);
    }

    if (filterClass && filterClass !== 'all-classes') {
      filtered = filtered.filter(result => result.class_name === filterClass);
    }

    if (filterStatus && filterStatus !== 'all-status') {
      filtered = filtered.filter(result => 
        filterStatus === 'passed' ? result.passed : !result.passed
      );
    }

    setFilteredResults(filtered);
  };

  const downloadResults = () => {
    const csvContent = [
      ['Student Name', 'Exam Title', 'Subject', 'Class', 'Score', 'Max Score', 'Percentage', 'Status', 'Completed At', 'Time Spent (mins)'],
      ...filteredResults.map(result => [
        result.student_name,
        result.exam_title,
        result.subject_name,
        result.class_name,
        result.total_score,
        result.max_score,
        `${result.percentage.toFixed(1)}%`,
        result.passed ? 'Passed' : 'Failed',
        new Date(result.completed_at).toLocaleDateString(),
        result.time_spent
      ])
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam-results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (passed: boolean, percentage: number) => {
    if (passed) {
      return <Badge variant="default" className="bg-green-500">Passed</Badge>;
    }
    return <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            All Exam Results
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search students or exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-subjects">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.name}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-classes">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.name}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={downloadResults} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Results */}
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map((result) => (
                  <Card key={result.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{result.student_name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{result.class_name}</div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{result.exam_title}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{result.subject_name}</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {result.total_score}/{result.max_score}
                        </div>
                        <div className="text-sm text-muted-foreground">Points</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {result.percentage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Score</div>
                      </div>

                      <div className="text-center">
                        {getStatusBadge(result.passed, result.percentage)}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{new Date(result.completed_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {result.time_spent} mins spent
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {filteredResults.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No exam results found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};