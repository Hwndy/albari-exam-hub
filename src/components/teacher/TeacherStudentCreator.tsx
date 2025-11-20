import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, UserPlus, Mail, User, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
      
      // Fetch teacher's assigned classes
      const { data: teacherAssignments } = await supabase
        .from('teacher_class_assignments')
        .select('class_id')
        .eq('teacher_id', user?.id);

      let classesData = [];
      if (teacherAssignments && teacherAssignments.length > 0) {
        const classIds = teacherAssignments.map(a => a.class_id);
        
        // Fetch class details
        const { data } = await supabase
          .from('classes')
          .select('id, name, description')
          .in('id', classIds)
          .order('name');

        if (data) {
          classesData = data;
          setClasses(data);
        }
      }

      // Fetch students assigned to teacher's classes
      if (classesData.length > 0) {
        const classIds = classesData.map(c => c.id);
        
        const { data: classAssignments } = await supabase
          .from('class_assignments')
          .select(`
            student_id,
            class_id,
            profiles!inner(user_id, full_name, created_at)
          `)
          .in('class_id', classIds)
          .order('created_at', { foreignTable: 'profiles', ascending: false })
          .limit(10);

        if (classAssignments) {
          const studentsWithClass = classAssignments.map(assignment => ({
            user_id: assignment.profiles.user_id,
            full_name: assignment.profiles.full_name,
            created_at: assignment.profiles.created_at,
            class_id: assignment.class_id,
            role: 'student'
          }));
          
          console.log('📚 Students in teacher classes:', studentsWithClass.length);
          setCreatedStudents(studentsWithClass);
        }
      }
    } catch (error: any) {
      console.error('❌ Fetch data error:', error);
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
    
    if (!studentForm.fullName || !studentForm.email || !studentForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingStudent(true);

      console.log('📝 Creating student via edge function:', {
        email: studentForm.email,
        fullName: studentForm.fullName,
        classId: studentForm.classId
      });

      // Get current session
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('No active session');
      }

      // Call edge function instead of signUp
      const { data: result, error: functionError } = await supabase.functions.invoke('create-student', {
        body: {
          email: studentForm.email,
          password: studentForm.password,
          fullName: studentForm.fullName,
          classId: studentForm.classId || null
        }
      });

      if (functionError) throw functionError;

      console.log('✅ Student created successfully:', result);

      toast({
        title: "Success",
        description: `Student ${studentForm.fullName} created successfully`,
      });

      // Refresh the created students list
      await fetchData();

      // Reset the form
      resetForm();
    } catch (error: any) {
      console.error('❌ Student creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create student",
        variant: "destructive",
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
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      placeholder="Enter password"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={studentForm.classId || "none"}
                  onValueChange={(value) => setStudentForm({ ...studentForm, classId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Class Assignment</SelectItem>
                    {classes.filter(cls => cls.id && cls.id.trim()).map(cls => (
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