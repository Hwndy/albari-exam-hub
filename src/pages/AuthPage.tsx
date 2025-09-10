import React, { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'login' | 'register' | 'forgot-password';

export const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [allowStudentRegistration, setAllowStudentRegistration] = useState(true);

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