import React, { useState, useEffect } from 'react';
import { useSchool } from '@/contexts/SchoolContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface School {
  id: string;
  name: string;
  subdomain: string;
  is_active: boolean;
}

export const SchoolSwitcher = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { currentSchool, schoolId, refreshSchool } = useSchool();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkSuperAdminAndFetchSchools();
  }, [user]);

  const checkSuperAdminAndFetchSchools = async () => {
    if (!user) return;

    try {
      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      const isSuperAdminUser = profile?.school_id === null;
      setIsSuperAdmin(isSuperAdminUser);

      if (isSuperAdminUser) {
        // Fetch all schools
        const { data: schoolsData, error } = await supabase
          .from('schools')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setSchools(schoolsData || []);
      }
    } catch (error: any) {
      console.error('Error checking super admin status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchoolSwitch = async (newSchoolId: string) => {
    if (!user) return;

    try {
      // Update user's profile with new school_id temporarily
      // Note: This is a temporary switch for viewing purposes
      // The actual profile school_id remains NULL for super admins
      await supabase
        .from('profiles')
        .update({ school_id: newSchoolId })
        .eq('user_id', user.id);

      // Refresh school context
      await refreshSchool();

      toast({
        title: 'School Switched',
        description: 'You are now viewing this school\'s data',
      });

      // Reload the page to update all components
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to switch school',
        variant: 'destructive',
      });
    }
  };

  const resetToSuperAdminView = async () => {
    if (!user) return;

    try {
      // Reset school_id back to NULL
      await supabase
        .from('profiles')
        .update({ school_id: null })
        .eq('user_id', user.id);

      await refreshSchool();

      toast({
        title: 'Reset Complete',
        description: 'Viewing all schools as super admin',
      });

      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to reset view',
        variant: 'destructive',
      });
    }
  };

  if (!isSuperAdmin || isLoading) return null;

  return (
    <div className="flex items-center gap-2 border-l border-border pl-4">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={schoolId || 'all-schools'}
        onValueChange={(value) => {
          if (value === 'all-schools') {
            resetToSuperAdminView();
          } else {
            handleSchoolSwitch(value);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select School" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-schools">
            All Schools (Super Admin)
          </SelectItem>
          {schools.map((school) => (
            <SelectItem key={school.id} value={school.id}>
              {school.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
