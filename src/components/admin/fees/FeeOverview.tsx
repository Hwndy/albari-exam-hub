import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wallet, TrendingUp, AlertTriangle, CalendarClock } from 'lucide-react';
import { NGN, fetchCurrentAcademicYear } from '@/lib/fees';

export const FeeOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('');
  const [stats, setStats] = useState({
    billed: 0, collected: 0, outstanding: 0, thisMonth: 0,
    bills: 0, unbilled: 0, byTerm: [] as { term: string; billed: number; paid: number }[],
    defaulters: [] as any[],
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const activeYear = await fetchCurrentAcademicYear();
      setYear(activeYear);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [{ data: invoices }, { data: payments }, { count: studentCount }] = await Promise.all([
        supabase.from('student_invoices').select('student_id, term, total, amount_paid, balance').eq('academic_year', activeYear).neq('status', 'cancelled'),
        supabase.from('fee_payments').select('amount_paid, payment_date, status').eq('status', 'completed'),
        supabase.from('students').select('id', { count: 'exact', head: true }).is('archived_at', null),
      ]);

      let billed = 0, collected = 0, outstanding = 0;
      const byTermMap: Record<string, { billed: number; paid: number }> = {};
      const dueByStudent: Record<string, number> = {};
      const billedStudents = new Set<string>();
      (invoices || []).forEach((i: any) => {
        billed += Number(i.total || 0);
        collected += Number(i.amount_paid || 0);
        outstanding += Number(i.balance || 0);
        billedStudents.add(i.student_id);
        const t = byTermMap[i.term] || (byTermMap[i.term] = { billed: 0, paid: 0 });
        t.billed += Number(i.total || 0); t.paid += Number(i.amount_paid || 0);
        dueByStudent[i.student_id] = (dueByStudent[i.student_id] || 0) + Number(i.balance || 0);
      });

      let thisMonth = 0;
      (payments || []).forEach((p: any) => {
        if (p.payment_date && new Date(p.payment_date) >= monthStart) thisMonth += Number(p.amount_paid || 0);
      });

      const top = Object.entries(dueByStudent)
        .map(([id, due]) => ({ id, outstanding: due }))
        .filter(d => d.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding).slice(0, 5);

      let named: any[] = [];
      if (top.length) {
        const { data: sts } = await supabase.from('students').select('id, admission_number, user_id').in('id', top.map(d => d.id));
        const userIds = (sts || []).map((s: any) => s.user_id).filter(Boolean);
        const { data: profs } = userIds.length
          ? await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
          : { data: [] as any[] };
        const nameByUser = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
        named = top.map(d => {
          const s: any = (sts || []).find((x: any) => x.id === d.id);
          return { ...d, name: nameByUser.get(s?.user_id) || 'Unknown', admission: s?.admission_number };
        });
      }

      setStats({
        billed, collected, outstanding, thisMonth,
        bills: (invoices || []).length,
        unbilled: Math.max(0, (studentCount || 0) - billedStudents.size),
        byTerm: Object.entries(byTermMap).map(([term, v]) => ({ term, ...v })).sort((a, b) => a.term.localeCompare(b.term)),
        defaulters: named,
      });
    } finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Wallet className="h-4 w-4" />Total Billed</CardDescription><CardTitle>{NGN(stats.billed)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><TrendingUp className="h-4 w-4" />Collected</CardDescription><CardTitle className="text-green-600">{NGN(stats.collected)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Outstanding</CardDescription><CardTitle className="text-red-600">{NGN(stats.outstanding)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><CalendarClock className="h-4 w-4" />Received This Month</CardDescription><CardTitle>{NGN(stats.thisMonth)}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session {year}</CardTitle>
          <CardDescription>{stats.bills} bill(s) issued • {stats.unbilled} student(s) with no bill yet</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.byTerm.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bills yet. Go to “Create Bills” to issue this term's charges.</p>
          ) : (
            <div className="space-y-2">
              {stats.byTerm.map(t => (
                <div key={t.term} className="flex justify-between text-sm border-b pb-2">
                  <span className="font-medium">{t.term} term</span>
                  <span>{NGN(t.paid)} collected of {NGN(t.billed)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top Defaulters</CardTitle></CardHeader>
        <CardContent>
          {stats.defaulters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding balances.</p>
          ) : (
            <div className="space-y-2">
              {stats.defaulters.map((d: any) => (
                <div key={d.id} className="flex justify-between text-sm border-b pb-2">
                  <div><div className="font-medium">{d.name}</div><div className="text-xs text-muted-foreground">{d.admission}</div></div>
                  <div className="text-red-600 font-semibold">{NGN(d.outstanding)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
