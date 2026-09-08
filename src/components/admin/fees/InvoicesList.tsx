import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Eye, Percent, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { NGN, TERMS, fetchAcademicYears, fetchCurrentAcademicYear, fetchStudentDirectory, invoiceStatusLabel } from '@/lib/fees';
import RecordCashPaymentDialog from './RecordCashPaymentDialog';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface Invoice {
  id: string; invoice_number: string; student_id: string; academic_year: string; term: string;
  student_type: string; student_category: string; subtotal: number; discount: number; total: number;
  amount_paid: number; balance: number; status: string; issue_date: string; due_date: string | null;
}

export const InvoicesList: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [names, setNames] = useState<Map<string, { name: string; admission: string | null }>>(new Map());
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Invoice | null>(null);

  const load = async (y?: string) => {
    setLoading(true);
    const activeYear = y || year || (await fetchCurrentAcademicYear());
    if (!year) setYear(activeYear);
    const [{ data }, ys, dir] = await Promise.all([
      supabase.from('student_invoices').select('*').eq('academic_year', activeYear).order('created_at', { ascending: false }),
      fetchAcademicYears(),
      names.size ? Promise.resolve(null) : fetchStudentDirectory(),
    ]);
    if (dir) setNames(new Map(dir.map(s => [s.id, { name: s.name, admission: s.admission_number }])));
    setRows((data || []) as any);
    setYears(ys.length ? ys : [activeYear]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useRealtimeRefresh('admin-invoices', ['student_invoices', 'fee_payments'], () => { void load(); });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(r =>
      (term === 'ALL' || r.term === term) &&
      (status === 'ALL' || r.status === status) &&
      (!t || r.invoice_number.toLowerCase().includes(t) ||
        (names.get(r.student_id)?.name || '').toLowerCase().includes(t) ||
        (names.get(r.student_id)?.admission || '').toLowerCase().includes(t))
    );
  }, [rows, term, status, q, names]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    billed: a.billed + Number(r.total || 0),
    paid: a.paid + Number(r.amount_paid || 0),
    due: a.due + Number(r.balance || 0),
  }), { billed: 0, paid: 0, due: 0 }), [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Bills</CardTitle>
        <CardDescription>
          {filtered.length} bill(s) • billed {NGN(totals.billed)} • paid {NGN(totals.paid)} • outstanding {NGN(totals.due)}
        </CardDescription>
        <div className="grid gap-2 sm:grid-cols-4 pt-3">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Student or bill no." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={year} onValueChange={v => { setYear(v); load(v); }}>
            <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All terms</SelectItem>
              {TERMS.map(t => <SelectItem key={t} value={t}>{t} term</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any status</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Part paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin h-6 w-6" /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Bill</TableHead><TableHead>Student</TableHead><TableHead>Term</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{names.get(r.student_id)?.name || 'Student'}</div>
                      <div className="text-xs text-muted-foreground">{names.get(r.student_id)?.admission || '—'}</div>
                    </TableCell>
                    <TableCell>{r.term}</TableCell>
                    <TableCell className="text-right">{NGN(Number(r.total))}</TableCell>
                    <TableCell className="text-right text-green-600">{NGN(Number(r.amount_paid))}</TableCell>
                    <TableCell className="text-right font-semibold">{NGN(Number(r.balance))}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'paid' ? 'secondary' : r.status === 'partial' ? 'outline' : 'destructive'}>
                        {invoiceStatusLabel(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setOpen(r)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No bills yet — create them under “Create Bills”.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {open && (
        <InvoiceDetail
          invoice={open}
          studentName={names.get(open.student_id)?.name || 'Student'}
          onClose={() => { setOpen(null); load(); }}
        />
      )}
    </Card>
  );
};

const InvoiceDetail: React.FC<{ invoice: Invoice; studentName: string; onClose: () => void }> = ({ invoice, studentName, onClose }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjust, setAdjust] = useState<any | null>(null);
  const [adjType, setAdjType] = useState('discount');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjPercent, setAdjPercent] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [pay, setPay] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: it }, { data: pm }] = await Promise.all([
      supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id).eq('status', 'active').order('created_at'),
      supabase.from('fee_payments').select('*').eq('invoice_id', invoice.id).order('payment_date', { ascending: false }),
    ]);
    setItems(it || []); setPayments(pm || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [invoice.id]);

  const applyAdjustment = async () => {
    if (!adjust) return;
    if (!adjAmount && !adjPercent) { toast({ title: 'Enter an amount or a percentage', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.rpc('apply_invoice_adjustment', {
      _invoice_item_id: adjust.id,
      _type: adjType,
      _amount: adjAmount ? Number(adjAmount) : null,
      _percentage: adjPercent ? Number(adjPercent) : null,
      _reason: adjReason || null,
    } as any);
    setSaving(false);
    if (error) { toast({ title: 'Could not apply', description: error.message, variant: 'destructive' }); return; }
    toast({ title: adjType === 'waiver' ? 'Charge waived' : 'Discount applied' });
    setAdjust(null); setAdjAmount(''); setAdjPercent(''); setAdjReason('');
    load();
  };

  return (
    <>
      <Dialog open onOpenChange={o => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{invoice.invoice_number}</DialogTitle>
            <DialogDescription>
              {studentName} • {invoice.term} term {invoice.academic_year} •{' '}
              {invoice.student_type === 'new' ? 'New student' : 'Returning student'} •{' '}
              {invoice.student_category === 'boarding' ? 'Boarder' : 'Day student'}
            </DialogDescription>
          </DialogHeader>
          {loading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin h-6 w-6" /></div> : (
            <div className="space-y-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Charge</TableHead><TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Reduction</TableHead><TableHead className="text-right">Payable</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map(i => (
                    <TableRow key={i.id}>
                      <TableCell>
                        {i.description}
                        {i.requirement_type === 'optional' && <Badge variant="outline" className="ml-2">Optional</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{NGN(Number(i.original_amount))}</TableCell>
                      <TableCell className="text-right">{Number(i.discount) ? `- ${NGN(Number(i.discount))}` : '—'}</TableCell>
                      <TableCell className="text-right font-medium">{NGN(Number(i.final_amount))}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setAdjust(i)}><Percent className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="grid gap-1 text-sm sm:w-64 sm:ml-auto">
                <div className="flex justify-between"><span>Subtotal</span><span>{NGN(Number(invoice.subtotal))}</span></div>
                <div className="flex justify-between"><span>Reductions</span><span>- {NGN(Number(invoice.discount))}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>{NGN(Number(invoice.total))}</span></div>
                <div className="flex justify-between text-green-600"><span>Paid</span><span>{NGN(Number(invoice.amount_paid))}</span></div>
                <div className="flex justify-between font-semibold"><span>Balance</span><span>{NGN(Number(invoice.balance))}</span></div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Payments</h4>
                {payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments on this bill yet.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Receipt</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{p.payment_date ? format(new Date(p.payment_date), 'PP') : '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{p.receipt_number || '—'}</TableCell>
                          <TableCell>{(p.payment_method || '').replace('_', ' ')}</TableCell>
                          <TableCell className="text-right">{NGN(Number(p.amount_paid))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={() => setPay(true)}><Wallet className="h-4 w-4 mr-1" /> Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjust} onOpenChange={o => !o && setAdjust(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reduce “{adjust?.description}”</DialogTitle>
            <DialogDescription>Give a discount or waive the charge completely. The bill total updates immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Kind</Label>
              <Select value={adjType} onValueChange={setAdjType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="waiver">Full waiver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {adjType !== 'waiver' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount (₦)</Label><Input type="number" value={adjAmount} onChange={e => { setAdjAmount(e.target.value); setAdjPercent(''); }} /></div>
                <div><Label>or percent (%)</Label><Input type="number" value={adjPercent} onChange={e => { setAdjPercent(e.target.value); setAdjAmount(''); }} /></div>
              </div>
            )}
            <div><Label>Reason</Label><Input value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="Staff child, sibling discount…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjust(null)}>Cancel</Button>
            <Button onClick={applyAdjustment} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordCashPaymentDialog open={pay} onOpenChange={setPay} studentId={invoice.student_id} onSaved={load} />
    </>
  );
};
