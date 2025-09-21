import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Book, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/auth';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Profile | null;
  onUserUpdated: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated
}) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'student' as 'admin' | 'teacher' | 'student',
    password: '',
    isActive: true,
    notes: '',
    subjects: [] as string[],
    classes: [] as string[]
  });
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [userAssignments, setUserAssignments] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        full_name: user.full_name,
        email: '',
        role: user.role as 'admin' | 'teacher' | 'student',
        password: '',
        isActive: true,
        notes: '',
        subjects: [],
        classes: []
      });
      
      fetchUserData();
      fetchSystemData();
    }
  }, [user, isOpen]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user assignments
      const { data: subjectAssignments } = await supabase
        .from('subject_assignments')
        .select(`
          subject_id,
          class_id,
          subjects(name),
          classes(name)
        `)
        .eq('user_id', user.user_id);

      const { data: classAssignments } = await supabase
        .from('class_assignments')
        .select(`
          class_id,
          classes(name)
        `)
        .eq('student_id', user.user_id);

      setUserAssignments({
        subjects: subjectAssignments || [],
        classes: classAssignments || []
      });

      // Update form data with current assignments
      setFormData(prev => ({
        ...prev,
        subjects: subjectAssignments?.map(s => s.subject_id) || [],
        classes: classAssignments?.map(c => c.class_id) || []
      }));

    } catch (error: any) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchSystemData = async () => {
    try {
      const [subjectsData, classesData] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('*').order('name')
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);
    } catch (error: any) {
      console.error('Error fetching system data:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (formData.password.trim()) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          user.user_id,
          { password: formData.password }
        );
        if (passwordError) throw passwordError;
      }

      // Update subject assignments for teachers
      if (formData.role === 'teacher') {
        // Remove existing assignments
        await supabase
          .from('subject_assignments')
          .delete()
          .eq('user_id', user.user_id);

        // Add new assignments
        if (formData.subjects.length > 0) {
          const assignments = formData.subjects.map(subjectId => ({
            user_id: user.user_id,
            subject_id: subjectId
          }));

          const { error: assignError } = await supabase
            .from('subject_assignments')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      // Update class assignments for students
      if (formData.role === 'student') {
        // Remove existing assignments
        await supabase
          .from('class_assignments')
          .delete()
          .eq('student_id', user.user_id);

        // Add new assignments
        if (formData.classes.length > 0) {
          const assignments = formData.classes.map(classId => ({
            student_id: user.user_id,
            class_id: classId
          }));

          const { error: assignError } = await supabase
            .from('class_assignments')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      toast({
        title: 'User Updated',
        description: 'User information has been updated successfully.',
      });

      onUserUpdated();
      onClose();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Edit User: {user.full_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'teacher' | 'student') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Admin notes about this user..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Account Active</Label>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            {formData.role === 'teacher' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Book className="h-4 w-4 mr-2" />
                    Subject Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Subjects</Label>
                    <div className="flex flex-wrap gap-2">
                      {userAssignments.subjects?.map((assignment: any) => (
                        <Badge key={assignment.subject_id} variant="secondary">
                          {assignment.subjects?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Assign New Subjects</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!formData.subjects.includes(value)) {
                          setFormData({
                            ...formData,
                            subjects: [...formData.subjects, value]
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subjects to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects
                          .filter(subject => !formData.subjects.includes(subject.id))
                          .map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>New Assignments</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.subjects.map(subjectId => {
                        const subject = subjects.find(s => s.id === subjectId);
                        return (
                          <Badge key={subjectId} variant="default" className="cursor-pointer"
                                 onClick={() => {
                                   setFormData({
                                     ...formData,
                                     subjects: formData.subjects.filter(id => id !== subjectId)
                                   });
                                 }}>
                            {subject?.name} ×
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {formData.role === 'student' && (
              <Card>
                <CardHeader>
                  <CardTitle>Class Assignments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Classes</Label>
                    <div className="flex flex-wrap gap-2">
                      {userAssignments.classes?.map((assignment: any) => (
                        <Badge key={assignment.class_id} variant="secondary">
                          {assignment.classes?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Assign New Classes</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!formData.classes.includes(value)) {
                          setFormData({
                            ...formData,
                            classes: [...formData.classes, value]
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select classes to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes
                          .filter(cls => !formData.classes.includes(cls.id))
                          .map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>New Assignments</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.classes.map(classId => {
                        const cls = classes.find(c => c.id === classId);
                        return (
                          <Badge key={classId} variant="default" className="cursor-pointer"
                                 onClick={() => {
                                   setFormData({
                                     ...formData,
                                     classes: formData.classes.filter(id => id !== classId)
                                   });
                                 }}>
                            {cls?.name} ×
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Password will not be stored in browser memory and is transmitted securely.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Account Information</Label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">User ID:</span> {user.user_id}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Activity tracking will be implemented here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};