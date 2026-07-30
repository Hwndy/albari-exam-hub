import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ArrowLeft, Download, Loader2, Printer, UserPlus } from 'lucide-react';
import { printNode } from '@/lib/print-node';

const NGN = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);

interface Item {
  id: string;
  staff_id: string;
  gross_salary: number | null;
  allowances: number | null;
  deductions: number | null;
  net_pay: number | null;
  status: string | null;
  notes: string | null;
  full_name?: string;
}

export const PayrollHub: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [openPeriod, setOpenPeriod] = useState<any | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('payroll_periods').select('*').order('period_month', { ascending: false });
    setPeriods(data || []);
  };
  useEffect(() => { load(); }, []);

  const loadItems = async (period: any) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase.from('payroll_items').select('*').eq('period_id', period.id);
      if (error) throw error;
      const rows = (data || []) as any[];
      const ids = [...new Set(rows.map(r => r.staff_id).filter(Boolean))];
      let nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
        nameMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      }
      setItems(rows.map(r => ({ ...r, full_name: nameMap.get(r.staff_id) || 'Unknown' }))
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
    } catch (e: any) {
      toast({ title: 'Failed to load payroll lines', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingItems(false);
    }
  };

  const openDetail = async (period: any) => {
    setOpenPeriod(period);
    await loadItems(period);
  };

  const loadStaff = async () => {
    if (!openPeriod) return;
    setLoadingItems(true);
    try {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('role', ['teacher', 'admin']);
      const staffIds = [...new Set((roles || []).map((r: any) => r.user_id))];
      const existing = new Set(items.map(i => i.staff_id));
      const toAdd = staffIds.filter(id => !existing.has(id));
      if (!toAdd.length) { toast({ title: 'All staff already added' }); setLoadingItems(false); return; }
      const { data: details } = await supabase.from('staff_details').select('user_id, salary').in('user_id', toAdd);
      const salaryMap = new Map((details || []).map((d: any) => [d.user_id, Number(d.salary || 0)]));
      const rows = toAdd.map(id => {
        const gross = salaryMap.get(id) || 0;
        return { period_id: openPeriod.id, staff_id: id, gross_salary: gross, allowances: 0, deductions: 0, net_pay: gross, status: 'pending' };
      });
      const { error } = await supabase.from('payroll_items').insert(rows);
      if (error) throw error;
      toast({ title: `${rows.length} staff added` });
      await loadItems(openPeriod);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
      setLoadingItems(false);
    }
  };

  const editItem = (id: string, field: 'gross_salary' | 'allowances' | 'deductions' | 'notes', value: string) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const next: Item = { ...i, [field]: field === 'notes' ? value : Number(value || 0) } as Item;
      next.net_pay = Number(next.gross_salary || 0) + Number(next.allowances || 0) - Number(next.deductions || 0);
      return next;
    }));
  };

  const saveItem = async (item: Item) => {
    setSavingId(item.id);
    const { error } = await supabase.from('payroll_items').update({
      gross_salary: Number(item.gross_salary || 0),
      allowances: Number(item.allowances || 0),
      deductions: Number(item.deductions || 0),
      net_pay: Number(item.net_pay || 0),
      notes: item.notes || null,
    }).eq('id', item.id);
    setSavingId(null);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Saved' });
  };

  const removeItem = async (item: Item) => {
    if (!confirm(`Remove ${item.full_name} from this period?`)) return;
    await supabase.from('payroll_items').delete().eq('id', item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const totals = useMemo(() => items.reduce((a, i) => ({
    gross: a.gross + Number(i.gross_salary || 0),
    allow: a.allow + Number(i.allowances || 0),
    deduct: a.deduct + Number(i.deductions || 0),
    net: a.net + Number(i.net_pay || 0),
  }), { gross: 0, allow: 0, deduct: 0, net: 0 }), [items]);

  const exportCsv = () => {
    const header = 'Staff,Gross,Allowances,Deductions,Net,Status\n';
    const body = items.map(i => [i.full_name, i.gross_salary || 0, i.allowances || 0, i.deductions || 0, i.net_pay || 0, i.status || ''].join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll-${openPeriod?.period_month}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const createPeriod = async () => {
    const { error } = await supabase.from('payroll_periods').insert({
      period_month: `${month}-01`, status: 'draft', created_by: user?.id,
    });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Period created' }); load(); }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('payroll_periods').update({ status }).eq('id', id);
    if (status === 'paid') {
      await supabase.from('payroll_items').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('period_id', id);
      if (openPeriod?.id === id) await loadItems(openPeriod);
    }
    if (openPeriod?.id === id) setOpenPeriod({ ...openPeriod, status });
    load();
  };

  if (openPeriod) {
    const readOnly = openPeriod.status === 'paid' || openPeriod.status === 'closed';
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setOpenPeriod(null); setItems([]); }}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h2 className="text-2xl font-bold">{format(new Date(openPeriod.period_month), 'MMMM yyyy')} Payroll</h2>
              <p className="text-muted-foreground capitalize">Status: {openPeriod.status}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly && <Button variant="outline" onClick={loadStaff}><UserPlus className="h-4 w-4 mr-1" />Load staff</Button>}
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Staff</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{items.length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Gross</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{NGN(totals.gross + totals.allow)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Deductions</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{NGN(totals.deduct)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net payable</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{NGN(totals.net)}</CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Payroll Lines</CardTitle></CardHeader>
          <CardContent>
            {loadingItems ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No staff on this period yet. Use "Load staff" to add them.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead><TableHead>Gross</TableHead><TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead><TableHead>Net</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.full_name}</TableCell>
                        <TableCell><Input className="w-28" type="number" disabled={readOnly} value={i.gross_salary ?? 0} onChange={e => editItem(i.id, 'gross_salary', e.target.value)} /></TableCell>
                        <TableCell><Input className="w-28" type="number" disabled={readOnly} value={i.allowances ?? 0} onChange={e => editItem(i.id, 'allowances', e.target.value)} /></TableCell>
                        <TableCell><Input className="w-28" type="number" disabled={readOnly} value={i.deductions ?? 0} onChange={e => editItem(i.id, 'deductions', e.target.value)} /></TableCell>
                        <TableCell className="font-semibold">{NGN(Number(i.net_pay || 0))}</TableCell>
                        <TableCell className="space-x-1 whitespace-nowrap">
                          {!readOnly && <Button size="sm" onClick={() => saveItem(i)} disabled={savingId === i.id}>{savingId === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>}
                          <Button size="sm" variant="outline" onClick={() => printNode(document.getElementById(`payslip-${i.id}`), { title: `Payslip ${i.full_name}` })}><Printer className="h-4 w-4" /></Button>
                          {!readOnly && <Button size="sm" variant="ghost" onClick={() => removeItem(i)}>Remove</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hidden payslips for printing */}
        <div className="hidden">
          {items.map(i => (
            <div id={`payslip-${i.id}`} key={i.id} style={{ padding: 24, fontFamily: 'Helvetica, Arial, sans-serif' }}>
              <h2 style={{ textAlign: 'center', margin: 0 }}>Al-Bari Group of Schools</h2>
              <p style={{ textAlign: 'center', marginTop: 4 }}>Payslip — {format(new Date(openPeriod.period_month), 'MMMM yyyy')}</p>
              <hr />
              <p><strong>Staff:</strong> {i.full_name}</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                <tbody>
                  <tr><td style={{ padding: 6, border: '1px solid #ddd' }}>Gross salary</td><td style={{ padding: 6, border: '1px solid #ddd', textAlign: 'right' }}>{NGN(Number(i.gross_salary || 0))}</td></tr>
                  <tr><td style={{ padding: 6, border: '1px solid #ddd' }}>Allowances</td><td style={{ padding: 6, border: '1px solid #ddd', textAlign: 'right' }}>{NGN(Number(i.allowances || 0))}</td></tr>
                  <tr><td style={{ padding: 6, border: '1px solid #ddd' }}>Deductions</td><td style={{ padding: 6, border: '1px solid #ddd', textAlign: 'right' }}>-{NGN(Number(i.deductions || 0))}</td></tr>
                  <tr><td style={{ padding: 6, border: '1px solid #ddd' }}><strong>Net pay</strong></td><td style={{ padding: 6, border: '1px solid #ddd', textAlign: 'right' }}><strong>{NGN(Number(i.net_pay || 0))}</strong></td></tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payroll</h2>
        <p className="text-muted-foreground">Create a monthly period, add staff salary lines, then move it from draft to paid.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New Period</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>Month</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
            <Button onClick={createPeriod}>Create</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Periods</CardTitle></CardHeader>
        <CardContent>
          {periods.length === 0 ? <p className="text-muted-foreground text-center py-6">No periods yet.</p> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Month</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.period_month), 'MMMM yyyy')}</TableCell>
                    <TableCell><Badge variant={p.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{p.status}</Badge></TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => openDetail(p)}>Open</Button>
                      {p.status === 'draft' && <Button size="sm" onClick={() => updateStatus(p.id, 'processing')}>Start Processing</Button>}
                      {p.status === 'processing' && <Button size="sm" onClick={() => updateStatus(p.id, 'paid')}>Mark Paid</Button>}
                      {p.status === 'paid' && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'closed')}>Close</Button>}
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

export default PayrollHub;