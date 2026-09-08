import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Eye } from 'lucide-react';
import { StudentBalanceDrawer } from './StudentBalanceDrawer';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { fetchStudentClassMap } from '@/lib/class-roster';
import { NGN, TERMS, fetchAcademicYears, fetchCurrentAcademicYear } from '@/lib/fees';

interface Row {
  id: string; name: string; admission: string; class_id: string | null; class_name: string;
  billed: number; paid: number; outstanding: number; bills: number;
}

export const StudentBalances: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [term, setTerm] = useState('ALL');
  const [year, setYear] = useState('');
  const [years, setYears] = useState<string[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (y?: string, t?: string) => {
    setLoading(true);
    setError(null);
    const activeYear = y || year || (await fetchCurrentAcademicYear());
    const activeTerm = t ?? term;
    if (!year) setYear(activeYear);

    let invoiceQuery = supabase
      .from('student_invoices')
      .select('student_id, total, amount_paid, balance, term')
      .eq('academic_year', activeYear)
      .neq('status', 'cancelled');
    if (activeTerm !== 'ALL') invoiceQuery = invoiceQuery.eq('term', activeTerm);

    const [{ data: sts, error: stErr }, { data: cls }, { data: invs, error: invErr }, ys] = await Promise.all([
      supabase.from('students').select('id, admission_number, user_id').is('archived_at', null),
      supabase.from('classes').select('id, name').order('name'),
      invoiceQuery,
      fetchAcademicYears(),
    ]);
    if (stErr || invErr) {
      setError((stErr || invErr)!.message);
      setRows([]); setLoading(false); return;
    }
    setClasses((cls || []) as any);
    setYears(ys.length ? ys : [activeYear]);

    const classMap = await fetchStudentClassMap((sts || []) as any);
    const userIds = [...new Set((sts || []).map((s: any) => s.user_id).filter(Boolean))];
    let nameMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      nameMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
    }
    const agg: Record<string, { billed: number; paid: number; due: number; bills: number }> = {};
    (invs || []).forEach((i: any) => {
      const a = agg[i.student_id] || (agg[i.student_id] = { billed: 0, paid: 0, due: 0, bills: 0 });
      a.billed += Number(i.total || 0);
      a.paid += Number(i.amount_paid || 0);
      a.due += Number(i.balance || 0);
      a.bills += 1;
    });

    const out: Row[] = (sts || []).map((s: any) => {
      const info = classMap.get(s.id);
      const a = agg[s.id] || { billed: 0, paid: 0, due: 0, bills: 0 };
      return {
        id: s.id,
        name: nameMap.get(s.user_id) || s.admission_number || 'Unknown',
        admission: s.admission_number || '—',
        class_id: info?.class_id || null,
        class_name: info?.class_name || '—',
        billed: a.billed, paid: a.paid, outstanding: Math.max(0, a.due), bills: a.bills,
      };
    });
    out.sort((a, b) => a.name.localeCompare(b.name));
    setRows(out); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  useRealtimeRefresh('student-balances', ['students', 'fee_payments', 'student_invoices', 'class_assignments'], () => { void load(); });

  const filtered = useMemo(() => {
    return rows.filter(r =>
      (classFilter === 'ALL' || r.class_id === classFilter) &&
      (!q || r.name.toLowerCase().includes(q.toLowerCase()) || r.admission.toLowerCase().includes(q.toLowerCase()))
    );
  }, [rows, q, classFilter]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    billed: a.billed + r.billed, paid: a.paid + r.paid, due: a.due + r.outstanding,
  }), { billed: 0, paid: 0, due: 0 }), [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Balances</CardTitle>
        <CardDescription>Billed {NGN(totals.billed)} • paid {NGN(totals.paid)} • outstanding {NGN(totals.due)}</CardDescription>
        <div className="grid gap-2 sm:grid-cols-4 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name or admission #" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={v => { setYear(v); load(v); }}>
            <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={term} onValueChange={v => { setTerm(v); load(undefined, v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Whole session</SelectItem>
              {TERMS.map(t => <SelectItem key={t} value={t}>{t} term</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Could not load balances: {error}</div>}
        {loading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin h-6 w-6" /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Student</TableHead><TableHead>Class</TableHead>
                <TableHead className="text-right">Billed</TableHead><TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.admission}</div></TableCell>
                    <TableCell>{r.class_name}</TableCell>
                    <TableCell className="text-right">{NGN(r.billed)}</TableCell>
                    <TableCell className="text-right text-green-600">{NGN(r.paid)}</TableCell>
                    <TableCell className="text-right font-semibold">{NGN(r.outstanding)}</TableCell>
                    <TableCell>
                      {r.bills === 0 ? <Badge variant="outline">No bill</Badge>
                        : r.outstanding <= 0 ? <Badge>Cleared</Badge>
                        : r.paid > 0 ? <Badge variant="outline">Partial</Badge>
                        : <Badge variant="destructive">Owing</Badge>}
                    </TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setSelected(r)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No students match</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
        {selected && <StudentBalanceDrawer studentId={selected.id} name={selected.name} onClose={() => { setSelected(null); load(); }} />}
      </CardContent>
    </Card>
  );
};
