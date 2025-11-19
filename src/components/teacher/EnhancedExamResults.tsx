import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  Search, 
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';

interface StudentResult {
  id: string;
  student_name: string;
  student_email: string;
  subject_name: string;
  exam_title: string;
  total_score: number;
  max_score: number;
  percentage: number;
  status: 'passed' | 'failed';
  completed_at: string;
  time_spent_minutes: number;
}

export const EnhancedExamResults: React.FC = () => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { withSchoolFilter } = useSchoolQuery();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch teacher's exams first
      const { data: examsData } = await withSchoolFilter(
        supabase
          .from('exams')
          .select('id, title, subjects(name)')
          .eq('created_by', user?.id)
          .order('created_at', { ascending: false })
      );

      if (examsData) {
        setExams(examsData);
      }

      // Fetch results for teacher's exams
      const { data: resultsData } = await withSchoolFilter(
        supabase
          .from('exam_sessions')
          .select(`
            id,
            total_score,
            max_score,
            percentage,
            passed,
            ended_at,
            started_at,
            student_id,
            exams!inner(
              id,
              title,
              pass_mark,
              created_by,
              subjects(name)
            )
          `)
          .eq('status', 'completed')
          .eq('exams.created_by', user?.id)
          .order('ended_at', { ascending: false })
      );

      if (resultsData) {
        // Get student profiles separately
        const studentIds = [...new Set(resultsData.map(r => r.student_id))];
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds);

        const formattedResults: StudentResult[] = resultsData.map(result => {
          const student = studentsData?.find(s => s.user_id === result.student_id);
          const timeSpentMinutes = result.started_at && result.ended_at 
            ? Math.floor((new Date(result.ended_at).getTime() - new Date(result.started_at).getTime()) / (1000 * 60))
            : 0;

          return {
            id: result.id,
            student_name: student?.full_name || 'Unknown',
            student_email: student?.user_id || '',
            subject_name: result.exams?.subjects?.name || 'N/A',
            exam_title: result.exams?.title || 'Unknown Exam',
            total_score: result.total_score || 0,
            max_score: result.max_score || 0,
            percentage: result.percentage || 0,
            status: result.passed ? 'passed' : 'failed',
            completed_at: result.ended_at || '',
            time_spent_minutes: timeSpentMinutes,
          };
        });
        setResults(formattedResults);
      }
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

  const filteredResults = results.filter(result => {
    const matchesSearch = result.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.exam_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = selectedExam === 'all' || result.exam_title === selectedExam;
    return matchesSearch && matchesExam;
  });

  const handleBulkDownload = () => {
    const csvContent = [
      ['Student Name', 'Subject', 'Exam Title', 'Score', 'Percentage', 'Status', 'Date', 'Time Spent (minutes)'],
      ...filteredResults.map(result => [
        result.student_name,
        result.subject_name,
        result.exam_title,
        result.total_score.toString(),
        result.max_score.toString(),
        `${result.percentage}%`,
        result.status.toUpperCase(),
        new Date(result.completed_at).toLocaleDateString(),
        result.time_spent_minutes.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exam_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStats = () => {
    const totalAttempts = filteredResults.length;
    const passedAttempts = filteredResults.filter(r => r.status === 'passed').length;
    const avgScore = totalAttempts > 0 
      ? Math.round(filteredResults.reduce((sum, r) => sum + r.percentage, 0) / totalAttempts)
      : 0;

    return {
      totalAttempts,
      passedAttempts,
      failedAttempts: totalAttempts - passedAttempts,
      avgScore,
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
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            <div className="text-sm text-muted-foreground">Total Attempts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.passedAttempts}</div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.failedAttempts}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.avgScore}%</div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students or exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map(exam => (
                <SelectItem key={exam.id} value={exam.title}>
                  {exam.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleBulkDownload} disabled={filteredResults.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Bulk Download CSV
        </Button>
      </div>

      {/* Results List */}
      <Card>
        <CardHeader>
          <CardTitle>Student Results ({filteredResults.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No exam results found.</p>
              </div>
            ) : (
              filteredResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{result.student_name}</h3>
                      <Badge
                        variant={result.status === 'passed' ? 'default' : 'destructive'}
                      >
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{result.subject_name}</span>
                      <span>•</span>
                      <span>{result.exam_title}</span>
                      <span>•</span>
                      <span>Score: {result.total_score}/{result.max_score}</span>
                      <span>•</span>
                      <span className={`font-medium ${
                        result.percentage >= 70 ? 'text-success' : 
                        result.percentage >= 50 ? 'text-warning' : 'text-destructive'
                      }`}>
                        {result.percentage}%
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Completed: {new Date(result.completed_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Time Spent: {result.time_spent_minutes} minutes</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};