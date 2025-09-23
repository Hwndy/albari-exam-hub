import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, GraduationCap, Calendar, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Student {
  id: string;
  admission_number: string;
  date_of_birth: string;
  gender: string;
  status: string;
  user_id: string;
  profiles: {
    full_name: string;
  } | null;
  class_assignments: {
    classes: {
      name: string;
    };
  }[] | null;
}

export const StudentOverview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [user?.id]);

  const fetchStudents = async () => {
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

      // Then get students through relationships
      const { data: relationshipData, error: relationshipError } = await supabase
        .from('student_parent_relationships')
        .select(`
          students:student_id (
            id,
            admission_number,
            date_of_birth,
            gender,
            status,
            user_id,
            profiles:user_id (
              full_name
            ),
            class_assignments (
              classes (
                name
              )
            )
          )
        `)
        .eq('parent_id', parentData.id);

      if (relationshipError) {
        console.error('Error fetching student relationships:', relationshipError);
        toast({
          title: 'Error',
          description: 'Failed to load student information',
          variant: 'destructive',
        });
        return;
      }

      const studentsData = relationshipData
        ?.map(rel => rel.students)
        .filter(Boolean) || [];
      
      setStudents(studentsData);
    } catch (error) {
      console.error('Error in fetchStudents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStudentInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
          <p className="text-muted-foreground mb-4">
            You don't have any students linked to your account yet.
          </p>
          <Button variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Contact School Administration
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {students.map((student) => (
        <Card key={student.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="" alt={student.profiles?.full_name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getStudentInitials(student.profiles?.full_name || 'Student')}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle className="text-lg">{student.profiles?.full_name}</CardTitle>
                <CardDescription>
                  Admission: {student.admission_number}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                {student.status}
              </Badge>
              <Badge variant="outline">
                {student.gender}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>
                  Class: {student.class_assignments?.[0]?.classes?.name || 'Not Assigned'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Age: {calculateAge(student.date_of_birth)} years
                </span>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                View Academic Report
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" size="sm">
                  Attendance
                </Button>
                <Button variant="ghost" size="sm">
                  Grades
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};