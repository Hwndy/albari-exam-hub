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
  TrendingUp, Clock3, CircleAlert, CheckCircle2,
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

interface RpcError { message: string }

const naira = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const FUNNEL_ORDER = ['submitted', 'under_review', 'interview_scheduled', 'accepted', 'payment_pending', 'enrolled', 'rejected', 'withdrawn'];
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const chartTooltip = { borderRadius: 6, border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-card)' };

export const AdminOverview: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    setError(null);
    try {
      const callOverview = supabase.rpc as unknown as (name: string) => Promise<{ data: unknown; error: RpcError | null }>;
      const { data: res, error: err } = await callOverview('get_dashboard_overview');
      if (err) throw err;
      setData(res as OverviewData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load the dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeRefresh('admin-overview',
    ['fee_payments', 'student_attendance', 'admission_applications', 'exam_sessions', 'student_enrollments'],
    () => { void load(true); });

  const go = (tab: string, subtab?: string) => navigate(`/admin?tab=${tab}${subtab ? `&subtab=${subtab}` : ''}`);

  if (loading) {
    return <div className="space-y-6" aria-label="Loading dashboard">
      <Skeleton className="h-20 rounded-md" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-md" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-md" /><Skeleton className="h-80 rounded-md" /></div>
    </div>;
  }

  if (error || !data) {
    return <Card><CardContent className="p-10 text-center space-y-4">
      <AlertCircle className="h-7 w-7 mx-auto text-destructive" />
      <div><h2 className="font-heading font-semibold">Dashboard unavailable</h2><p className="mt-1 text-sm text-muted-foreground">{error || 'No dashboard data available.'}</p></div>
      <Button variant="outline" size="sm" onClick={() => { setLoading(true); void load(); }}>Try again</Button>
    </CardContent></Card>;
  }

  const att = data.attendance;
  const attRate = att.marked ? Math.round((att.present / att.marked) * 100) : null;
  const fin = data.finance;
  const collectedPct = fin.billed ? Math.round((Number(fin.collected) / Number(fin.billed)) * 100) : 0;
  const kpis = [
    { label: 'Active students', icon: Users, value: data.students.total.toLocaleString(), sub: `${data.students.male} male · ${data.students.female} female`, onClick: () => go('academic', 'students') },
    { label: 'Attendance today', icon: CalendarCheck, value: attRate === null ? '—' : `${attRate}%`, sub: attRate === null ? 'Not marked yet' : `${att.absent} absent · ${att.marked} marked`, onClick: () => go('attendance-reports') },
    { label: 'Fees collected', icon: Wallet, value: naira(fin.collected), sub: `${collectedPct}% of billed amount`, onClick: () => go('fees', 'fees') },
    { label: 'Outstanding', icon: ReceiptText, value: naira(fin.outstanding), sub: `${fin.overdue} overdue bill${fin.overdue === 1 ? '' : 's'}`, onClick: () => go('fees', 'fees') },
    { label: 'Applications', icon: GraduationCap, value: data.admissions.total.toLocaleString(), sub: `${data.admissions.pending} awaiting decision`, onClick: () => go('admissions', 'applications') },
    { label: 'Live exams', icon: Activity, value: data.exams.live_sessions.toLocaleString(), sub: `${data.exams.published} published`, onClick: () => go('academic') },
  ];
  const attentionItems = [
    { key: 'applications_pending', label: 'Applications awaiting review', go: () => go('admissions', 'applications') },
    { key: 'documents_pending', label: 'Documents awaiting verification', go: () => go('admissions', 'applications') },
    { key: 'invoices_overdue', label: 'Overdue student bills', go: () => go('fees', 'fees') },
    { key: 'unplaced', label: 'Students not placed in a class', go: () => go('academic', 'students') },
    { key: 'missing_gender', label: 'Student records missing gender', go: () => go('academic', 'students') },
    { key: 'payroll_pending', label: 'Payroll runs not yet paid', go: () => go('hr', 'payroll') },
  ].filter(i => (data.attention?.[i.key] ?? 0) > 0);
  const funnel = FUNNEL_ORDER.map(s => ({ name: pretty(s), count: data.admission_funnel.find(f => f.status === s)?.count ?? 0 })).filter(f => f.count > 0);
  const attTrend = [...(data.attendance_trend || [])].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ day: d.date.slice(5), rate: Number(d.rate) || 0 }));
  const feeTrend = [...(data.fee_trend || [])].sort((a, b) => a.month.localeCompare(b.month)).map(d => ({ label: d.label, amount: Number(d.amount) || 0 }));
  const levels = [...(data.students_by_level || [])].sort((a, b) => a.order - b.order).map(l => ({ name: l.name, Male: l.male, Female: l.female }));
  const quickActions = [
    { label: 'Record payment', icon: Banknote, onClick: () => go('fees', 'fees') },
    { label: 'Manage students', icon: UserPlus, onClick: () => go('academic', 'students') },
    { label: 'Create exam', icon: FileText, onClick: () => go('academic') },
    { label: 'Announcement', icon: Megaphone, onClick: () => go('announcements') },
    { label: 'Report cards', icon: ReceiptText, onClick: () => go('academic', 'report-cards') },
  ];

  return <div className="space-y-6 lg:space-y-8">
    <section className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><span className="h-2 w-2 rounded-full bg-gold" />Live school overview</div>
        <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Good day, Administrator</h2>
        <p className="mt-1 text-sm text-muted-foreground">{data.academic_year} session · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}>
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh data
      </Button>
    </section>

    <section aria-label="Key school figures" className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k, i) => <Button key={k.label} variant="ghost" onClick={k.onClick} className="group h-auto min-h-32 whitespace-normal rounded-md border border-border bg-card p-0 text-left shadow-sm hover:border-primary/30 hover:bg-card hover:shadow-md">
        <span className="flex h-full w-full flex-col p-4">
          <span className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">{k.label}</span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${i === 3 ? 'bg-destructive/10 text-destructive' : i === 4 ? 'bg-warning/15 text-warning-foreground' : 'bg-accent text-primary'}`}><k.icon className="h-4 w-4" /></span>
          </span>
          <span className="mt-3 block max-w-full break-words font-heading text-xl font-semibold text-foreground sm:text-2xl">{k.value}</span>
          <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{k.sub}</span>
        </span>
      </Button>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-7 overflow-hidden"><CardHeader className="flex-row items-center justify-between space-y-0 border-b p-5"><div><CardTitle className="text-base">Fee collection trend</CardTitle><p className="mt-1 text-xs text-muted-foreground">Payments received over the last six months</p></div><TrendingUp className="h-5 w-5 text-primary" /></CardHeader><CardContent className="h-72 p-4 pt-5">
        {feeTrend.length === 0 ? <Empty text="No payments recorded yet." /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={feeTrend}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} /><Tooltip contentStyle={chartTooltip} formatter={v => naira(Number(v))} /><Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>}
      </CardContent></Card>
      <Card className="xl:col-span-5 overflow-hidden"><CardHeader className="flex-row items-center justify-between space-y-0 border-b p-5"><div><CardTitle className="text-base">Attendance pulse</CardTitle><p className="mt-1 text-xs text-muted-foreground">Present rate across recent school days</p></div><CalendarCheck className="h-5 w-5 text-primary" /></CardHeader><CardContent className="h-72 p-4 pt-5">
        {attTrend.length === 0 ? <Empty text="No attendance recorded yet." /> : <ResponsiveContainer width="100%" height="100%"><LineChart data={attTrend}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><YAxis domain={[0,100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} /><Tooltip contentStyle={chartTooltip} formatter={v => `${Number(v)}%`} /><Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--gold))', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer>}
      </CardContent></Card>
      <Card className="xl:col-span-7 overflow-hidden"><CardHeader className="border-b p-5"><CardTitle className="text-base">Students by class</CardTitle><p className="text-xs text-muted-foreground">Male and female enrolment distribution</p></CardHeader><CardContent className="h-72 p-4 pt-5">
        {levels.length === 0 ? <Empty text="No class placements yet." /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={levels}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={0} angle={-25} textAnchor="end" height={58} tickLine={false} axisLine={false} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={chartTooltip} /><Legend iconType="circle" iconSize={8} /><Bar dataKey="Male" stackId="a" fill="hsl(var(--primary))" /><Bar dataKey="Female" stackId="a" fill="hsl(var(--gold))" radius={[3,3,0,0]} /></BarChart></ResponsiveContainer>}
      </CardContent></Card>
      <Card className="xl:col-span-5 overflow-hidden"><CardHeader className="border-b p-5"><CardTitle className="text-base">Admissions pipeline</CardTitle><p className="text-xs text-muted-foreground">Applications by current decision stage</p></CardHeader><CardContent className="h-72 p-4 pt-5">
        {funnel.length === 0 ? <Empty text="No applications yet." /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={funnel} layout="vertical" margin={{ left: 18 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={105} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={chartTooltip} /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[0,4,4,0]} /></BarChart></ResponsiveContainer>}
      </CardContent></Card>
    </section>

    <section className="grid gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-4"><CardHeader className="flex-row items-center justify-between space-y-0 border-b p-5"><CardTitle className="text-base">Needs attention</CardTitle>{attentionItems.length > 0 && <Badge variant="destructive">{attentionItems.length}</Badge>}</CardHeader><CardContent className="p-2">
        {attentionItems.length === 0 ? <div className="flex flex-col items-center py-8 text-center"><CheckCircle2 className="h-7 w-7 text-success" /><p className="mt-2 text-sm font-medium">All clear</p><p className="text-xs text-muted-foreground">Nothing needs attention right now.</p></div> : attentionItems.map(item => <Button key={item.key} variant="ghost" onClick={item.go} className="h-auto w-full justify-start whitespace-normal rounded-md p-3 text-left hover:bg-muted"><CircleAlert className="h-4 w-4 shrink-0 text-warning" /><span className="min-w-0 flex-1 text-sm">{item.label}</span><Badge variant="secondary">{data.attention[item.key]}</Badge><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Button>)}
      </CardContent></Card>
      <Card className="xl:col-span-5"><CardHeader className="flex-row items-center justify-between space-y-0 border-b p-5"><CardTitle className="text-base">Recent activity</CardTitle><Clock3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent className="divide-y p-0">
        {(data.activity || []).length === 0 ? <Empty text="No recent activity." /> : data.activity.slice(0,8).map((a,i) => <div key={`${a.at}-${i}`} className="flex items-start gap-3 px-5 py-3.5"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.title}</p><p className="truncate text-xs text-muted-foreground">{pretty(a.kind)} · {a.detail}</p></div><time className="whitespace-nowrap text-[10px] text-muted-foreground">{new Date(a.at).toLocaleDateString()}</time></div>)}
      </CardContent></Card>
      <Card className="xl:col-span-3"><CardHeader className="border-b p-5"><CardTitle className="text-base">Quick actions</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 p-3 xl:grid-cols-1">
        {quickActions.map((a,i) => <Button key={a.label} variant={i === 0 ? 'default' : 'ghost'} size="sm" onClick={a.onClick} className="justify-start"><a.icon className="h-4 w-4" />{a.label}</Button>)}
      </CardContent></Card>
    </section>
  </div>;
};

const Empty = ({ text }: { text: string }) => <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">{text}</div>;

export default AdminOverview;