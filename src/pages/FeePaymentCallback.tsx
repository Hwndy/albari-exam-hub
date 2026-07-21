import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const FeePaymentCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your school fee payment…');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) { setState('error'); setMessage('No payment reference was returned.'); return; }
    supabase.functions.invoke('verify-fee-payment', { body: { reference } }).then(({ data, error }) => {
      if (error || !data?.success) { setState('error'); setMessage(data?.error || error?.message || 'Payment could not be confirmed.'); }
      else { setState('success'); setMessage(`Payment confirmed${data.receipt_number ? ` — receipt ${data.receipt_number}` : ''}.`); }
    });
  }, [params]);

  return <main className="min-h-screen flex items-center justify-center p-4 bg-background">
    <Card className="w-full max-w-md"><CardContent className="p-8 text-center space-y-4">
      {state === 'loading' && <Loader2 className="h-14 w-14 animate-spin mx-auto text-primary" />}
      {state === 'success' && <CheckCircle2 className="h-14 w-14 mx-auto text-success" />}
      {state === 'error' && <XCircle className="h-14 w-14 mx-auto text-destructive" />}
      <h1 className="text-2xl font-bold">{state === 'loading' ? 'Verifying payment' : state === 'success' ? 'Payment successful' : 'Verification failed'}</h1>
      <p className="text-muted-foreground">{message}</p>
      {state !== 'loading' && <Button onClick={() => navigate('/dashboard')} className="w-full">Return to parent portal</Button>}
    </CardContent></Card>
  </main>;
};