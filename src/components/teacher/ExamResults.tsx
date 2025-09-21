import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Download, 
  Search,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { StudentResultDetails } from './StudentResultDetails';

interface ExamResultData {
  session_id: string;
  student_name: string;
  exam_title: string;
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_spent: number;
  completed_at: string;
  status: string;
}

interface ExamAnalytics {
  exam_id: string;
  exam_title: string;
  total_students: number;
  completed: number;
  in_progress: number;
  not_started: number;
  average_score: number;
  pass_rate: number;
  highest_score: number;
  lowest_score: number;
}

export const ExamResults: React.FC = () => {
  const [exams, setExams] = useState<ExamAnalytics[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [results, setResults] = useState<ExamResultData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedStudentResult, setSelectedStudentResult] = useState<ExamResultData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchExamResults();
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      
      // Fetch exams with session analytics
      const { data: examData, error } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          exam_sessions(
            id,
            status,
            total_score,
            max_score,
            percentage,
            passed
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const analytics: ExamAnalytics[] = examData.map(exam => {
        const sessions = exam.exam_sessions || [];
        const completed = sessions.filter(s => s.status === 'completed').length;
        const inProgress = sessions.filter(s => s.status === 'in_progress').length;
        const notStarted = sessions.filter(s => s.status === 'not_started').length;
        
        const completedSessions = sessions.filter(s => s.status === 'completed');
        const averageScore = completedSessions.length > 0 
          ? completedSessions.reduce((acc, s) => acc + (s.percentage || 0), 0) / completedSessions.length
          : 0;
        
        const passedCount = completedSessions.filter(s => s.passed).length;
        const passRate = completedSessions.length > 0 ? (passedCount / completedSessions.length) * 100 : 0;
        
        const scores = completedSessions.map(s => s.percentage || 0);
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        return {
          exam_id: exam.id,
          exam_title: exam.title,
          total_students: sessions.length,
          completed,
          in_progress: inProgress,
          not_started: notStarted,
          average_score: averageScore,
          pass_rate: passRate,
          highest_score: highestScore,
          lowest_score: lowestScore,
        };
      });

      setExams(analytics);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch exam analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExamResults = async () => {
    try {
      const { data: sessionData, error } = await supabase
        .from('exam_sessions')
        .select(`
          id,
          total_score,
          max_score,
          percentage,
          passed,
          ended_at,
          status,
          student_id,
          exams(title)
        `)
        .eq('exam_id', selectedExam)
        .order('ended_at', { ascending: false });

      if (error) throw error;

      // Fetch student profiles separately
      const studentIds = [...new Set(sessionData.map(s => s.student_id))];
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      const studentMap = studentProfiles?.reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>) || {};

      // Fetch time spent for each session
      const sessionIds = sessionData.map(s => s.id);
      const { data: timeData } = await supabase
        .from('question_responses')
        .select('session_id, time_spent_seconds')
        .in('session_id', sessionIds);

      const timeBySession = timeData?.reduce((acc, curr) => {
        acc[curr.session_id] = (acc[curr.session_id] || 0) + (curr.time_spent_seconds || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      const formattedResults: ExamResultData[] = sessionData.map(session => ({
        session_id: session.id,
        student_name: studentMap[session.student_id]?.full_name || 'Unknown',
        exam_title: session.exams?.title || 'Unknown',
        total_score: session.total_score || 0,
        max_score: session.max_score || 0,
        percentage: session.percentage || 0,
        passed: session.passed || false,
        time_spent: timeBySession[session.id] || 0,
        completed_at: session.ended_at || '',
        status: session.status,
      }));

      setResults(formattedResults);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch exam results',
        variant: 'destructive',
      });
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const exportResults = () => {
    const csvContent = [
      ['Student Name', 'Score', 'Percentage', 'Status', 'Time Spent', 'Completed At'].join(','),
      ...filteredResults.map(result => [
        result.student_name,
        `${result.total_score}/${result.max_score}`,
        `${result.percentage}%`,
        result.passed ? 'Passed' : 'Failed',
        formatTime(result.time_spent),
        result.completed_at ? format(new Date(result.completed_at), 'PPP') : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-results-${selectedExam}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const viewStudentDetails = (result: ExamResultData) => {
    setSelectedStudentResult(result);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const selectedExamData = exams.find(e => e.exam_id === selectedExam);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{exams.length}</div>
            <div className="text-sm text-muted-foreground">Total Exams</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              {exams.reduce((acc, exam) => acc + exam.completed, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">
              {exams.reduce((acc, exam) => acc + exam.in_progress, 0)}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-info">
              {exams.reduce((acc, exam) => acc + exam.not_started, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Not Started</div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Exam Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select an exam to view results" />
              </SelectTrigger>
              <SelectContent>
                {exams.map(exam => (
                  <SelectItem key={exam.exam_id} value={exam.exam_id}>
                    {exam.exam_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedExamData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{selectedExamData.average_score.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Average Score</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">{selectedExamData.pass_rate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Pass Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-lg font-bold">
                      {selectedExamData.highest_score}% / {selectedExamData.lowest_score}%
                    </div>
                    <div className="text-sm text-muted-foreground">Highest / Lowest</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {selectedExam && (
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Student Results
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={exportResults} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow key={result.session_id}>
                    <TableCell className="font-medium">
                      {result.student_name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {result.total_score}/{result.max_score} ({result.percentage.toFixed(1)}%)
                        </div>
                        <Progress value={result.percentage} className="w-20 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {result.status === 'completed' ? (
                          <>
                            {result.passed ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <Badge variant={result.passed ? "default" : "destructive"}>
                              {result.passed ? 'Passed' : 'Failed'}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="secondary">{result.status}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        {formatTime(result.time_spent)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.completed_at ? format(new Date(result.completed_at), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={result.status !== 'completed'}
                        onClick={() => viewStudentDetails(result)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No results found for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student Result Details Modal */}
      {selectedStudentResult && (
        <StudentResultDetails
          isOpen={!!selectedStudentResult}
          onClose={() => setSelectedStudentResult(null)}
          sessionId={selectedStudentResult.session_id}
          studentName={selectedStudentResult.student_name}
        />
      )}
    </div>
  );
};