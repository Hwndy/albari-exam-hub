import React, { useEffect, useState } from 'react';
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

export const PayrollHub: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const load = async () => {
    const { data } = await supabase.from('payroll_periods').select('*').order('period_month', { ascending: false });
    setPeriods(data || []);
  };
  useEffect(() => { load(); }, []);

  const createPeriod = async () => {
    const { error } = await supabase.from('payroll_periods').insert({
      period_month: `${month}-01`, status: 'draft', created_by: user?.id,
    });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Period created' }); load(); }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('payroll_periods').update({ status }).eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payroll</h2>
        <p className="text-muted-foreground">Create monthly payroll periods and track their status.</p>
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
                    <TableCell className="space-x-2">
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