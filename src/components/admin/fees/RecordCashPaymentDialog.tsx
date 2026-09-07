import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildBrandedReceipt } from '@/lib/receipt-pdf';
import { Loader2, Search, Check } from 'lucide-react';
import { format } from 'date-fns';

const NGN = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);

interface StudentOption { id: string; name: string; admission_number: string | null; class_id: string | null; class_name: string | null; }
interface Item {
  key: string;
  kind: 'structure' | 'installment';
  id: string;
  label: string;
  amount: number;
  paid: number;
}

interface Props { open: boolean; onOpenChange: (v: boolean) => void; onSaved?: () => void; studentId?: string; }

export const RecordCashPaymentDialog: React.FC<Props> = ({ open, onOpenChange, onSaved, studentId }) => {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemKey, setItemKey] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setQ(''); setStudents([]); setStudent(null); setItems([]); setItemKey('');
    setAmount(''); setMethod('cash'); setDate(new Date().toISOString().slice(0, 10)); setNotes('');
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  // Preselected student (e.g. opened from a student row)
  useEffect(() => {
    if (!open || !studentId) return;
    (async () => {
      const s = await loadStudent(studentId);
      if (s) setStudent(s);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

  const loadStudent = async (id: string): Promise<StudentOption | null> => {
    const { data } = await supabase.from('students').select('id, user_id, admission_number').eq('id', id).maybeSingle();
    if (!data) return null;
    const [{ data: prof }, { data: ca }] = await Promise.all([
      data.user_id ? supabase.from('profiles').select('full_name').eq('user_id', data.user_id).maybeSingle() : Promise.resolve({ data: null } as any),
      supabase.from('class_assignments').select('class_id, classes(name)').eq('student_id', id).maybeSingle(),
    ]);
    return {
      id: data.id,
      name: (prof as any)?.full_name || 'Unknown',
      admission_number: data.admission_number,
      class_id: (ca as any)?.class_id || null,
      class_name: (ca as any)?.classes?.name || null,
    };
  };

  // Student search
  useEffect(() => {
    if (!open || student) return;
    const term = q.trim();
    const handle = setTimeout(async () => {
      setSearching(true);
      const { data: rows } = await supabase.from('students').select('id, user_id, admission_number').limit(400);
      const list = (rows || []) as any[];
      const userIds = [...new Set(list.map(r => r.user_id).filter(Boolean))];
      let nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
        nameMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      }
      const opts: StudentOption[] = list.map(r => ({
        id: r.id, name: nameMap.get(r.user_id) || 'Unknown', admission_number: r.admission_number, class_id: null, class_name: null,
      }));
      const t = term.toLowerCase();
      setStudents(
        (t ? opts.filter(o => o.name.toLowerCase().includes(t) || (o.admission_number || '').toLowerCase().includes(t)) : opts).slice(0, 25)
      );
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [q, open, student]);

  // Load payable items for the selected student
  useEffect(() => {
    if (!student) { setItems([]); return; }
    (async () => {
      setLoadingItems(true);
      const full = student.class_id === null ? await loadStudent(student.id) : student;
      const classId = full?.class_id;
      const [{ data: fs }, { data: pays }, { data: plans }] = await Promise.all([
        supabase.from('fee_structures').select('*').or(`class_id.eq.${classId || '00000000-0000-0000-0000-000000000000'},class_id.is.null`),
        supabase.from('fee_payments').select('fee_structure_id, amount_paid, status').eq('student_id', student.id),
        supabase.from('fee_installment_plans').select('id, total_amount, fee_installments(id, installment_number, amount, paid_amount, due_date, status)').eq('student_id', student.id),
      ]);
      const paidFor = (id: string) => (pays || [])
        .filter((p: any) => p.status === 'completed' && p.fee_structure_id === id)
        .reduce((a: number, b: any) => a + Number(b.amount_paid || 0), 0);

      const structureItems: Item[] = (fs || []).map((s: any) => ({
        key: `structure:${s.id}`, kind: 'structure', id: s.id,
        label: `${s.fee_type}${s.term ? ` • ${s.term}` : ''} (${s.academic_year || ''})`.trim(),
        amount: Number(s.amount), paid: paidFor(s.id),
      }));

      const installmentItems: Item[] = [];
      (plans || []).forEach((pl: any) => {
        (pl.fee_installments || [])
          .sort((a: any, b: any) => a.installment_number - b.installment_number)
          .forEach((inst: any) => {
            installmentItems.push({
              key: `installment:${inst.id}`, kind: 'installment', id: inst.id,
              label: `Installment ${inst.installment_number} • due ${inst.due_date ? format(new Date(inst.due_date), 'dd MMM yyyy') : '—'}`,
              amount: Number(inst.amount), paid: Number(inst.paid_amount || 0),
            });
          });
      });

      setItems([...structureItems, ...installmentItems]);
      setLoadingItems(false);
      if (full && full !== student) setStudent(full);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  const selected = useMemo(() => items.find(i => i.key === itemKey) || null, [items, itemKey]);
  const outstanding = selected ? Math.max(0, selected.amount - selected.paid) : 0;

  const printReceipt = async (receiptNumber: string, paidAmount: number) => {
    try {
      const doc = await buildBrandedReceipt({
        title: 'FEE PAYMENT RECEIPT',
        receiptNumber,
        date: format(new Date(date), 'dd MMM yyyy'),
        fields: [
          { label: 'Student', value: student?.name },
          { label: 'Admission No.', value: student?.admission_number },
          { label: 'Class', value: student?.class_name },
          { label: 'Payment for', value: selected?.label },
          { label: 'Method', value: method.replace('_', ' ') },
          { label: 'Reference / Notes', value: notes || '—' },
        ],
        amountLabel: 'Amount Paid',
        amount: paidAmount,
        footerNote: 'Payment received at the school bursary.',
      });
      doc.save(`${receiptNumber}.pdf`);
    } catch (e: any) {
      toast({ title: 'Receipt could not be generated', description: e?.message, variant: 'destructive' });
    }
  };

  const save = async () => {
    if (!student || !selected) { toast({ title: 'Select a student and what the payment is for', variant: 'destructive' }); return; }
    const value = Number(amount);
    if (!value || value <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    if (value > outstanding + 0.001) {
      toast({ title: 'Amount is more than the outstanding balance', description: `Outstanding: ${NGN(outstanding)}`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const receipt = `REC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const paidAt = new Date(`${date}T${new Date().toISOString().slice(11, 19)}Z`).toISOString();

    const { data: inserted, error } = await supabase.from('fee_payments').insert({
      student_id: student.id,
      fee_structure_id: selected.kind === 'structure' ? selected.id : null,
      fee_installment_id: selected.kind === 'installment' ? selected.id : null,
      amount_paid: value,
      payment_method: method,
      status: 'completed',
      payment_date: date,
      paid_at: paidAt,
      receipt_number: receipt,
      notes: notes || null,
    }).select('id').maybeSingle();

    if (error) {
      setSaving(false);
      toast({ title: 'Could not record payment', description: error.message, variant: 'destructive' });
      return;
    }

    if (selected.kind === 'installment') {
      const newPaid = selected.paid + value;
      const cleared = newPaid >= selected.amount - 0.001;
      const { error: instError } = await supabase.from('fee_installments').update({
        paid_amount: newPaid,
        status: cleared ? 'paid' : 'partial',
        paid_at: cleared ? paidAt : null,
        payment_id: inserted?.id || null,
      }).eq('id', selected.id);
      if (instError) toast({ title: 'Payment saved, but the installment was not updated', description: instError.message, variant: 'destructive' });
    }

    setSaving(false);
    toast({ title: 'Payment recorded', description: `Receipt ${receipt}` });
    await printReceipt(receipt, value);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record cash payment</DialogTitle>
          <DialogDescription>Enter a payment received in cash, by transfer, cheque or POS. A branded receipt is generated for printing.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!student ? (
            <div className="space-y-2">
              <Label>Student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by name or admission number" value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <div className="border rounded max-h-56 overflow-y-auto divide-y">
                {searching && <div className="p-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Searching…</div>}
                {!searching && students.length === 0 && <div className="p-3 text-sm text-muted-foreground">No students found</div>}
                {students.map(s => (
                  <button key={s.id} type="button" onClick={() => setStudent(s)} className="w-full text-left p-2 hover:bg-muted">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.admission_number || 'No admission number'}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{student.name}</div>
                <div className="text-xs text-muted-foreground">{student.admission_number || '—'}{student.class_name ? ` • ${student.class_name}` : ''}</div>
              </div>
              {!studentId && <Button variant="ghost" size="sm" onClick={() => { setStudent(null); setItems([]); setItemKey(''); }}>Change</Button>}
            </div>
          )}

          {student && (
            <>
              <div className="space-y-2">
                <Label>What is this payment for?</Label>
                <Select value={itemKey} onValueChange={setItemKey} disabled={loadingItems}>
                  <SelectTrigger><SelectValue placeholder={loadingItems ? 'Loading fees…' : 'Select a fee or installment'} /></SelectTrigger>
                  <SelectContent>
                    {items.map(i => (
                      <SelectItem key={i.key} value={i.key}>
                        {i.label} — {NGN(Math.max(0, i.amount - i.paid))} due
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">Billed {NGN(selected.amount)}</Badge>
                    <Badge variant="outline">Paid {NGN(selected.paid)}</Badge>
                    <Badge>{outstanding > 0 ? `Outstanding ${NGN(outstanding)}` : 'Fully paid'}</Badge>
                  </div>
                )}
                {!loadingItems && items.length === 0 && <p className="text-sm text-muted-foreground">No fees configured for this student's class yet.</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Amount</Label>
                  <Input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                  {selected && outstanding > 0 && (
                    <button type="button" className="text-xs text-primary mt-1" onClick={() => setAmount(String(outstanding))}>Pay full outstanding</button>
                  )}
                </div>
                <div>
                  <Label>Payment method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Notes / reference</Label>
                  <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Teller number, bank, cheque number…" />
                </div>
              </div>

              <Button className="w-full" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Save & print receipt
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordCashPaymentDialog;
