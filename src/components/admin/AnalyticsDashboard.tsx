import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';

type Analytics = {
  kpis: {
    students: number; staff: number; parents: number;
    term_revenue: number; outstanding: number;
    attendance_rate: number;
    apps_total: number; apps_enrolled: number; conversion_rate: number;
  };
  enrolment_by_class: { class_name: string; student_count: number }[];
  collections_30d: { day: string; collected: number; payments: number }[];
  attendance_30d: { day: string; present: number; absent: number; late: number }[];
  admission_funnel: { status: string; count: number }[];
};

const COLORS = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const naira = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n || 0);

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_admin_analytics');
      if (error) toast({ title: 'Analytics error', description: error.message, variant: 'destructive' });
      else setData(data as unknown as Analytics);
      setLoading(false);
    })();
  }, [toast]);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
  if (!data) return <p className="text-muted-foreground">No analytics available.</p>;

  const k = data.kpis;
  const kpiCards = [
    { label: 'Active Students', value: k.students },
    { label: 'Staff', value: k.staff },
    { label: 'Parents Linked', value: k.parents },
    { label: 'Revenue (3 mo)', value: naira(k.term_revenue) },
    { label: 'Outstanding Fees', value: naira(k.outstanding) },
    { label: 'Attendance (30d)', value: `${k.attendance_rate}%` },
    { label: 'Applications', value: k.apps_total },
    { label: 'Enrolled', value: `${k.apps_enrolled} (${k.conversion_rate}%)` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-muted-foreground">Live KPIs across enrolment, revenue, attendance and admissions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold mt-1">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Enrolment by Class</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.enrolment_by_class}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class_name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="student_count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fee Collections (30 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.collections_30d}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => naira(v)} />
                <Line type="monotone" dataKey="collected" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Attendance Trend (30 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.attendance_30d}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#22c55e" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Admission Funnel</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.admission_funnel} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                  {data.admission_funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;