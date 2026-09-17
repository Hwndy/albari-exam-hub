import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Banknote, Copy, CheckCircle } from 'lucide-react';

interface Props {
  applicationId?: string;
  applicantName?: string;
  onRecorded?: () => void;
  trigger?: React.ReactNode;
}

interface EnrolResult {
  already_enrolled?: boolean;
  enrollment_pending?: boolean;
  admission_number?: string | null;
  login_email?: string | null;
  temporary_password?: string | null;
  error?: string;
}

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'cheque', label: 'Cheque' },
];

export const RecordAcceptancePaymentDialog: React.FC<Props> = ({
  applicationId,
  applicantName,
  onRecorded,
  trigger,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<EnrolResult | null>(null);
  const [applications, setApplications] = useState<Array<{ id: string; application_number: string; first_name: string; last_name: string }>>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState(applicationId ?? '');

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setSelectedApplicationId(applicationId ?? '');
    (async () => {
      if (!applicationId) {
        const { data } = await supabase
          .from('admission_applications')
          .select('id, application_number, first_name, last_name')
          .eq('status', 'accepted')
          .is('student_id', null)
          .order('created_at', { ascending: false });
        setApplications((data as any) ?? []);
      }
    })();
  }, [open, applicationId]);

  useEffect(() => {
    if (!open || !selectedApplicationId) return;
    (async () => {
      const { data: offer } = await supabase
        .from('admission_offers')
        .select('acceptance_fee')
        .eq('application_id', selectedApplicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      let fee = Number((offer as any)?.acceptance_fee ?? 0);
      if (!fee) {
        const { data: setting } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'acceptance_fee_amount')
          .maybeSingle();
        fee = Number((setting as any)?.setting_value ?? 0);
      }
      if (fee) setAmount(String(fee));
    })();
  }, [open, selectedApplicationId]);

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: 'Copied' });
  };

  const submit = async () => {
    if (!selectedApplicationId) {
      toast({ title: 'Choose an accepted applicant', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('record-offline-acceptance-payment', {
      body: {
        application_id: selectedApplicationId,
        amount: Number(amount),
        method,
        paid_at: paidAt,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      },
    });
    setSaving(false);

    const payload = (data ?? {}) as EnrolResult & { success?: boolean };
    if (error || (!payload.success && payload.error)) {
      toast({
        title: 'Could not record the payment',
        description: payload.error || error?.message || 'Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setResult(payload);
    onRecorded?.();
    if (payload.enrollment_pending) {
      toast({
        title: 'Payment recorded',
        description: 'The student record could not be created yet. Try "Complete enrolment".',
        variant: 'destructive',
      });
    } else {
      toast({
        title: payload.already_enrolled ? 'Already enrolled' : 'Student enrolled',
        description: payload.admission_number
          ? `Admission number ${payload.admission_number}.`
          : 'Payment recorded.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary">
            <Banknote className="h-4 w-4 mr-2" />
            Record acceptance payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record acceptance fee</DialogTitle>
          <DialogDescription>
            For fees paid in cash or into the school account
            {applicantName ? ` by ${applicantName}` : ''}. Recording it issues the admission
            number, student login and credits the amount to school fees.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />
              {result.already_enrolled ? 'This applicant was already enrolled' : 'Enrolment complete'}
            </div>
            {result.admission_number && (
              <div className="flex items-center justify-between rounded-md border p-2">
                <span>
                  Admission number: <strong>{result.admission_number}</strong>
                </span>
                <Button size="sm" variant="ghost" onClick={() => result.admission_number && copy(result.admission_number)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {result.login_email && (
              <div className="flex items-center justify-between rounded-md border p-2">
                <span>
                  Student login: <strong>{result.login_email}</strong>
                </span>
                <Button size="sm" variant="ghost" onClick={() => result.login_email && copy(result.login_email)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {result.temporary_password && (
              <div className="flex items-center justify-between rounded-md border p-2">
                <span>
                  Temporary password: <strong>{result.temporary_password}</strong>
                </span>
                <Button size="sm" variant="ghost" onClick={() => result.temporary_password && copy(result.temporary_password)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {result.enrollment_pending ? (
              <p className="text-destructive">
                The payment is saved but the student record was not created: {result.error}
              </p>
            ) : (
              <p className="text-muted-foreground">
                The welcome email with these details has been sent to the family.
              </p>
            )}
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {!applicationId && (
              <div className="space-y-2">
                <Label>Accepted applicant</Label>
                <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                  <SelectTrigger><SelectValue placeholder="Choose an applicant" /></SelectTrigger>
                  <SelectContent>
                    {applications.map(app => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.application_number} — {app.first_name} {app.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="acc-amount">Amount received (₦)</Label>
              <Input
                id="acc-amount"
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-date">Date received</Label>
              <Input
                id="acc-date"
                type="date"
                value={paidAt}
                onChange={e => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-ref">Bank reference / teller number (optional)</Label>
              <Input
                id="acc-ref"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. 09823451"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-note">Note (optional)</Label>
              <Textarea
                id="acc-note"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Paid at the bursary"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving || !Number(amount)}>
                {saving ? 'Recording…' : 'Record & enrol'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
