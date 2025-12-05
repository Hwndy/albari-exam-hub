import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, Building2, CheckCircle2, XCircle, Users, UserPlus, Key, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';

interface School {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: any;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  settings?: any;
  registration_token?: string | null;
}

export const SchoolManagement = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isAddingSchool, setIsAddingSchool] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingAdmins, setCreatingAdmins] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { schoolId, isLoading: schoolLoading } = useSchool();

  // Wait for school context to load before checking super admin status
  if (schoolLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // GUARD: Only super admins can access (school_id = null means super admin)
  const isSuperAdmin = schoolId === null;
  
  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Unauthorized Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page is only accessible to Super Administrators. School admins cannot manage schools.
          </p>
        </CardContent>
      </Card>
    );
  }

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    subdomain: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    primary_color: '#0066cc',
    secondary_color: '#00cc66',
    registration_token: '',
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchoolAdmins = async () => {
    if (!confirm('This will create admin accounts for all schools that don\'t have admins yet. Default password will be "Admin123!" which schools must change. Continue?')) {
      return;
    }

    try {
      setCreatingAdmins(true);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('create-school-admins', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: data.message,
      });

      // Show details in console for reference
      console.log('Admin accounts created:', data);
      
      // Refresh schools list
      await fetchSchools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create admin accounts',
        variant: 'destructive',
      });
    } finally {
      setCreatingAdmins(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSchool) {
        // Update existing school
        const { error } = await supabase
          .from('schools')
          .update({
            name: schoolForm.name,
            subdomain: schoolForm.subdomain,
            contact_email: schoolForm.contact_email,
            contact_phone: schoolForm.contact_phone,
            address: schoolForm.address,
            primary_color: schoolForm.primary_color,
            secondary_color: schoolForm.secondary_color,
            registration_token: schoolForm.registration_token,
          })
          .eq('id', editingSchool.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'School updated successfully',
        });
      } else {
        // Create new school via edge function
        const { data, error } = await supabase.functions.invoke('create-school', {
          body: schoolForm,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'School created successfully',
        });
      }

      resetForm();
      fetchSchools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (school: School) => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({ is_active: !school.is_active })
        .eq('id', school.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `School ${school.is_active ? 'deactivated' : 'activated'} successfully`,
      });

      fetchSchools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (schoolId: string) => {
    if (!confirm('Are you sure? This will affect all users and data in this school.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'School deleted successfully',
      });

      fetchSchools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyToken = (token: string | null) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    toast({ 
      title: 'Copied!', 
      description: 'Registration token copied to clipboard' 
    });
  };

  const handleRegenerateToken = async () => {
    if (!editingSchool) return;
    
    if (!confirm('Regenerating will invalidate the current token. Users with the old token will not be able to register. Continue?')) {
      return;
    }
    
    // Generate new 7-character token
    const newToken = Math.random().toString(36).substring(2, 9);
    
    const { error } = await supabase
      .from('schools')
      .update({ registration_token: newToken })
      .eq('id', editingSchool.id);
    
    if (error) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
      return;
    }
    
    setSchoolForm({ ...schoolForm, registration_token: newToken });
    toast({ 
      title: 'Success', 
      description: 'Token regenerated successfully' 
    });
    fetchSchools();
  };

  const startEditing = (school: School) => {
    setEditingSchool(school);
    setSchoolForm({
      name: school.name,
      subdomain: school.subdomain,
      contact_email: school.contact_email || '',
      contact_phone: school.contact_phone || '',
      address: school.address || '',
      primary_color: school.primary_color || '#0066cc',
      secondary_color: school.secondary_color || '#00cc66',
      registration_token: school.registration_token || '',
    });
    setIsAddingSchool(true);
  };

  const resetForm = () => {
    setSchoolForm({
      name: '',
      subdomain: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      primary_color: '#0066cc',
      secondary_color: '#00cc66',
      registration_token: '',
    });
    setEditingSchool(null);
    setIsAddingSchool(false);
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">School Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage all schools in the system
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleCreateSchoolAdmins}
            disabled={creatingAdmins}
            variant="outline"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {creatingAdmins ? 'Creating Admins...' : 'Create School Admins'}
          </Button>
          
          <Dialog open={isAddingSchool} onOpenChange={setIsAddingSchool}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add School
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSchool ? 'Edit School' : 'Add New School'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">School Name *</Label>
                  <Input
                    id="name"
                    value={schoolForm.name}
                    onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subdomain">Subdomain *</Label>
                  <Input
                    id="subdomain"
                    value={schoolForm.subdomain}
                    onChange={(e) => setSchoolForm({ ...schoolForm, subdomain: e.target.value.toLowerCase() })}
                    placeholder="school-name"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be used as: {schoolForm.subdomain}.yourdomain.com
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={schoolForm.contact_email}
                    onChange={(e) => setSchoolForm({ ...schoolForm, contact_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={schoolForm.contact_phone}
                    onChange={(e) => setSchoolForm({ ...schoolForm, contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <Input
                    id="primary_color"
                    type="color"
                    value={schoolForm.primary_color}
                    onChange={(e) => setSchoolForm({ ...schoolForm, primary_color: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <Input
                    id="secondary_color"
                    type="color"
                    value={schoolForm.secondary_color}
                    onChange={(e) => setSchoolForm({ ...schoolForm, secondary_color: e.target.value })}
                  />
                </div>
              </div>

              {editingSchool && (
                <div>
                  <Label>Registration Token</Label>
                  <div className="flex gap-2">
                    <Input
                      value={schoolForm.registration_token}
                      readOnly
                      className="font-mono bg-muted"
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleRegenerateToken}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share this token with school staff to allow registration
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSchool ? 'Update School' : 'Create School'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSchools.map((school) => (
          <Card key={school.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{school.name}</CardTitle>
                </div>
                {school.is_active ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Inactive
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <strong>Subdomain:</strong> {school.subdomain}
                </p>
                {school.contact_email && (
                  <p className="text-muted-foreground">
                    <strong>Email:</strong> {school.contact_email}
                  </p>
                )}
                {school.contact_phone && (
                  <p className="text-muted-foreground">
                    <strong>Phone:</strong> {school.contact_phone}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                <Key className="h-4 w-4 text-primary" />
                <code className="text-sm font-mono flex-1">
                  {school.registration_token || 'No token'}
                </code>
                {school.registration_token && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToken(school.registration_token)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => startEditing(school)}
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant={school.is_active ? "secondary" : "default"}
                  size="sm"
                  onClick={() => handleToggleActive(school)}
                >
                  {school.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(school.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSchools.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No schools found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search' : 'Get started by creating a new school'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
