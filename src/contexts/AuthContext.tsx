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
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile from our database asynchronously
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
                
              if (!mounted) return;
                
              if (error) {
                console.error('Profile fetch error:', error);
                // Create a basic user object even if profile fetch fails
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  name: session.user.email!,
                  role: 'student', // Default role
                  createdAt: new Date().toISOString(),
                });
              } else if (profile) {
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  name: profile.full_name || session.user.email!,
                  role: profile.role as 'admin' | 'teacher' | 'student',
                  createdAt: profile.created_at,
                });
              }
            } catch (error) {
              console.error('Profile fetch failed:', error);
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
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
    // Don't set loading to false here - let the auth state change handle it
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