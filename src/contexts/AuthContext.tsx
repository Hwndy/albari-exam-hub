import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, AuthState, LoginCredentials } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: { 
    email: string; 
    password: string; 
    fullName: string; 
    role?: string;
    classId?: string;
    classIds?: string[];
    subjectIds?: string[];
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile and role from database asynchronously
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              console.log('🔍 Fetching profile and role for user:', session.user.id);
              
              // Fetch profile from profiles table
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              if (!mounted) return;
              
              if (profileError) {
                console.error('❌ Profile fetch error:', profileError);
              } else {
                console.log('✅ Profile fetched:', profile);
              }
              
              // Fetch role from user_roles table
              const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();
              
              if (!mounted) return;
              
              if (roleError) {
                console.error('❌ Role fetch error:', roleError);
              } else {
                console.log('✅ Role fetched:', roleData);
              }
              
              // Determine role (default to 'student' if not found)
              const userRole = roleData?.role || 'student';
              console.log('📝 Final role assigned:', userRole);
              
              // Create user object
              const userObject = {
                id: session.user.id,
                email: session.user.email!,
                name: profile?.full_name || session.user.email!,
                role: userRole as 'admin' | 'teacher' | 'student' | 'parent',
                createdAt: profile?.created_at || new Date().toISOString(),
              };
              
              console.log('👤 User object created:', userObject);
              setUser(userObject);
              
            } catch (error) {
              console.error('❌ Auth state change error:', error);
              if (!mounted) return;
              
              // Fallback user object
              setUser({
                id: session.user.id,
                email: session.user.email!,
                name: session.user.email!,
                role: 'student',
                createdAt: new Date().toISOString(),
              });
            }
            
            if (mounted) {
              setIsLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (!session) {
        setIsLoading(false);
      }
      // If there's a session, the onAuthStateChange will handle it
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    console.log('Login attempt for:', credentials.email);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      console.log('Login error:', error.message);
      setIsLoading(false);
      throw new Error(error.message);
    }
    
    console.log('Login successful, waiting for auth state change...');
    // Don't set loading to false here - let the auth state change handle it
  };

  const register = async (userData: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    classId?: string;
    classIds?: string[];
    subjectIds?: string[];
  }) => {
    setIsLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: userData.fullName,
          role: userData.role || 'student',
          class_id: userData.classId,
          subject_ids: userData.subjectIds
        }
      }
    });

    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }

    // Handle class and subject assignments after user creation
    if (data.user && userData.role === 'student' && userData.classId) {
      try {
        await supabase.from('class_assignments').insert({
          student_id: data.user.id,
          class_id: userData.classId
        });
      } catch (assignmentError) {
        console.error('Error assigning class:', assignmentError);
      }
    }

    if (data.user && userData.role === 'teacher') {
      try {
        // Handle subject assignments for teachers
        if (userData.subjectIds?.length) {
          const subjectAssignments = userData.subjectIds.map(subjectId => ({
            user_id: data.user!.id,
            subject_id: subjectId,
            class_id: userData.classIds?.[0] || null // Use first class if available
          }));
          await supabase.from('subject_assignments').insert(subjectAssignments);
        }
      } catch (assignmentError) {
        console.error('Error assigning subjects:', assignmentError);
      }
    }
  };

  const logout = async () => {
    try {
      console.log('Logout attempt...');
      
      // Clear localStorage items that might persist session data
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-irrxmoqbgygyyzozifdl-auth-token');
      
      // Check if we have a session before attempting logout
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session found, clearing state');
        setUser(null);
        setSession(null);
        return;
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('Logout error:', error.message);
      }
      
      // Always clear state after logout attempt
      setUser(null);
      setSession(null);
      
      console.log('Logout successful, state cleared');
    } catch (error: any) {
      console.log('Logout error:', error.message);
      // Always clear state on error to prevent stuck state
      setUser(null);
      setSession(null);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const value: AuthContextType = {
    user,
    token: session?.access_token || null,
    isAuthenticated: !!session && !!user,
    isLoading,
    login,
    logout,
    register,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};