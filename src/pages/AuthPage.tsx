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
  const initialMode = new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [allowStudentRegistration, setAllowStudentRegistration] = useState(true);
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  
  // Check if user came from portal and needs forced login
  const searchParams = new URLSearchParams(window.location.search);
  const isPortalAccess = searchParams.get('portal') === 'true';
  const requestedRole = searchParams.get('role');

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

  // Handle portal access - force logout if coming from portal
  React.useEffect(() => {
    if (isPortalAccess && isAuthenticated) {
      logout();
    }
  }, [isPortalAccess, isAuthenticated, logout]);

  // Redirect authenticated users to their dashboard (only if not from portal)
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

  // Don't auto-redirect if user came from portal - force them to login
  if (isAuthenticated && user && !isPortalAccess) {
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
        {isPortalAccess && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary text-center">
              Please sign in to access your {requestedRole || 'portal'}
            </p>
          </div>
        )}
        {renderForm()}
      </div>
    </div>
  );
};