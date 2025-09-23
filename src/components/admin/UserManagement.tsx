import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { User, Profile, Class, Subject } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserEditModal } from './UserEditModal';

export const UserManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Add User Form State
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student' as 'admin' | 'teacher' | 'student',
    classId: '',
    classIds: [] as string[],
    subjectIds: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (profilesData) setProfiles(profilesData);
      if (classesData) setClasses(classesData);
      if (subjectsData) setSubjects(subjectsData);
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate role-specific requirements
    if (userForm.role === 'student' && !userForm.classId) {
      toast({
        title: 'Error',
        description: 'Please select a class for the student',
        variant: 'destructive',
      });
      return;
    }

    if (userForm.role === 'teacher' && userForm.subjectIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one subject for the teacher',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Use the create_user_with_profile function
      const { data, error } = await supabase.rpc('create_user_with_profile', {
        user_email: userForm.email,
        user_password: userForm.password,
        user_full_name: userForm.fullName,
        user_role: userForm.role
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error(data.error as string);
      }

      // Create the actual user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            full_name: userForm.fullName,
            role: userForm.role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Handle role-specific assignments
        if (userForm.role === 'student' && userForm.classId) {
          await supabase
            .from('class_assignments')
            .insert({
              student_id: authData.user.id,
              class_id: userForm.classId
            });
        }

        if (userForm.role === 'teacher') {
          // Add subject assignments
          if (userForm.subjectIds.length > 0) {
            const subjectAssignments = userForm.subjectIds.map(subjectId => ({
              user_id: authData.user.id,
              subject_id: subjectId
            }));
            await supabase
              .from('subject_assignments')
              .insert(subjectAssignments);
          }

          // Add class assignments for teachers
          if (userForm.classIds.length > 0) {
            const classAssignments = userForm.classIds.map(classId => ({
              teacher_id: authData.user.id,
              class_id: classId
            }));
            await supabase
              .from('teacher_class_assignments')
              .insert(classAssignments);
          }
        }
      }

      // If successful, refresh the profiles list
      await fetchData();
      
      setIsAddingUser(false);
      resetUserForm();
      
      toast({
        title: 'User Created',
        description: `${userForm.fullName} has been added successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userForm.fullName,
          role: userForm.role,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      await fetchData();
      setEditingUser(null);
      resetUserForm();
      
      toast({
        title: 'User Updated',
        description: 'User information has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;

    try {
      // Use the delete_user_profile function
      const { data, error } = await supabase.rpc('delete_user_profile', {
        user_id_param: userId
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error(data.error as string);
      }

      await fetchData();
      
      toast({
        title: 'User Deleted',
        description: `${userName} has been deleted successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const resetUserForm = () => {
    setUserForm({
      fullName: '',
      email: '',
      password: '',
      role: 'student',
      classId: '',
      classIds: [],
      subjectIds: []
    });
  };

  const startEditing = (profile: Profile) => {
    setEditingUser(profile);
    setUserForm({
      fullName: profile.full_name,
      email: '',
      password: '',
      role: profile.role as 'admin' | 'teacher' | 'student',
      classId: '',
      classIds: [],
      subjectIds: []
    });
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || profile.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleStats = () => {
    return {
      total: profiles.length,
      students: profiles.filter(p => p.role === 'student').length,
      teachers: profiles.filter(p => p.role === 'teacher').length,
      admins: profiles.filter(p => p.role === 'admin').length,
    };
  };

  const stats = getRoleStats();

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.students}</div>
            <div className="text-sm text-muted-foreground">Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.teachers}</div>
            <div className="text-sm text-muted-foreground">Teachers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.admins}</div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="teacher">Teachers</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value: 'admin' | 'teacher' | 'student') =>
                    setUserForm({ ...userForm, role: value, classId: '', classIds: [], subjectIds: [] })
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

              {userForm.role === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select 
                    value={userForm.classId} 
                    onValueChange={(value) => setUserForm({ ...userForm, classId: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
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

              {userForm.role === 'teacher' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="classes">Classes</Label>
                    <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                      {classes.length > 0 ? (
                        classes.map((cls) => (
                          <div key={cls.id} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              id={`add-class-${cls.id}`}
                              checked={userForm.classIds.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUserForm({ 
                                    ...userForm, 
                                    classIds: [...userForm.classIds, cls.id] 
                                  });
                                } else {
                                  setUserForm({ 
                                    ...userForm, 
                                    classIds: userForm.classIds.filter(id => id !== cls.id) 
                                  });
                                }
                              }}
                              className="rounded border-input"
                            />
                            <label htmlFor={`add-class-${cls.id}`} className="text-sm text-foreground cursor-pointer">{cls.name}</label>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground py-2">No classes available</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subjects">Subjects *</Label>
                    <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                      {subjects.length > 0 ? (
                        subjects.map((subject) => (
                          <div key={subject.id} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              id={`add-subject-${subject.id}`}
                              checked={userForm.subjectIds.includes(subject.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUserForm({ 
                                    ...userForm, 
                                    subjectIds: [...userForm.subjectIds, subject.id] 
                                  });
                                } else {
                                  setUserForm({ 
                                    ...userForm, 
                                    subjectIds: userForm.subjectIds.filter(id => id !== subject.id) 
                                  });
                                }
                              }}
                              className="rounded border-input"
                            />
                            <label htmlFor={`add-subject-${subject.id}`} className="text-sm text-foreground cursor-pointer">{subject.name}</label>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground py-2">No subjects available</div>
                      )}
                    </div>
                  </div>
                </>
              )}
              <div className="flex space-x-2">
                <Button type="submit">Add User</Button>
                <Button type="button" variant="outline" onClick={() => setIsAddingUser(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="space-y-1">
                  <h3 className="font-semibold">{profile.full_name}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        profile.role === 'admin'
                          ? 'destructive'
                          : profile.role === 'teacher'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {profile.role}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Created: {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(profile)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteUser(profile.user_id, profile.full_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <UserEditModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onUserUpdated={fetchData}
      />
    </div>
  );
};