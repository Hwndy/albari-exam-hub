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
import { StaticFormLayout } from '@/components/layout/StaticFormLayout';
import { Eye, EyeOff } from 'lucide-react';

interface RegisterFormProps {
  schoolName?: string;
  onToggleMode: () => void;
  allowStudentRegistration?: boolean;
  isAdminEdit?: boolean;
  adminData?: any;
  onSaveEdit?: (data: any) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ 
  schoolName,
  onToggleMode, 
  allowStudentRegistration = true,
  isAdminEdit = false,
  adminData,
  onSaveEdit
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'teacher' | 'student',
    classId: '',
    classIds: [] as string[],
    subjectIds: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Array<{id: string, name: string}>>([]);
  const [subjects, setSubjects] = useState<Array<{id: string, name: string}>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      console.log('Fetching classes and subjects...');
      
      try {
        // Fetch classes filtered by detected school
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          
          .order('name');

        if (classesError) {
          console.error('Classes fetch error:', classesError);
          toast({
            title: 'Error',
            description: 'Failed to load classes',
            variant: 'destructive',
          });
        } else {
          console.log('Classes fetched:', classesData?.length || 0, 'classes');
          setClasses(classesData || []);
        }

        // Fetch subjects filtered by school
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name')
          
          .order('name');

        if (subjectsError) {
          console.error('Subjects fetch error:', subjectsError);
          toast({
            title: 'Error',
            description: 'Failed to load subjects',
            variant: 'destructive',
          });
        } else {
          console.log('Subjects fetched:', subjectsData?.length || 0, 'subjects');
          setSubjects(subjectsData || []);
        }
      } catch (error) {
        console.error('Error fetching classes/subjects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form data',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [toast]);

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

    if (formData.role === 'teacher' && formData.classIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one class',
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
        subjectIds: formData.role === 'teacher' ? formData.subjectIds : undefined,
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

  const formHeader = (
    <div>
      <CardTitle className="text-2xl font-bold">
        {isAdminEdit ? 'Edit User Account' : 'Create Account'}
      </CardTitle>
      <CardDescription>
        {isAdminEdit 
          ? 'Update account information' 
          : schoolName 
            ? `Registering for: ${schoolName}`
            : 'Join ALBARI Secondary School'}
      </CardDescription>
    </div>
  );

  const formFooter = (
    <div className="space-y-4">
      <Button type="submit" form="register-form" className="w-full" disabled={isLoading}>
        {isLoading ? <LoadingSpinner /> : (isAdminEdit ? 'Update Account' : 'Create Account')}
      </Button>
      {!isAdminEdit && (
        <div className="text-center">
          <Button variant="link" onClick={onToggleMode}>
            Already have an account? Sign in
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Card className={isAdminEdit ? "w-full h-full" : "w-full max-w-md mx-auto"}>
      <StaticFormLayout
        header={
          <CardHeader className="space-y-1">
            {formHeader}
          </CardHeader>
        }
        footer={
          <CardContent className="pt-0">
            {formFooter}
          </CardContent>
        }
      >
        <CardContent>
          <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
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
              onValueChange={(value: 'teacher' | 'student') => 
                setFormData({ ...formData, role: value, classId: '', classIds: [], subjectIds: [] })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your class" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  {classes.length > 0 ? (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-classes" disabled>No classes available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.role === 'teacher' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="classes">Classes</Label>
                <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                  {classes.length > 0 ? (
                    classes.map((cls) => (
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
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">No classes available</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects</Label>
                <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                  {subjects.length > 0 ? (
                    subjects.map((subject) => (
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
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">No subjects available</div>
                  )}
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </form>
        </CardContent>
      </StaticFormLayout>
    </Card>
  );
};