import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { NGN, TERMS, invoiceStatusLabel } from '@/lib/fees';
import RecordCashPaymentDialog from './RecordCashPaymentDialog';

interface Props { studentId: string; name: string; onClose: () => void; }

export const StudentBalanceDrawer: React.FC<Props> = ({ studentId, name, onClose }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<any>(null);
  const [term, setTerm] = useState('First');
  const [pay, setPay] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_student_billing', { _student_id: studentId } as any);
    if (error) toast({ title: 'Could not load bills', description: error.message, variant: 'destructive' });
    setBilling(data || null);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [studentId]);

  const invoices: any[] = billing?.invoices || [];
  const optional: any[] = billing?.optional_fees || [];
  const totals = invoices.reduce((a, i) => ({
    billed: a.billed + Number(i.total || 0),
    paid: a.paid + Number(i.amount_paid || 0),
    due: a.due + Number(i.balance || 0),
  }), { billed: 0, paid: 0, due: 0 });

  const toggleOptional = async (rule: any, selected: boolean) => {
    setBusy(rule.fee_rule_id);
    const { error } = await supabase.rpc('set_optional_selection', {
      _student_id: studentId, _fee_rule_id: rule.fee_rule_id,
      _academic_year: billing?.academic_year, _term: term, _selected: selected,
    } as any);
    setBusy(null);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }
    toast({ title: selected ? `${rule.fee_name} added to the bill` : `${rule.fee_name} removed` });
    load();
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{name}</SheetTitle></SheetHeader>
        {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div> : (
          <div className="space-y-6 mt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{billing?.profile?.student_type === 'new' ? 'New student' : 'Returning student'}</Badge>
              <Badge variant="outline">{billing?.profile?.student_category === 'boarding' ? 'Boarder' : 'Day student'}</Badge>
              <Badge variant="outline">{billing?.academic_year}</Badge>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 border rounded"><div className="text-xs text-muted-foreground">Billed</div><div className="font-semibold">{NGN(totals.billed)}</div></div>
              <div className="p-3 border rounded"><div className="text-xs text-muted-foreground">Paid</div><div className="font-semibold text-green-600">{NGN(totals.paid)}</div></div>
              <div className="p-3 border rounded"><div className="text-xs text-muted-foreground">Outstanding</div><div className="font-semibold text-red-600">{NGN(totals.due)}</div></div>
              <div className="p-3 border rounded"><div className="text-xs text-muted-foreground">Credit</div><div className="font-semibold">{NGN(Number(billing?.credit_balance || 0))}</div></div>
            </div>

            <Button onClick={() => setPay(true)} className="w-full"><Wallet className="h-4 w-4 mr-2" />Record payment</Button>

            {invoices.length === 0 && <p className="text-sm text-muted-foreground">No bills yet for this session.</p>}

            {invoices.map((inv: any) => (
              <div key={inv.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{inv.term} term • {inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">
                      Issued {inv.issue_date ? format(new Date(inv.issue_date), 'PP') : '—'}
                      {inv.due_date ? ` • due ${format(new Date(inv.due_date), 'PP')}` : ''}
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
                        <TableCell>{it.description}{it.requirement_type === 'optional' && <Badge variant="outline" className="ml-2">Optional</Badge>}</TableCell>
                        <TableCell className="text-right">{NGN(Number(it.final_amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total {NGN(Number(inv.total))} • paid {NGN(Number(inv.amount_paid))}</span>
                  <span>Balance {NGN(Number(inv.balance))}</span>
                </div>
              </div>
            ))}

            {optional.length > 0 && (
              <div className="border rounded p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Optional charges</h3>
                  <Select value={term} onValueChange={setTerm}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t} term</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {optional.map((o: any) => (
                  <div key={o.fee_rule_id} className="flex items-center justify-between text-sm">
                    <div>{o.fee_name} <span className="text-muted-foreground">— {NGN(Number(o.amount))}</span></div>
                    <Switch checked={!!o.selected} disabled={busy === o.fee_rule_id} onCheckedChange={v => toggleOptional(o, v)} />
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Payment history</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Receipt</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {invoices.flatMap((i: any) => (i.payments || []).map((p: any) => ({ ...p, term: i.term }))).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.payment_date ? format(new Date(p.payment_date), 'PP') : '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{p.receipt_number || '—'}</TableCell>
                      <TableCell className="capitalize">{(p.payment_method || '').replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">{NGN(Number(p.amount_paid))}</TableCell>
                    </TableRow>
                  ))}
                  {invoices.every((i: any) => !(i.payments || []).length) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No payments yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        <RecordCashPaymentDialog open={pay} onOpenChange={setPay} studentId={studentId} onSaved={load} />
      </SheetContent>
    </Sheet>
  );
};
