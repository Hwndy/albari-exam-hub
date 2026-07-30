import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WebsiteLayout } from '@/components/website/WebsiteLayout';

export const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [enrollment, setEnrollment] = useState<{
    admission_number?: string | null;
    login_email?: string | null;
    application_number?: string | null;
    student_name?: string | null;
  } | null>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    const reference = searchParams.get('reference');
    
    if (!reference) {
      setStatus('failed');
      setMessage('No payment reference found');
      return;
    }

    try {
      // Determine which verification function to call based on payment type
      // Check the payment record first
      const { data: payment } = await supabase
        .from('admission_payments')
        .select('payment_type')
        .eq('transaction_id', reference)
        .single();

      let functionName = 'verify-admission-payment';
      if (payment?.payment_type === 'acceptance_fee') {
        functionName = 'verify-acceptance-payment';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { reference },
      });

      if (error) throw error;

      if (data?.success) {
        setStatus('success');
        setMessage('Payment verified successfully!');
        if (functionName === 'verify-acceptance-payment' && data.admission_number) {
          setEnrollment({
            admission_number: data.admission_number,
            login_email: data.login_email,
            application_number: data.application_number,
            student_name: data.student_name,
          });
        }
        toast({
          title: 'Payment Successful',
          description: 'Your payment has been confirmed.',
        });
      } else {
        setStatus('failed');
        setMessage('Payment verification failed. Please contact support.');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage('An error occurred while verifying your payment.');
      toast({
        title: 'Verification Error',
        description: 'Could not verify payment. Please contact admissions.',
        variant: 'destructive',
      });
    }
  };

  return (
    <WebsiteLayout>
      <div className="min-h-screen py-12 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            {status === 'verifying' && (
              <>
                <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  {enrollment ? 'Enrollment Complete!' : 'Payment Successful!'}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {enrollment
                    ? 'Your acceptance fee has been received and your place is confirmed.'
                    : message}
                </p>

                {enrollment && (
                  <div className="bg-muted rounded-lg p-4 mb-6 text-left space-y-2 text-sm">
                    {enrollment.student_name && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Student</span>
                        <span className="font-medium">{enrollment.student_name}</span>
                      </div>
                    )}
                    {enrollment.application_number && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Application No.</span>
                        <span className="font-medium">{enrollment.application_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Admission No.</span>
                      <span className="font-bold text-primary">{enrollment.admission_number}</span>
                    </div>
                    {enrollment.login_email && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Login Email</span>
                        <span className="font-medium break-all">{enrollment.login_email}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      Your login details, including a temporary password, have been sent to this
                      email address. Please change your password after your first sign in.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {enrollment && (
                    <Button onClick={() => navigate('/login')} className="w-full">
                      Go to Student Login
                    </Button>
                  )}
                  <Button
                    onClick={() => navigate('/track-application')}
                    variant={enrollment ? 'outline' : 'default'}
                    className="w-full"
                  >
                    Track Application
                  </Button>
                  <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                    Return Home
                  </Button>
                </div>
              </>
            )}

            {status === 'failed' && (
              <>
                <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-destructive mb-2">Payment Failed</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="space-y-3">
                  <Button onClick={() => navigate('/apply')} className="w-full">
                    Try Again
                  </Button>
                  <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                    Return Home
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </WebsiteLayout>
  );
};