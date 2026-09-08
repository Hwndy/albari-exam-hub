import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useChildren } from '@/contexts/ChildContext';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Receipt, Loader2, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadReceiptView } from '@/lib/receipt-print';
import { NGN, invoiceStatusLabel } from '@/lib/fees';

export const ParentFees: React.FC = () => {
  const { selectedChild } = useChildren();
  const { toast } = useToast();
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (selectedChild) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChild?.student_id]);

  const load = async () => {
    if (!selectedChild) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_student_billing', { _student_id: selectedChild.student_id } as any);
    if (error) toast({ title: 'Could not load fees', description: error.message, variant: 'destructive' });
    setBilling(data || null);
    setLoading(false);
  };

  const pay = async (invoice: any) => {
    if (!selectedChild) return;
    setPaying(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-fee-payment', {
        body: {
          student_id: selectedChild.student_id,
          invoice_id: invoice.id,
          amount: Number(invoice.balance),
          label: `${invoice.term} term fees`,
          callback_url: `${window.location.origin}/fees/payment-callback`,
        },
      });
      if (error) throw error;
      if (data?.authorization_url) window.location.href = data.authorization_url;
      else throw new Error('No authorization URL returned');
    } catch (e: any) {
      toast({ title: 'Payment error', description: e.message || 'Could not start payment', variant: 'destructive' });
      setPaying(null);
    }
  };

  const toggleOptional = async (rule: any, term: string, selected: boolean) => {
    if (!selectedChild) return;
    setBusy(rule.fee_rule_id);
    const { error } = await supabase.rpc('set_optional_selection', {
      _student_id: selectedChild.student_id, _fee_rule_id: rule.fee_rule_id,
      _academic_year: billing?.academic_year, _term: term, _selected: selected,
    } as any);
    setBusy(null);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }
    toast({ title: selected ? `${rule.fee_name} added` : `${rule.fee_name} removed` });
    load();
  };

  const downloadReceipt = async (p: any, invoice: any) => {
    await downloadReceiptView({
      title: 'FEE PAYMENT RECEIPT',
      receiptNumber: p.receipt_number,
      date: p.paid_at || p.payment_date ? format(new Date(p.paid_at || p.payment_date), 'PP') : null,
      fields: [
        { label: 'Student', value: selectedChild?.full_name },
        { label: 'Admission No.', value: selectedChild?.admission_number },
        { label: 'Class', value: selectedChild?.class_name },
        { label: 'Bill', value: `${invoice.term} term ${invoice.academic_year} (${invoice.invoice_number})` },
        { label: 'Payment Reference', value: p.payment_reference },
        { label: 'Status', value: p.status },
      ],
      amount: Number(p.amount_paid),
    }, `receipt-${p.receipt_number || p.id}.pdf`);
  };

  if (!selectedChild) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">Select a child to view fees.</CardContent></Card>;
  }
  if (!selectedChild.can_view_fees) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">You don't have fee access for this child.</CardContent></Card>;
  }
  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;
  }

  const invoices: any[] = billing?.invoices || [];
  const optional: any[] = billing?.optional_fees || [];
  const credit = Number(billing?.credit_balance || 0);
  const totals = invoices.reduce((a, i) => ({
    billed: a.billed + Number(i.total || 0),
    paid: a.paid + Number(i.amount_paid || 0),
    due: a.due + Number(i.balance || 0),
  }), { billed: 0, paid: 0, due: 0 });
  const nextDue = invoices.filter(i => i.due_date && Number(i.balance) > 0)
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))[0];
  const payments = invoices.flatMap((i: any) => (i.payments || []).map((p: any) => ({ ...p, invoice: i })));
  const currentTerm = invoices[invoices.length - 1]?.term || 'First';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Billed</CardDescription><CardTitle>{NGN(totals.billed)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total Paid</CardDescription><CardTitle className="text-green-600">{NGN(totals.paid)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Outstanding</CardDescription><CardTitle className={totals.due ? 'text-red-600' : 'text-green-600'}>{NGN(totals.due)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>{credit > 0 ? 'Credit on account' : 'Next Due'}</CardDescription><CardTitle className="text-base">{credit > 0 ? NGN(credit) : (nextDue?.due_date ? format(new Date(nextDue.due_date), 'PP') : '—')}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bills for {selectedChild.full_name}</CardTitle>
          <CardDescription>
            Class: {selectedChild.class_name || 'Not assigned'} • {billing?.profile?.student_type === 'new' ? 'New student' : 'Returning student'} • {billing?.profile?.student_category === 'boarding' ? 'Boarder' : 'Day student'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              No bill has been issued for this term yet.
            </div>
          ) : invoices.map((inv: any) => (
            <div key={inv.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{inv.term} term {inv.academic_year}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.invoice_number}{inv.due_date ? ` • due ${format(new Date(inv.due_date), 'PP')}` : ''}
                  </div>
                </div>
                <Badge variant={inv.status === 'paid' ? 'secondary' : inv.status === 'partial' ? 'outline' : 'destructive'}>
                  {invoiceStatusLabel(inv.status)}
                </Badge>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Charge</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(inv.items || []).map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        {it.description}
                        {it.requirement_type === 'optional' && <Badge variant="outline" className="ml-2">Optional</Badge>}
                        {Number(it.discount) > 0 && <span className="text-xs text-green-600 ml-2">less {NGN(Number(it.discount))}</span>}
                      </TableCell>
                      <TableCell className="text-right">{NGN(Number(it.final_amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  Total {NGN(Number(inv.total))} • paid <span className="text-green-600">{NGN(Number(inv.amount_paid))}</span> • balance <strong>{NGN(Number(inv.balance))}</strong>
                </div>
                {Number(inv.balance) > 0 ? (
                  <Button size="sm" disabled={paying === inv.id} onClick={() => pay(inv)}>
                    {paying === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CreditCard className="h-4 w-4 mr-1" /> Pay {NGN(Number(inv.balance))}</>}
                  </Button>
                ) : <Badge variant="secondary">Fully paid</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {optional.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optional charges</CardTitle>
            <CardDescription>Turn on anything you want added to the {currentTerm} term bill.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {optional.map((o: any) => (
              <div key={o.fee_rule_id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div>{o.fee_name} <span className="text-muted-foreground">— {NGN(Number(o.amount))}</span></div>
                <Switch checked={!!o.selected} disabled={busy === o.fee_rule_id} onCheckedChange={v => toggleOptional(o, currentTerm, v)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Payment History</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No payments yet</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Receipt</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.paid_at || p.payment_date), 'PP')}</TableCell>
                    <TableCell className="font-mono text-xs">{p.payment_reference || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{p.receipt_number || '—'}</TableCell>
                    <TableCell className="text-right">{NGN(Number(p.amount_paid))}</TableCell>
                    <TableCell><Badge variant={p.status === 'completed' ? 'secondary' : 'outline'}>{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {p.status === 'completed' && (
                        <Button size="sm" variant="ghost" onClick={() => downloadReceipt(p, p.invoice)}><Download className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
