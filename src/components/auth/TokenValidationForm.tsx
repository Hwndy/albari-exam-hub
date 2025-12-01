import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface TokenValidationFormProps {
  onValidToken: (schoolId: string, schoolName: string) => void;
  onBackToLogin: () => void;
}

export const TokenValidationForm: React.FC<TokenValidationFormProps> = ({
  onValidToken,
  onBackToLogin
}) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsValidating(true);

    try {
      const { data: school, error: queryError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('registration_token', token.trim())
        .eq('is_active', true)
        .single();

      if (queryError || !school) {
        setError('Invalid registration token. Please contact your school administrator.');
      } else {
        onValidToken(school.id, school.name);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Authorization Required</CardTitle>
        <CardDescription className="text-center">
          Enter your registration token to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Registration Token</Label>
            <Input
              id="token"
              type="text"
              placeholder="Enter your token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isValidating}>
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Token'
            )}
          </Button>
        </form>
        
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onBackToLogin}>
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};