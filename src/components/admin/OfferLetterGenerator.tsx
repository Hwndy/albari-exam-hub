import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Send, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfferLetterGeneratorProps {
  applicationId: string;
  onSent: () => void;
  trigger?: React.ReactNode;
}

interface ExistingOffer {
  id: string;
  offer_letter_url: string | null;
  acceptance_deadline: string;
  status: string;
  accepted_at: string | null;
  declined_at: string | null;
}

export const OfferLetterGenerator: React.FC<OfferLetterGeneratorProps> = ({
  applicationId,
  onSent,
  trigger,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [existingOffer, setExistingOffer] = useState<ExistingOffer | null>(null);
  const [checkingOffer, setCheckingOffer] = useState(true);

  useEffect(() => {
    checkExistingOffer();
  }, [applicationId]);

  const checkExistingOffer = async () => {
    try {
      const { data, error } = await supabase
        .from('admission_offers')
        .select('id, offer_letter_url, acceptance_deadline, status, accepted_at, declined_at')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setExistingOffer(data);
      }
    } catch (error) {
      console.error('Error checking existing offer:', error);
    } finally {
      setCheckingOffer(false);
    }
  };

  const handleSendOffer = async () => {
    if (!deadline) {
      toast({
        title: 'Missing Information',
        description: 'Please select an acceptance deadline',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Send acceptance notification first
      try {
        await supabase.functions.invoke('send-admission-notification', {
          body: {
            application_id: applicationId,
            notification_type: 'accepted',
          },
        });
      } catch (notifError) {
        console.error('Acceptance notification failed:', notifError);
      }

      // Then send the offer letter
      const { error } = await supabase.functions.invoke('send-offer-letter', {
        body: {
          application_id: applicationId,
          acceptance_deadline: deadline.toISOString(),
        },
      });

      if (error) throw error;

      // Update application status
      await supabase
        .from('admission_applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId);

      toast({
        title: 'Offer Letter Sent',
        description: 'The admission offer has been sent to the applicant',
      });

      setOpen(false);
      onSent();
      checkExistingOffer(); // Refresh offer status
    } catch (error: any) {
      console.error('Error sending offer:', error);
      toast({
        title: 'Error',
        description: 'Failed to send offer letter',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Show existing offer status */}
      {!checkingOffer && existingOffer && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                Offer Status: <span className="text-primary capitalize">{existingOffer.status}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Deadline: {format(new Date(existingOffer.acceptance_deadline), 'PPP')}
              </p>
              {existingOffer.accepted_at && (
                <p className="text-sm text-green-600">
                  ✓ Accepted on {format(new Date(existingOffer.accepted_at), 'PPP')}
                </p>
              )}
              {existingOffer.declined_at && (
                <p className="text-sm text-destructive">
                  ✗ Declined on {format(new Date(existingOffer.declined_at), 'PPP')}
                </p>
              )}
              {existingOffer.offer_letter_url && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(existingOffer.offer_letter_url!, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(existingOffer.offer_letter_url!);
                      toast({ title: 'Link copied to clipboard' });
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default">
            <Send className="h-4 w-4 mr-2" />
            Send Offer Letter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Admission Offer</DialogTitle>
          <DialogDescription>
            Send an official admission offer letter to the applicant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Acceptance Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !deadline && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, 'PPP') : 'Select deadline'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">Offer will include:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Congratulations message</li>
              <li>Admission details (class, session)</li>
              <li>Acceptance fee amount (₦50,000)</li>
              <li>Accept/Decline buttons</li>
              <li>Payment instructions</li>
              <li><strong>PDF offer letter attachment</strong></li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendOffer} disabled={loading}>
              {loading ? 'Sending...' : 'Send Offer Letter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
};
