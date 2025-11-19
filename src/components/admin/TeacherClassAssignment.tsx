import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';

interface TeacherClassAssignmentProps {
  teacherId?: string;
}

interface Teacher {
  id: string;
  full_name: string;
  email?: string;
}

interface Class {
  id: string;
  name: string;
  description?: string;
}

interface Assignment {
  id: string;
  teacher_id: string;
  class_id: string;
  teacher: Teacher;
  class: Class;
}

export const TeacherClassAssignment: React.FC<TeacherClassAssignmentProps> = ({ teacherId }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState(teacherId || '');
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { withSchoolFilter, withSchoolData } = useSchoolQuery();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      fetchAssignments();
    }
  }, [selectedTeacher]);

  const fetchData = async () => {
    try {
      // Fetch teachers - get profiles with teacher role from user_roles, filtered by school
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      if (teacherRoles) {
        const teacherIds = teacherRoles.map(r => r.user_id);
        
        const profilesQuery = supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', teacherIds);
        const { data: profilesData } = await withSchoolFilter(profilesQuery);

        if (profilesData) {
          setTeachers(profilesData.map(t => ({ id: t.user_id, full_name: t.full_name })));
        }
      }

      // Fetch classes - filtered by school
      const classesQuery = supabase
        .from('classes')
        .select('*')
        .order('name');
      const { data: classesData } = await withSchoolFilter(classesQuery);
      
      if (classesData) {
        setClasses(classesData);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    }
  };

  const fetchAssignments = async () => {
    if (!selectedTeacher) return;
    
    try {
      setLoading(true);
      const { data } = await supabase
        .from('teacher_class_assignments')
        .select(`
          id,
          teacher_id,
          class_id,
          created_at
        `)
        .eq('teacher_id', selectedTeacher);

      if (data) {
        const formattedAssignments = data.map(assignment => {
          const classData = classes.find(c => c.id === assignment.class_id);
          const teacherData = teachers.find(t => t.id === assignment.teacher_id);
          
          return {
            id: assignment.id,
            teacher_id: assignment.teacher_id,
            class_id: assignment.class_id,
            teacher: teacherData || { id: assignment.teacher_id, full_name: 'Unknown' },
            class: classData || { id: assignment.class_id, name: 'Unknown Class' }
          };
        });
        setAssignments(formattedAssignments);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTeacher || !selectedClass) {
      toast({
        title: 'Error',
        description: 'Please select both teacher and class',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get existing class IDs for this teacher
      const existingClassIds = assignments.map(a => a.class_id);
      
      // Prepare assignment data with school_id
      const assignmentData = withSchoolData({
        teacher_id: selectedTeacher,
        class_id: selectedClass,
      });
      
      // Use RPC function to bypass RLS, but include school_id in the data
      const { error } = await supabase
        .rpc('create_teacher_class_assignments', {
          p_teacher_id: selectedTeacher,
          p_class_ids: [...existingClassIds, selectedClass]
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Assignment created successfully',
      });

      setSelectedClass('');
      fetchAssignments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create assignment',
        variant: 'destructive',
      });
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      // Get remaining class IDs after removal
      const remainingClassIds = assignments
        .filter(a => a.id !== assignmentId)
        .map(a => a.class_id);
      
      // Use RPC function to bypass RLS - this will delete all and recreate
      const { error } = await supabase
        .rpc('create_teacher_class_assignments', {
          p_teacher_id: selectedTeacher,
          p_class_ids: remainingClassIds
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Assignment removed successfully',
      });

      fetchAssignments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove assignment',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Class Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!teacherId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Teacher</label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedTeacher && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Assign Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter(cls => !assignments.some(a => a.class_id === cls.id))
                      .map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAssign} disabled={!selectedClass}>
                  <Plus className="h-4 w-4 mr-1" />
                  Assign
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTeacher && (
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No class assignments found
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <Badge variant="outline">{assignment.class.name}</Badge>
                      {assignment.class.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {assignment.class.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssignment(assignment.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};