import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';
import { TrendingUp, Award, BookOpen, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GradeEntry {
  id: string;
  assessment_name: string;
  assessment_type: string;
  max_score: number;
  obtained_score: number;
  grade: string;
  assessment_date: string;
  remarks: string;
  subjects: {
    name: string;
  };
}

export const AcademicProgress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { withSchoolFilter } = useSchoolQuery();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, [user?.id, selectedStudent]);

  const fetchGrades = async () => {
    if (!user?.id) return;

    try {
      // First get parent record
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (parentError) {
        console.error('Parent not found:', parentError);
        setLoading(false);
        return;
      }

      // Get student IDs for this parent
      const { data: relationshipData, error: relationshipError } = await supabase
        .from('student_parent_relationships')
        .select('student_id')
        .eq('parent_id', parentData.id);

      if (relationshipError) {
        console.error('Error fetching relationships:', relationshipError);
        return;
      }

      const studentIds = relationshipData?.map(rel => rel.student_id) || [];

      if (studentIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch grades for all students with school filter
      let query = withSchoolFilter(
        supabase
          .from('gradebook_entries')
          .select(`
            id,
            assessment_name,
            assessment_type,
            max_score,
            obtained_score,
            grade,
            assessment_date,
            remarks,
            subjects (
              name
            )
          `)
          .in('student_id', studentIds)
          .order('assessment_date', { ascending: false })
      );

      if (selectedStudent !== 'all') {
        query = query.eq('student_id', selectedStudent);
      }

      const { data: gradesData, error: gradesError } = await query;

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        toast({
          title: 'Error',
          description: 'Failed to load academic records',
          variant: 'destructive',
        });
        return;
      }

      setGrades(gradesData || []);
    } catch (error) {
      console.error('Error in fetchGrades:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grades',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (obtained: number, max: number) => {
    return Math.round((obtained / max) * 100);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeBadgeVariant = (percentage: number) => {
    if (percentage >= 90) return 'default';
    if (percentage >= 80) return 'secondary';
    if (percentage >= 60) return 'outline';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const overallAverage = grades.length > 0 
    ? Math.round(grades.reduce((sum, grade) => sum + calculatePercentage(grade.obtained_score, grade.max_score), 0) / grades.length)
    : 0;

  const recentGrades = grades.slice(0, 5);
  const subjectAverages = grades.reduce((acc, grade) => {
    const subject = grade.subjects?.name || 'Unknown';
    const percentage = calculatePercentage(grade.obtained_score, grade.max_score);
    
    if (!acc[subject]) {
      acc[subject] = { total: 0, count: 0 };
    }
    acc[subject].total += percentage;
    acc[subject].count += 1;
    
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGradeColor(overallAverage)}`}>
              {overallAverage}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {grades.length} assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grades.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all subjects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performance</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {grades.length > 0 ? Math.max(...grades.map(g => calculatePercentage(g.obtained_score, g.max_score))) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Highest score achieved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      {Object.keys(subjectAverages).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Subject Performance
            </CardTitle>
            <CardDescription>
              Average performance across different subjects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(subjectAverages).map(([subject, data]) => {
              const average = Math.round(data.total / data.count);
              return (
                <div key={subject} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{subject}</span>
                    <span className={`text-sm font-bold ${getGradeColor(average)}`}>
                      {average}%
                    </span>
                  </div>
                  <Progress value={average} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {data.count} assessment{data.count !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
          <CardDescription>
            Latest academic performance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentGrades.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No assessments found
            </p>
          ) : (
            <div className="space-y-4">
              {recentGrades.map((grade) => {
                const percentage = calculatePercentage(grade.obtained_score, grade.max_score);
                return (
                  <div key={grade.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{grade.assessment_name}</div>
                       <div className="text-sm text-muted-foreground">
                         {grade.subjects?.name} • {grade.assessment_type}
                       </div>
                       <div className="text-xs text-muted-foreground">
                         {new Date(grade.assessment_date).toLocaleDateString()}
                       </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant={getGradeBadgeVariant(percentage)}>
                        {grade.obtained_score}/{grade.max_score}
                      </Badge>
                      <div className={`text-sm font-bold ${getGradeColor(percentage)}`}>
                        {percentage}%
                      </div>
                      {grade.grade && (
                        <div className="text-xs text-muted-foreground">
                          Grade: {grade.grade}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};