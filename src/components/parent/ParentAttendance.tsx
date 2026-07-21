import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useChildren } from '@/contexts/ChildContext';
import { CalendarDays, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AttRow { id: string; date: string; status: string; remarks: string | null; }
interface RawRow { id: string; status: string; notes: string | null; attendance_sessions: { date: string } | null; }

export const ParentAttendance: React.FC = () => {
  const { selectedChild } = useChildren();
  const [rows, setRows] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!selectedChild) return;
      setLoading(true);
      const { data } = await supabase
        .from('student_attendance')
        .select('id,status,notes,attendance_sessions(date)')
        .eq('student_id', selectedChild.student_id)
        .order('marked_at', { ascending: false })
        .limit(180);
      const mapped: AttRow[] = ((data || []) as unknown as RawRow[])
        .filter(r => r.attendance_sessions?.date)
        .map(r => ({ id: r.id, status: r.status, date: r.attendance_sessions!.date, remarks: r.notes }));
      setRows(mapped);
      setLoading(false);
    })();
  }, [selectedChild?.student_id]);

  if (!selectedChild) return <Card><CardContent className="p-6 text-center text-muted-foreground">Select a child.</CardContent></Card>;
  if (!selectedChild.can_view_attendance) return <Card><CardContent className="p-6 text-center text-muted-foreground">No attendance access.</CardContent></Card>;
  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;

  const total = rows.length;
  const present = rows.filter(r => r.status === 'present').length;
  const late = rows.filter(r => r.status === 'late').length;
  const absent = rows.filter(r => r.status === 'absent').length;
  const rate = total ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Attendance rate</CardDescription><CardTitle className="text-3xl">{rate}%</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Present</CardDescription><CardTitle className="text-green-600">{present}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Late</CardDescription><CardTitle className="text-yellow-600">{late}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Absent</CardDescription><CardTitle className="text-red-600">{absent}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Recent attendance</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className="text-center text-muted-foreground py-6">No records yet.</p> : (
            <div className="divide-y">
              {rows.slice(0, 40).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {r.status === 'present' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {r.status === 'late' && <Clock className="h-4 w-4 text-yellow-600" />}
                    {r.status === 'absent' && <XCircle className="h-4 w-4 text-red-600" />}
                    <span>{format(new Date(r.date), 'EEE, PP')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'present' ? 'secondary' : r.status === 'absent' ? 'destructive' : 'outline'}>{r.status}</Badge>
                    {r.remarks && <span className="text-xs text-muted-foreground">{r.remarks}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};