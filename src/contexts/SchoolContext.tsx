import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface School {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  settings?: any;
}

interface SchoolContextType {
  currentSchool: School | null;
  schoolId: string | null;
  isLoading: boolean;
  refreshSchool: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchool = async () => {
    try {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      // Get user's profile to find their school_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.school_id) {
        setSchoolId(profile.school_id);

        // Fetch school details
        const { data: school } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profile.school_id)
          .single();

        if (school) {
          setCurrentSchool(school);
        }
      }
    } catch (error) {
      console.error('Error fetching school:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchool();
  }, [user, isAuthenticated]);

  const refreshSchool = async () => {
    setIsLoading(true);
    await fetchSchool();
  };

  return (
    <SchoolContext.Provider value={{ currentSchool, schoolId, isLoading, refreshSchool }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
