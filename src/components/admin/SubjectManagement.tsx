import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, BookOpen, Users } from 'lucide-react';
import { Subject, SubjectAssignment, ProfileWithRole } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const SubjectManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [profiles, setProfiles] = useState<ProfileWithRole[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      // Fetch subject assignments
      const { data: assignmentsData } = await supabase
        .from('subject_assignments')
        .select('*');

      // Fetch profiles with roles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*');

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Join profiles with roles
      const profilesWithRoles: ProfileWithRole[] = (profilesData || []).map(profile => {
        const userRole = rolesData?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'student'
        };
      });

      if (subjectsData) setSubjects(subjectsData);
      if (assignmentsData) setAssignments(assignmentsData);
      setProfiles(profilesWithRoles);
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

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('subjects')
        .insert([{
          name: subjectForm.name,
          description: subjectForm.description,
        }]);

      if (error) throw error;

      await fetchData();
      setIsAddingSubject(false);
      resetSubjectForm();
      
      toast({
        title: 'Subject Created',
        description: `${subjectForm.name} has been created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create subject',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: subjectForm.name,
          description: subjectForm.description,
        })
        .eq('id', editingSubject.id);

      if (error) throw error;

      await fetchData();
      setEditingSubject(null);
      resetSubjectForm();
      
      toast({
        title: 'Subject Updated',
        description: 'Subject information has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update subject',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to delete ${subjectName}?`)) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: 'Subject Deleted',
        description: `${subjectName} has been deleted successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete subject',
        variant: 'destructive',
      });
    }
  };

  const resetSubjectForm = () => {
    setSubjectForm({
      name: '',
      description: '',
    });
  };

  const startEditing = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      description: subject.description || '',
    });
  };

  const getTeacherCount = (subjectId: string) => {
    const teacherIds = assignments
      .filter(assignment => assignment.subject_id === subjectId)
      .map(assignment => assignment.user_id);
    
    const teachers = profiles.filter(profile => 
      profile.role === 'teacher' && teacherIds.includes(profile.user_id)
    );
    
    return teachers.length;
  };

  const getStudentCount = (subjectId: string) => {
    const studentIds = assignments
      .filter(assignment => assignment.subject_id === subjectId)
      .map(assignment => assignment.user_id);
    
    const students = profiles.filter(profile => 
      profile.role === 'student' && studentIds.includes(profile.user_id)
    );
    
    return students.length;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subject Management</h2>
        <Dialog open={isAddingSubject} onOpenChange={setIsAddingSubject}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Subject Name</Label>
                <Input
                  id="name"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="Subject description (optional)"
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit">Add Subject</Button>
                <Button type="button" variant="outline" onClick={() => setIsAddingSubject(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span>{subject.name}</span>
                </div>
                <div className="flex space-x-1">
                  <Button variant="outline" size="sm" onClick={() => startEditing(subject)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSubject(subject.id, subject.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subject.description && (
                  <p className="text-sm text-muted-foreground">{subject.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {getTeacherCount(subject.id)} teachers
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {getStudentCount(subject.id)} students
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(subject.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Subject Dialog */}
      <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Subject Name</Label>
              <Input
                id="editName"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={subjectForm.description}
                onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
              />
            </div>
            <div className="flex space-x-2">
              <Button type="submit">Update Subject</Button>
              <Button type="button" variant="outline" onClick={() => setEditingSubject(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};