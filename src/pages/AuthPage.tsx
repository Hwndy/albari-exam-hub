import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { TokenValidationForm } from '@/components/auth/TokenValidationForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'token-validation';

export const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [allowStudentRegistration, setAllowStudentRegistration] = useState(true);
  const [tokenValidated, setTokenValidated] = useState(false);
  const { isAuthenticated, user, isLoading } = useAuth();

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

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm 
            onToggleMode={() => setMode('token-validation')}
            onForgotPassword={() => setMode('forgot-password')}
          />
        );
      case 'token-validation':
        return (
          <TokenValidationForm 
            onValidToken={() => {
              setTokenValidated(true);
              setMode('register');
            }}
            onBackToLogin={() => setMode('login')}
          />
        );
      case 'register':
        if (!tokenValidated) {
          setMode('token-validation');
          return null;
        }
        return (
          <RegisterForm 
            onToggleMode={() => {
              setMode('login');
              setTokenValidated(false);
            }}
            allowStudentRegistration={false}
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md">
        {renderForm()}
      </div>
    </div>
  );
};