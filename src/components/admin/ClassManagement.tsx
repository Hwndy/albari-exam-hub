import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { Class, ClassAssignment, Profile } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ClassManagement = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [classForm, setClassForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      // Fetch class assignments
      const { data: assignmentsData } = await supabase
        .from('class_assignments')
        .select('*');

      // Fetch student profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (classesData) setClasses(classesData);
      if (assignmentsData) setAssignments(assignmentsData);
      if (profilesData) setProfiles(profilesData);
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

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('classes')
        .insert([{
          name: classForm.name,
          description: classForm.description,
        }]);

      if (error) throw error;

      await fetchData();
      setIsAddingClass(false);
      resetClassForm();
      
      toast({
        title: 'Class Created',
        description: `${classForm.name} has been created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create class',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: classForm.name,
          description: classForm.description,
        })
        .eq('id', editingClass.id);

      if (error) throw error;

      await fetchData();
      setEditingClass(null);
      resetClassForm();
      
      toast({
        title: 'Class Updated',
        description: 'Class information has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update class',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete ${className}?`)) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: 'Class Deleted',
        description: `${className} has been deleted successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete class',
        variant: 'destructive',
      });
    }
  };

  const resetClassForm = () => {
    setClassForm({
      name: '',
      description: '',
    });
  };

  const startEditing = (cls: Class) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      description: cls.description || '',
    });
  };

  const getStudentCount = (classId: string) => {
    return assignments.filter(assignment => assignment.class_id === classId).length;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Class Management</h2>
        <Dialog open={isAddingClass} onOpenChange={setIsAddingClass}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name</Label>
                <Input
                  id="name"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="e.g., JSS 1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={classForm.description}
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                  placeholder="Class description (optional)"
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit">Add Class</Button>
                <Button type="button" variant="outline" onClick={() => setIsAddingClass(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <Card key={cls.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{cls.name}</span>
                <div className="flex space-x-1">
                  <Button variant="outline" size="sm" onClick={() => startEditing(cls)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClass(cls.id, cls.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cls.description && (
                  <p className="text-sm text-muted-foreground">{cls.description}</p>
                )}
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {getStudentCount(cls.id)} students
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(cls.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Class Dialog */}
      <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Class Name</Label>
              <Input
                id="editName"
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={classForm.description}
                onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
              />
            </div>
            <div className="flex space-x-2">
              <Button type="submit">Update Class</Button>
              <Button type="button" variant="outline" onClick={() => setEditingClass(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};