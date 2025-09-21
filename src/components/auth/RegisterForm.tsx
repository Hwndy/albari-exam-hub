import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RegisterFormProps {
  onToggleMode: () => void;
  allowStudentRegistration?: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onToggleMode, 
  allowStudentRegistration = true 
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'admin' | 'teacher' | 'student',
    classId: '',
    classIds: [] as string[],
    subjectIds: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Array<{id: string, name: string}>>([]);
  const [subjects, setSubjects] = useState<Array<{id: string, name: string}>>([]);
  const { register } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesResult, subjectsResult] = await Promise.all([
          supabase.from('classes').select('id, name').order('name'),
          supabase.from('subjects').select('id, name').order('name')
        ]);

        if (classesResult.data) setClasses(classesResult.data);
        if (subjectsResult.data) setSubjects(subjectsResult.data);
      } catch (error) {
        console.error('Error fetching classes/subjects:', error);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    // Validate role-specific requirements
    if (formData.role === 'student' && !formData.classId) {
      toast({
        title: 'Error',
        description: 'Please select a class',
        variant: 'destructive',
      });
      return;
    }

    if (formData.role === 'teacher' && formData.subjectIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one subject',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        classId: formData.role === 'student' ? formData.classId : undefined,
        classIds: formData.role === 'teacher' ? formData.classIds : undefined,
        subjectIds: formData.role === 'teacher' ? formData.subjectIds : undefined
      });
      
      toast({
        title: 'Registration successful',
        description: 'Please check your email to confirm your account.',
      });
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Join ALBARI Secondary School
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: 'admin' | 'teacher' | 'student') => 
                setFormData({ ...formData, role: value, classId: '', classIds: [], subjectIds: [] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {allowStudentRegistration && (
                  <SelectItem value="student">Student</SelectItem>
                )}
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.role === 'student' && (
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select 
                value={formData.classId} 
                onValueChange={(value) => setFormData({ ...formData, classId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your class" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.role === 'teacher' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="classes">Classes</Label>
                <div className="border border-input rounded-md p-3 max-h-32 overflow-y-auto bg-background">
                  {classes.map((cls) => (
                    <div key={cls.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={`class-${cls.id}`}
                        checked={formData.classIds.includes(cls.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ 
                              ...formData, 
                              classIds: [...formData.classIds, cls.id] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              classIds: formData.classIds.filter(id => id !== cls.id) 
                            });
                          }
                        }}
                        className="rounded border-input"
                      />
                      <label htmlFor={`class-${cls.id}`} className="text-sm text-foreground cursor-pointer">{cls.name}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects</Label>
                <div className="border border-input rounded-md p-3 max-h-32 overflow-y-auto bg-background">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={`subject-${subject.id}`}
                        checked={formData.subjectIds.includes(subject.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ 
                              ...formData, 
                              subjectIds: [...formData.subjectIds, subject.id] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              subjectIds: formData.subjectIds.filter(id => id !== subject.id) 
                            });
                          }
                        }}
                        className="rounded border-input"
                      />
                      <label htmlFor={`subject-${subject.id}`} className="text-sm text-foreground cursor-pointer">{subject.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : 'Create Account'}
          </Button>
        </form>
        
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onToggleMode}>
            Already have an account? Sign in
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};