import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StaticFormLayout } from '@/components/layout/StaticFormLayout';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

type RegisterMode = 'staff' | 'parent';

interface RegisterFormProps {
  schoolName?: string;
  onToggleMode: () => void;
  /** 'parent' renders the parent/guardian sign-up, anything else the code-protected staff sign-up */
  initialRole?: 'teacher' | 'student' | 'parent';
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  schoolName,
  onToggleMode,
  initialRole,
}) => {
  const mode: RegisterMode = initialRole === 'parent' ? 'parent' : 'staff';
  const isParent = mode === 'parent';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    classIds: [] as string[],
    subjectIds: [] as string[],
    phone: '',
    staffCode: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isParent) return;
    (async () => {
      const [classesRes, subjectsRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
      ]);
      if (classesRes.error || subjectsRes.error) {
        toast({ title: 'Error', description: 'Failed to load classes and subjects', variant: 'destructive' });
      }
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    })();
  }, [isParent, toast]);

  const toggleId = (key: 'classIds' | 'subjectIds', id: string, checked: boolean) => {
    setFormData(f => ({
      ...f,
      [key]: checked ? [...f[key], id] : f[key].filter(x => x !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = formData.fullName.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();

    if (fullName.length < 2 || fullName.length > 120) {
      toast({ title: 'Error', description: 'Enter a valid full name', variant: 'destructive' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Error', description: 'Enter a valid email address', variant: 'destructive' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (formData.password.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters long', variant: 'destructive' });
      return;
    }

    if (isParent) {
      if (!/^[+\d][\d\s()-]{6,19}$/.test(phone)) {
        toast({ title: 'Error', description: 'Enter a valid phone number', variant: 'destructive' });
        return;
      }
    } else {
      if (!formData.staffCode.trim()) {
        toast({ title: 'Authorization code required', description: 'Enter the staff authorization code provided by the school.', variant: 'destructive' });
        return;
      }
      if (formData.classIds.length === 0) {
        toast({ title: 'Error', description: 'Select at least one class', variant: 'destructive' });
        return;
      }
      if (formData.subjectIds.length === 0) {
        toast({ title: 'Error', description: 'Select at least one subject', variant: 'destructive' });
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isParent) {
        await register({
          email,
          password: formData.password,
          fullName,
          role: 'parent',
          phone,
        });
        toast({
          title: 'Account created',
          description: 'Check your email to confirm your account, then link your children with their admission number.',
        });
      } else {
        const { data, error } = await supabase.functions.invoke('register-staff', {
          body: {
            fullName,
            email,
            password: formData.password,
            staffCode: formData.staffCode.trim(),
            classIds: formData.classIds,
            subjectIds: formData.subjectIds,
          },
        });

        const payload: any = data;
        if (error || !payload?.success) {
          let message = payload?.message;
          if (!message && error) {
            try {
              message = JSON.parse(await (error as any).context?.text?.())?.message;
            } catch {
              message = error.message;
            }
          }
          throw new Error(message || 'Could not create the staff account.');
        }

        toast({ title: 'Teacher account created', description: 'Signing you in…' });
        await login({ email, password: formData.password });
      }
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
        {isParent ? 'Create a parent account' : 'Create a staff account'}
      </CardTitle>
      <CardDescription>
        {isParent
          ? 'Follow your children’s results, attendance and fees.'
          : `Teachers only. ${schoolName ? `Registering for: ${schoolName}` : 'An authorization code from the school is required.'}`}
      </CardDescription>
    </div>
  );

  const formFooter = (
    <div className="space-y-4">
      <Button type="submit" form="register-form" className="w-full" disabled={isLoading}>
        {isLoading ? <LoadingSpinner /> : 'Create Account'}
      </Button>
      <div className="text-center">
        <Button variant="link" onClick={onToggleMode}>
          Already have an account? Sign in
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <StaticFormLayout
        header={<CardHeader className="space-y-1">{formHeader}</CardHeader>}
        footer={<CardContent className="pt-0">{formFooter}</CardContent>}
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
                maxLength={120}
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
                maxLength={255}
                required
              />
            </div>

            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Account type: <span className="font-medium text-foreground">{isParent ? 'Parent / Guardian' : 'Teacher'}</span>
            </div>

            {isParent && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  maxLength={20}
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                  After sign-up you'll link your children using their admission number and date of birth.
                </p>
              </div>
            )}

            {!isParent && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="staffCode" className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Authorization code
                  </Label>
                  <Input
                    id="staffCode"
                    type="password"
                    placeholder="Staff authorization code"
                    value={formData.staffCode}
                    onChange={(e) => setFormData({ ...formData, staffCode: e.target.value })}
                    required
                    maxLength={100}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Issued by the school administrator. Accounts cannot be created without it.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Classes</Label>
                  <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                    {classes.length > 0 ? (
                      classes.map((cls) => (
                        <div key={cls.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            id={`class-${cls.id}`}
                            checked={formData.classIds.includes(cls.id)}
                            onChange={(e) => toggleId('classIds', cls.id, e.target.checked)}
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
                  <Label>Subjects</Label>
                  <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <div key={subject.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            id={`subject-${subject.id}`}
                            checked={formData.subjectIds.includes(subject.id)}
                            onChange={(e) => toggleId('subjectIds', subject.id, e.target.checked)}
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
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
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
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
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
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </StaticFormLayout>
    </Card>
  );
};
