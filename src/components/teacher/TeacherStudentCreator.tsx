import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, UserPlus, Mail, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StudentForm {
  fullName: string;
  email: string;
  password: string;
  classId: string;
}

export const TeacherStudentCreator: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createdStudents, setCreatedStudents] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [studentForm, setStudentForm] = useState<StudentForm>({
    fullName: '',
    email: '',
    password: '',
    classId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes that teacher is assigned to
      const { data: assignments } = await supabase
        .from('subject_assignments')
        .select('class_id, classes(id, name)')
        .eq('user_id', user?.id)
        .not('class_id', 'is', null);

      if (assignments) {
        const uniqueClasses = assignments
          .filter(a => a.classes)
          .map(a => a.classes)
          .filter((cls, index, arr) => arr.findIndex(c => c.id === cls.id) === index);
        setClasses(uniqueClasses);
      }

      // Fetch recently created students (optional)
      const { data: recentStudents } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentStudents) {
        setCreatedStudents(recentStudents);
      }
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

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsCreatingStudent(true);

      // Create user account
      const { data, error } = await supabase.auth.admin.createUser({
        email: studentForm.email,
        password: studentForm.password,
        user_metadata: {
          full_name: studentForm.fullName,
          role: 'student'
        }
      });

      if (error) throw error;

      // Assign student to class if selected
      if (studentForm.classId && data.user) {
        const { error: assignmentError } = await supabase
          .from('class_assignments')
          .insert({
            student_id: data.user.id,
            class_id: studentForm.classId,
          });

        if (assignmentError) {
          console.warn('Failed to assign student to class:', assignmentError);
        }
      }

      await fetchData();
      setIsCreatingStudent(false);
      resetForm();
      
      toast({
        title: 'Student Created',
        description: `${studentForm.fullName} has been created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create student',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingStudent(false);
    }
  };

  const resetForm = () => {
    setStudentForm({
      fullName: '',
      email: '',
      password: '',
      classId: '',
    });
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setStudentForm({ ...studentForm, password });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Create Student Account</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Create New Student
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={studentForm.fullName}
                  onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                  placeholder="Enter student's full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  placeholder="Enter student's email"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex space-x-2">
                  <Input
                    id="password"
                    type="password"
                    value={studentForm.password}
                    onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                    placeholder="Enter password"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={studentForm.classId}
                  onValueChange={(value) => setStudentForm({ ...studentForm, classId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Class Assignment</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit" disabled={isCreatingStudent}>
                  {isCreatingStudent ? 'Creating...' : 'Create Student'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Student Creation Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">What you can do:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create student accounts for your assigned classes</li>
                <li>• Generate secure passwords automatically</li>
                <li>• Assign students to specific classes</li>
                <li>• Students can take exams you create</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Available Classes:</h4>
              <div className="flex flex-wrap gap-2">
                {classes.length > 0 ? (
                  classes.map(cls => (
                    <Badge key={cls.id} variant="outline">
                      {cls.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No classes assigned to you. Contact admin to assign classes.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recently Created Students */}
      {createdStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {createdStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{student.full_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(student.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">Student</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};