import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, AuthState, LoginCredentials } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: { email: string; password: string; fullName: string; role?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile from our database
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
            
          if (profile) {
            setUser({
              id: session.user.id, // Use session.user.id instead of profile.user_id
              email: session.user.email!,
              name: profile.full_name,
              role: profile.role as 'admin' | 'teacher' | 'student',
              createdAt: profile.created_at,
            });
          }
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
  };

  const register = async (userData: { email: string; password: string; fullName: string; role?: string }) => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: userData.fullName,
          role: userData.role || 'student'
        }
      }
    });

    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
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