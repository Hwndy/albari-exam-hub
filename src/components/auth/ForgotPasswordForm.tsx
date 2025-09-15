import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Key, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ForgotPasswordFormProps {
  onToggleMode: () => void;
}

type ResetStep = 'email' | 'otp' | 'password';

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentStep, setCurrentStep] = useState<ResetStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: { 
          email: email.trim().toLowerCase(),
          type: 'reset_password'
        }
      });

      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: "Please check your email for the verification code.",
      });
      setCurrentStep('otp');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Just verify OTP is valid, don't reset password yet
      setCurrentStep('password');
      toast({
        title: "Code Verified",
        description: "Please enter your new password.",
      });
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Invalid or expired OTP code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { 
          email: email.trim().toLowerCase(),
          otp: otpCode.trim(),
          newPassword: newPassword,
          type: 'reset_password'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset. Please log in with your new password.",
        });
        onToggleMode(); // Go back to login
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter your email to receive a verification code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>
          
          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </form>
        
        <div className="mt-4">
          <Button variant="link" onClick={onToggleMode} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderOtpStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Key className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Enter Verification Code</CardTitle>
        <CardDescription>
          We sent a 6-digit code to {email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              className="h-11 text-center text-lg font-mono tracking-widest"
              maxLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full h-11" disabled={isLoading || otpCode.length !== 6}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>
        </form>
        
        <div className="mt-4 space-y-2">
          <Button 
            variant="link" 
            onClick={() => setCurrentStep('email')} 
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Email
          </Button>
          <Button 
            variant="link" 
            onClick={handleEmailSubmit}
            disabled={isLoading}
            className="w-full text-sm"
          >
            Resend Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPasswordStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="h-11"
              minLength={6}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-11"
              minLength={6}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-11" 
            disabled={isLoading || !newPassword || !confirmPassword}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
        
        <div className="mt-4">
          <Button 
            variant="link" 
            onClick={() => setCurrentStep('otp')} 
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Verification
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render appropriate step
  switch (currentStep) {
    case 'email':
      return renderEmailStep();
    case 'otp':
      return renderOtpStep();
    case 'password':
      return renderPasswordStep();
    default:
      return renderEmailStep();
  }
};