import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { printNode } from '@/lib/print-node';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';

const NGN = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(n) || 0);
const today = () => new Date().toISOString().slice(0, 10);
const startOfYear = () => `${new Date().getFullYear()}-01-01`;

interface Summary {
  fee_income: number; other_income: number; total_income: number;
  total_expenses: number; surplus: number;
  by_month: { month: string; income: number; expenses: number }[];
  expenses_by_category: { name: string; amount: number }[];
  revenue_by_category: { name: string; amount: number }[];
}

export const FinanceReports: React.FC = () => {
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true); setError(null);
    const { data: res, error } = await supabase.rpc('get_finance_summary', { p_start: from, p_end: to });
    if (error) setError(error.message); else setData(res as unknown as Summary);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from, to]);

  const chart = (data?.by_month || []).map(m => ({
    label: new Date(m.month).toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }),
    Income: Number(m.income),
    Expenses: Number(m.expenses),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          </div>
          <Button variant="outline" onClick={() => ref.current && printNode(ref.current, { title: 'Finance report' })}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
        </CardHeader>
      </Card>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        : error ? <Card><CardContent className="py-10 text-center text-destructive">{error}</CardContent></Card>
        : !data ? null
        : (
        <div ref={ref} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" />Fee income</p>
              <p className="text-2xl font-bold">{NGN(data.fee_income)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4" />Other income</p>
              <p className="text-2xl font-bold">{NGN(data.other_income)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingDown className="h-4 w-4" />Expenses</p>
              <p className="text-2xl font-bold">{NGN(data.total_expenses)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Surplus / deficit</p>
              <p className={`text-2xl font-bold ${data.surplus < 0 ? 'text-destructive' : 'text-primary'}`}>{NGN(data.surplus)}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Income vs expenses by month</CardTitle></CardHeader>
            <CardContent className="h-72">
              {chart.length === 0 ? <p className="text-muted-foreground text-center py-12">No data in range.</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                    <Tooltip formatter={(v: any) => NGN(Number(v))} />
                    <Legend />
                    <Bar dataKey="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Expenses by category</CardTitle></CardHeader>
              <CardContent>
                {data.expenses_by_category.length === 0 ? <p className="text-muted-foreground">No expenses.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.expenses_by_category.map(c => (
                        <TableRow key={c.name}><TableCell>{c.name}</TableCell><TableCell className="text-right">{NGN(c.amount)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Other revenue by category</CardTitle></CardHeader>
              <CardContent>
                {data.revenue_by_category.length === 0 ? <p className="text-muted-foreground">No other revenue.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.revenue_by_category.map(c => (
                        <TableRow key={c.name}><TableCell>{c.name}</TableCell><TableCell className="text-right">{NGN(c.amount)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceReports;
