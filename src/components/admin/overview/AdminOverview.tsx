import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import {
  Users, CalendarCheck, Wallet, AlertCircle, GraduationCap, Activity,
  RefreshCw, ArrowRight, Banknote, UserPlus, FileText, Megaphone, ReceiptText,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

export interface OverviewData {
  academic_year: string;
  generated_at: string;
  students: { total: number; male: number; female: number; missing_gender: number; boarding: number };
  students_by_level: { name: string; order: number; male: number; female: number }[];
  attendance: { marked: number; present: number; absent: number };
  attendance_trend: { date: string; rate: number | null }[];
  finance: { billed: number; collected: number; outstanding: number; invoices: number; overdue: number };
  fee_trend: { month: string; label: string; amount: number }[];
  admissions: { total: number; pending: number; accepted: number; enrolled: number };
  admission_funnel: { status: string; count: number }[];
  exams: { total: number; published: number; live_sessions: number; teachers: number; classes: number; subjects: number };
  attention: Record<string, number>;
  activity: { kind: string; at: string; title: string; detail: string }[];
}

const naira = (n: number) =>
  '₦' + Math.round(Number(n) || 0).toLocaleString();

const FUNNEL_ORDER = ['submitted', 'under_review', 'interview_scheduled', 'accepted', 'payment_pending', 'enrolled', 'rejected', 'withdrawn'];
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const AdminOverview: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data: res, error: err } = await (supabase as any).rpc('get_dashboard_overview');
      if (err) throw err;
      setData(res as OverviewData);
    } catch (e: any) {
      setError(e.message || 'Could not load the dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('admin-overview',
    ['fee_payments', 'student_attendance', 'admission_applications', 'exam_sessions', 'student_enrollments'],
    () => { void load(); });

  const go = (tab: string, subtab?: string) =>
    navigate(`/admin?tab=${tab}${subtab ? `&subtab=${subtab}` : ''}`);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertCircle className="h-6 w-6 mx-auto text-destructive" />
          <p className="text-sm text-muted-foreground">{error || 'No dashboard data available.'}</p>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); void load(); }}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const att = data.attendance;
  const attRate = att.marked ? Math.round((att.present / att.marked) * 100) : null;
  const fin = data.finance;
  const collectedPct = fin.billed ? Math.round((Number(fin.collected) / Number(fin.billed)) * 100) : 0;

  const kpis = [
    {
      label: 'Active students', icon: Users,
      value: data.students.total.toLocaleString(),
      sub: `${data.students.male} male · ${data.students.female} female`,
      onClick: () => go('academic', 'students'),
    },
    {
      label: 'Attendance today', icon: CalendarCheck,
      value: attRate === null ? '—' : `${attRate}%`,
      sub: attRate === null ? 'Not marked yet' : `${att.absent} absent of ${att.marked} marked`,
      onClick: () => go('attendance-reports'),
    },
    {
      label: 'Fees collected', icon: Wallet,
      value: naira(fin.collected),
      sub: `${collectedPct}% of ${naira(fin.billed)} billed`,
      onClick: () => go('fees', 'fees'),
    },
    {
      label: 'Outstanding', icon: ReceiptText,
      value: naira(fin.outstanding),
      sub: `${fin.overdue} bills overdue`,
      onClick: () => go('fees', 'fees'),
    },
    {
      label: 'Applications', icon: GraduationCap,
      value: data.admissions.total.toLocaleString(),
      sub: `${data.admissions.pending} awaiting decision`,
      onClick: () => go('admissions', 'applications'),
    },
    {
      label: 'Live exam sessions', icon: Activity,
      value: data.exams.live_sessions.toLocaleString(),
      sub: `${data.exams.published} published exams`,
      onClick: () => go('academic'),
    },
  ];

  const attentionItems = [
    { key: 'applications_pending', label: 'Applications awaiting review', go: () => go('admissions', 'applications') },
    { key: 'documents_pending', label: 'Documents awaiting verification', go: () => go('admissions', 'applications') },
    { key: 'invoices_overdue', label: 'Overdue bills', go: () => go('fees', 'fees') },
    { key: 'unplaced', label: 'Students not placed in a class', go: () => go('academic', 'students') },
    { key: 'missing_gender', label: 'Students missing gender', go: () => go('academic', 'students') },
    { key: 'payroll_pending', label: 'Payroll runs not yet paid', go: () => go('hr', 'payroll') },
  ].filter(i => (data.attention?.[i.key] ?? 0) > 0);

  const funnel = FUNNEL_ORDER
    .map(s => ({ name: pretty(s), count: data.admission_funnel.find(f => f.status === s)?.count ?? 0 }))
    .filter(f => f.count > 0);

  const attTrend = [...(data.attendance_trend || [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ day: d.date.slice(5), rate: Number(d.rate) || 0 }));

  const feeTrend = [...(data.fee_trend || [])]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(d => ({ label: d.label, amount: Number(d.amount) || 0 }));

  const levels = [...(data.students_by_level || [])]
    .sort((a, b) => a.order - b.order)
    .map(l => ({ name: l.name, Male: l.male, Female: l.female }));

  const quickActions = [
    { label: 'Record cash payment', icon: Banknote, onClick: () => go('fees', 'fees') },
    { label: 'Students', icon: UserPlus, onClick: () => go('academic', 'students') },
    { label: 'Create exam', icon: FileText, onClick: () => go('academic') },
    { label: 'Send announcement', icon: Megaphone, onClick: () => go('announcements') },
    { label: 'Report cards', icon: ReceiptText, onClick: () => go('academic', 'report-cards') },
  ];

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">School overview</h2>
          <p className="text-sm text-muted-foreground">
            Session {data.academic_year} · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(k => (
          <button key={k.label} onClick={k.onClick} className="text-left">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <k.icon className="h-4 w-4" />
                  <span className="text-[11px] uppercase tracking-wide truncate">{k.label}</span>
                </div>
                <p className="text-2xl font-bold mt-1 truncate">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{k.sub}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Fee collection (last 6 months)</CardTitle></CardHeader>
          <CardContent className="h-64">
            {feeTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No payments recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: any) => naira(v)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Attendance rate (recent days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            {attTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No attendance recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Students by class</CardTitle></CardHeader>
          <CardContent className="h-64">
            {levels.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No class placements yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levels}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Male" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="Female" stackId="a" fill="hsl(var(--accent-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Admissions by stage</CardTitle></CardHeader>
          <CardContent className="h-64">
            {funnel.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No applications yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={120} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attention + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Needs attention</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {attentionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nothing needs your attention right now.</p>
            ) : attentionItems.map(item => (
              <button key={item.key} onClick={item.go}
                className="w-full flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors text-left">
                <span className="text-sm">{item.label}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{data.attention[item.key]}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data.activity || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No recent activity.</p>
            ) : data.activity.map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-3 border-b last:border-0 pb-2 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{pretty(a.kind)} · {a.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(a.at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickActions.map(a => (
            <Button key={a.label} variant="outline" size="sm" onClick={a.onClick}>
              <a.icon className="h-4 w-4 mr-2" /> {a.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
