import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type AuthMode = 'login' | 'register' | 'forgot-password';

export const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [allowStudentRegistration, setAllowStudentRegistration] = useState(true);
  const { isAuthenticated, user, isLoading } = useAuth();

  // Redirect authenticated users to their dashboard
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    switch (user.role) {
      case 'student':
        return <Navigate to="/dashboard" replace />;
      case 'teacher':
        return <Navigate to="/dashboard" replace />;
      case 'admin':
        return <Navigate to="/dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  useEffect(() => {
    // Fetch app settings to check if student registration is allowed
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'allow_student_registration')
        .single();
      
      if (data) {
        setAllowStudentRegistration(data.setting_value === true);
      }
    };

    fetchSettings();
  }, []);

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm 
            onToggleMode={() => setMode('register')}
            onForgotPassword={() => setMode('forgot-password')}
          />
        );
      case 'register':
        return (
          <RegisterForm 
            onToggleMode={() => setMode('login')}
            allowStudentRegistration={allowStudentRegistration}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordForm 
            onToggleMode={() => setMode('login')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderForm()}
      </div>
    </div>
  );
};