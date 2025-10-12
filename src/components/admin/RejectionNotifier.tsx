import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { XCircle } from 'lucide-react';

interface RejectionNotifierProps {
  applicationId: string;
  onRejected: () => void;
  trigger?: React.ReactNode;
}

export const RejectionNotifier: React.FC<RejectionNotifierProps> = ({
  applicationId,
  onRejected,
  trigger,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('admission_applications')
        .update({ 
          status: 'rejected',
          review_notes: reason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Send rejection notification
      const { error: emailError } = await supabase.functions.invoke('send-admission-notification', {
        body: {
          application_id: applicationId,
          notification_type: 'rejected',
        },
      });

      if (emailError) {
        console.error('Email notification failed:', emailError);
      }

      toast({
        title: 'Application Rejected',
        description: 'Rejection notification has been sent to the applicant',
      });

      setOpen(false);
      setReason('');
      onRejected();
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject application',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Application</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this application. The applicant will be notified via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the application is being rejected..."
              rows={5}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              {loading ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
