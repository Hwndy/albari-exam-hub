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
import { useSchoolQuery } from '@/hooks/useSchoolQuery';

interface AdminStudentResult {
  id: string;
  student_name: string;
  student_email: string;
  subject_name: string;
  subject_id: string | null;
  class_name: string;
  class_id: string | null;
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
  const [loadingProgress, setLoadingProgress] = useState('');
  const { toast } = useToast();
  const { withSchoolFilter } = useSchoolQuery();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadingProgress('Loading subjects and classes...');
      
      // Fetch all subjects and classes filtered by school
      const [subjectsData, classesData] = await Promise.all([
        withSchoolFilter(supabase.from('subjects').select('id, name').order('name')),
        withSchoolFilter(supabase.from('classes').select('id, name').order('name'))
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);

      // Fetch all completed exam sessions in batches to bypass 1000 row limit
      const BATCH_SIZE = 1000;
      let allSessionsData: any[] = [];
      let start = 0;
      let hasMore = true;
      
      while (hasMore) {
        setLoadingProgress(`Loading results... (${allSessionsData.length} fetched)`);
        
        const sessionsQuery = supabase
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
            exams(
              id,
              title,
              created_by,
              subject_id,
              class_id,
              subjects(id, name),
              classes(id, name)
            )
          `)
          .eq('status', 'completed')
          .order('ended_at', { ascending: false })
          .range(start, start + BATCH_SIZE - 1);

        const { data: batchData, error } = await withSchoolFilter(sessionsQuery);
        
        if (error) throw error;
        
        if (batchData && batchData.length > 0) {
          allSessionsData = [...allSessionsData, ...batchData];
          start += BATCH_SIZE;
          hasMore = batchData.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      console.log('[AdminStudentResults] Total results fetched:', allSessionsData.length);
      setLoadingProgress(`Processing ${allSessionsData.length} results...`);

  if (allSessionsData.length > 0) {
        // Get all student and teacher profiles
        const studentIds = [...new Set(allSessionsData.map(s => s.student_id))].filter((id): id is string => typeof id === 'string');
        const teacherIds = [...new Set(allSessionsData.map(s => s.exams?.created_by).filter(Boolean))].filter((id): id is string => typeof id === 'string');
        
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

        const formattedResults: AdminStudentResult[] = allSessionsData.map(session => {
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
            subject_id: session.exams?.subject_id || null,
            class_name: session.exams?.classes?.name || 'N/A',
            class_id: session.exams?.class_id || null,
            exam_title: session.exams?.title || 'Deleted Exam',
            total_score: session.total_score || 0,
            max_score: session.max_score || 0,
            percentage: session.percentage || 0,
            status: session.passed ? 'passed' : 'failed',
            completed_at: session.ended_at || '',
            time_spent_minutes: timeSpentMinutes,
            teacher_name: teacher?.full_name || 'N/A',
          };
        });
        
        console.log('[AdminStudentResults] Formatted results:', formattedResults.length);
        
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

  // Filter by ID instead of name for reliable matching
  const filteredResults = results.filter(result => {
    const matchesSearch = 
      result.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.exam_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.teacher_name.toLowerCase().includes(searchTerm.toLowerCase());
    // Filter by subject_id and class_id for reliable matching
    const matchesSubject = selectedSubject === 'all' || result.subject_id === selectedSubject;
    const matchesClass = selectedClass === 'all' || result.class_id === selectedClass;
    return matchesSearch && matchesSubject && matchesClass;
  });
  
  // Debug logging for filtering
  console.log('[AdminStudentResults] Filtering:', {
    totalResults: results.length,
    filteredCount: filteredResults.length,
    selectedSubject,
    selectedClass,
    searchTerm
  });

  const generateExportFilename = () => {
    const date = new Date().toISOString().split('T')[0];
    
    // If no filters applied, use generic name
    if (selectedSubject === 'all' && selectedClass === 'all') {
      return `all_student_results_${date}.csv`;
    }
    
    // Clean up names for filename (remove special chars, replace spaces with underscores)
    const cleanName = (str: string) => str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    
    // Get subject and class names
    const subjectName = selectedSubject !== 'all' 
      ? subjects.find(s => s.id === selectedSubject)?.name || ''
      : '';
      
    const className = selectedClass !== 'all'
      ? classes.find(c => c.id === selectedClass)?.name || ''
      : '';
    
    // Get exam title from first result if filtering shows consistent exam
    const examTitle = filteredResults.length > 0 && filteredResults[0].exam_title !== 'Deleted Exam'
      ? filteredResults[0].exam_title
      : '';
    
    // Build filename parts
    const parts: string[] = [];
    if (examTitle) parts.push(cleanName(examTitle));
    if (subjectName) parts.push(cleanName(subjectName));
    if (className) parts.push(cleanName(className));
    parts.push(date);
    
    return parts.join('_') + '.csv';
  };

  const handleBulkDownload = () => {
    if (filteredResults.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Please adjust your filters to see results',
        variant: 'destructive',
      });
      return;
    }

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
    link.download = generateExportFilename();
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
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">{loadingProgress || 'Loading...'}</p>
      </div>
    );
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
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
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