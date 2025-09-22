import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onToggleMode: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      toast({
        title: "Login Successful",
        description: "Welcome to ALBARI CBT System",
      });
      // Navigation will be handled by the auth state change in App.tsx
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center">
          <span className="text-xl sm:text-2xl font-bold text-primary-foreground">A</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold text-primary">ALBARI</CardTitle>
        <p className="text-sm sm:text-base text-muted-foreground">Computer Based Test System</p>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="h-10 sm:h-11 text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-10 sm:h-11 text-base pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="text-right">
            <button
              type="button"
              className="text-xs sm:text-sm text-primary hover:underline"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </div>
          
          <Button
            type="submit"
            className="w-full h-10 sm:h-11 text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Signing in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>
        
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onToggleMode} className="text-xs sm:text-sm">
            Don't have an account? Create one
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};