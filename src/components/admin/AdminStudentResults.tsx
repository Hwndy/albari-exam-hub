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
  FileSpreadsheet,
  Users,
  BookOpen,
  TrendingUp,
  Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminStudentResult {
  id: string;
  student_name: string;
  student_email: string;
  subject_name: string;
  class_name: string;
  exam_title: string;
  total_score: number;
  max_score: number;
  percentage: number;
  status: 'passed' | 'failed';
  completed_at: string;
  time_spent_minutes: number;
  teacher_name: string;
}

export const AdminStudentResults: React.FC = () => {
  const [results, setResults] = useState<AdminStudentResult[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all subjects and classes
      const [subjectsData, classesData] = await Promise.all([
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('classes').select('id, name').order('name')
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);

      // Fetch all completed exam sessions
      const { data: sessionsData } = await supabase
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
            created_by,
            subjects(name),
            classes(name)
          )
        `)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false });

      if (sessionsData) {
        // Get all student and teacher profiles
        const studentIds = [...new Set(sessionsData.map(s => s.student_id))];
        const teacherIds = [...new Set(sessionsData.map(s => s.exams?.created_by).filter(Boolean))];
        
        const [studentsData, teachersData] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', studentIds),
          supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', teacherIds)
        ]);

        const formattedResults: AdminStudentResult[] = sessionsData.map(session => {
          const student = studentsData.data?.find(s => s.user_id === session.student_id);
          const teacher = teachersData.data?.find(t => t.user_id === session.exams?.created_by);
          const timeSpentMinutes = session.started_at && session.ended_at 
            ? Math.floor((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / (1000 * 60))
            : 0;

          return {
            id: session.id,
            student_name: student?.full_name || 'Unknown Student',
            student_email: student?.user_id || '',
            subject_name: session.exams?.subjects?.name || 'N/A',
            class_name: session.exams?.classes?.name || 'No Class',
            exam_title: session.exams?.title || 'Unknown Exam',
            total_score: session.total_score || 0,
            max_score: session.max_score || 0,
            percentage: session.percentage || 0,
            status: session.passed ? 'passed' : 'failed',
            completed_at: session.ended_at || '',
            time_spent_minutes: timeSpentMinutes,
            teacher_name: teacher?.full_name || 'Unknown Teacher',
          };
        });
        
        setResults(formattedResults);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch student results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = 
      result.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.exam_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.teacher_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || result.subject_name === selectedSubject;
    const matchesClass = selectedClass === 'all' || result.class_name === selectedClass;
    return matchesSearch && matchesSubject && matchesClass;
  });

  const handleBulkDownload = () => {
    const csvContent = [
      ['Student Name', 'Subject', 'Class', 'Exam Title', 'Score', 'Max Score', 'Percentage', 'Status', 'Teacher', 'Date Completed', 'Time Spent (minutes)'],
      ...filteredResults.map(result => [
        result.student_name,
        result.subject_name,
        result.class_name,
        result.exam_title,
        result.total_score.toString(),
        result.max_score.toString(),
        `${result.percentage}%`,
        result.status.toUpperCase(),
        result.teacher_name,
        new Date(result.completed_at).toLocaleDateString(),
        result.time_spent_minutes.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all_student_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStats = () => {
    const totalAttempts = filteredResults.length;
    const passedAttempts = filteredResults.filter(r => r.status === 'passed').length;
    const uniqueStudents = new Set(filteredResults.map(r => r.student_name)).size;
    const avgScore = totalAttempts > 0 
      ? Math.round(filteredResults.reduce((sum, r) => sum + r.percentage, 0) / totalAttempts)
      : 0;

    return {
      totalAttempts,
      passedAttempts,
      failedAttempts: totalAttempts - passedAttempts,
      uniqueStudents,
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.totalAttempts}</div>
                <div className="text-sm text-muted-foreground">Total Attempts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.uniqueStudents}</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-success" />
              <div>
                <div className="text-2xl font-bold text-success">{stats.passedAttempts}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-2xl font-bold text-destructive">{stats.failedAttempts}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.avgScore}%</div>
                <div className="text-sm text-muted-foreground">Avg Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students, exams, or teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 min-w-[250px]"
            />
          </div>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.name}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.name}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleBulkDownload} disabled={filteredResults.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Results
        </Button>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Student Results ({filteredResults.length})</CardTitle>
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
                      <Badge variant="outline">{result.class_name}</Badge>
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
                      <span>Teacher: {result.teacher_name}</span>
                      <span>•</span>
                      <span>Completed: {new Date(result.completed_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Time: {result.time_spent_minutes}min</span>
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