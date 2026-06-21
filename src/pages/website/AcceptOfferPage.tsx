import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebsiteLayout } from '@/components/website/WebsiteLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfferData {
  id: string;
  application_id: string;
  acceptance_deadline: string;
  status: string;
  accepted_at?: string;
  declined_at?: string;
}

interface ApplicationData {
  id: string;
  application_number: string;
  first_name: string;
  last_name: string;
  email: string;
  admitted_to_class_id: string;
  classes?: { name: string };
}

export const AcceptOfferPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [application, setApplication] = useState<ApplicationData | null>(null);

  useEffect(() => {
    if (token) {
      loadOfferDetails();
    }
  }, [token]);

  const loadOfferDetails = async () => {
    try {
      const { data: offerData, error: offerError } = await supabase
        .from('admission_offers')
        .select('id, application_id, acceptance_deadline, status, accepted_at, declined_at')
        .eq('acceptance_token', token)
        .maybeSingle();

      if (offerError) throw offerError;

      if (offerData) {
        const { data: appData, error: appError } = await supabase
          .from('admission_applications')
          .select('id, application_number, first_name, last_name, email, admitted_to_class_id')
          .eq('id', offerData.application_id)
          .maybeSingle();
        
        if (appError) throw appError;

        let className = 'N/A';
        if (appData?.admitted_to_class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', appData.admitted_to_class_id)
            .maybeSingle();
          if (classData) className = classData.name;
        }

        setOffer({
          id: offerData.id,
          application_id: offerData.application_id,
          acceptance_deadline: offerData.acceptance_deadline,
          status: offerData.status,
          accepted_at: offerData.accepted_at,
          declined_at: offerData.declined_at,
        });

        if (appData) {
          setApplication({
            id: appData.id,
            application_number: appData.application_number,
            first_name: appData.first_name,
            last_name: appData.last_name,
            email: appData.email,
            admitted_to_class_id: appData.admitted_to_class_id,
            classes: { name: className },
          });
        }
      }
    } catch (error) {
      console.error('Error loading offer:', error);
      toast({
        title: 'Error',
        description: 'Invalid or expired offer link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token || !application) return;

    setProcessing(true);
    try {
      // Use secure edge function to accept offer
      const { data: acceptData, error: acceptError } = await supabase.functions.invoke('accept-offer', {
        body: {
          acceptance_token: token,
          decision: 'accepted',
        },
      });

      if (acceptError) throw acceptError;

      if (acceptData.error) {
        throw new Error(acceptData.error);
      }

      // Initialize payment after successful acceptance
      const { data, error } = await supabase.functions.invoke('initialize-acceptance-payment', {
        body: {
          application_id: acceptData.application_id,
          amount: 50000,
          email: application.email,
          callback_url: `${window.location.origin}/payment-callback`,
        },
      });

      if (error) throw error;

      window.location.href = data.authorization_url;
    } catch (error: any) {
      console.error('Error accepting offer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process acceptance',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;

    setProcessing(true);
    try {
      // Use secure edge function to decline offer
      const { data, error } = await supabase.functions.invoke('accept-offer', {
        body: {
          acceptance_token: token,
          decision: 'declined',
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Offer Declined',
        description: 'We appreciate your consideration',
      });

      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      console.error('Error declining offer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline offer',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <WebsiteLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </WebsiteLayout>
    );
  }

  if (!offer || !application) {
    return (
      <WebsiteLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Invalid Offer
              </CardTitle>
              <CardDescription>
                This offer link is invalid or has expired
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </WebsiteLayout>
    );
  }

  if (offer.status !== 'pending') {
    return (
      <WebsiteLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Offer Already Processed</CardTitle>
              <CardDescription>
                This offer has already been {offer.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/track-application')} className="w-full">
                Track Application
              </Button>
            </CardContent>
          </Card>
        </div>
      </WebsiteLayout>
    );
  }

  const isExpired = new Date(offer.acceptance_deadline) < new Date();

  return (
    <WebsiteLayout>
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Congratulations!
              </CardTitle>
              <CardDescription>
                You have been offered admission to Al-Bari Group of Schools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-6 rounded-lg space-y-3">
                <h3 className="font-semibold text-lg">Admission Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Application Number</p>
                    <p className="font-medium">{application.application_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Student Name</p>
                    <p className="font-medium">{application.first_name} {application.last_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Class</p>
                    <p className="font-medium">{application.classes?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Acceptance Fee</p>
                    <p className="font-medium">₦50,000</p>
                  </div>
                </div>
              </div>

              {isExpired && (
                <Alert variant="destructive">
                  <AlertDescription>
                    This offer expired on {new Date(offer.acceptance_deadline).toLocaleDateString()}. 
                    Please contact admissions for assistance.
                  </AlertDescription>
                </Alert>
              )}

              {!isExpired && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium">Next Steps:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Accept this admission offer</li>
                      <li>Pay the acceptance fee (₦50,000)</li>
                      <li>Complete enrollment process</li>
                      <li>Receive your student credentials</li>
                    </ol>
                  </div>

                  <Alert>
                    <CreditCard className="h-4 w-4" />
                    <AlertDescription>
                      Acceptance deadline: {new Date(offer.acceptance_deadline).toLocaleDateString()}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleAccept}
                      disabled={processing}
                      className="flex-1"
                      size="lg"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept & Pay Fee
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDecline}
                      disabled={processing}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline Offer
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WebsiteLayout>
  );
};
