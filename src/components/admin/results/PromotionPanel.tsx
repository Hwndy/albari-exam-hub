import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Archive, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const PromotionPanel: React.FC = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [nextClassId, setNextClassId] = useState('');
  const [minAvg, setMinAvg] = useState(40);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, ss] = await Promise.all([
        supabase.from('classes').select('id,name').order('name'),
        supabase.from('admission_sessions').select('id,session_name,is_current').order('start_date', { ascending: false }),
      ]);
      setClasses(c.data || []);
      const list = ss.data || [];
      setSessions(list);
      const cur = list.find((x: any) => x.is_current) || list[0];
      if (cur) setSessionId(cur.id);
          })();
  }, []);

  useEffect(() => {
    if (!classId || !sessionId) return;
    (async () => {
      setLoading(true);
      const { data: assigns } = await supabase.from('class_assignments').select('student_id').eq('class_id', classId);
      const uids = (assigns || []).map((a: any) => a.student_id);
      if (uids.length === 0) { setRows([]); setLoading(false); return; }
      const { data: studs } = await supabase.from('students').select('id,user_id,archived_at').in('user_id', uids);
      const active = (studs || []).filter((s: any) => !s.archived_at);
      const { data: profs } = await supabase.from('profiles').select('user_id,full_name').in('user_id', uids);
      const uToName = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));

      const ids = active.map((s: any) => s.id);
      const { data: scores } = await supabase.from('v_student_term_scores').select('student_id,test1,test2,exam_score,term').in('student_id', ids).eq('class_id', classId).eq('session_id', sessionId);
      const totals: Record<string, { sum: number; n: number }> = {};
      (scores || []).forEach((r: any) => {
        const t = (Number(r.test1) || 0) + (Number(r.test2) || 0) + (Number(r.exam_score) || 0);
        totals[r.student_id] = totals[r.student_id] || { sum: 0, n: 0 };
        totals[r.student_id].sum += t;
        totals[r.student_id].n += 1;
      });

      setRows(active.map((s: any) => {
        const t = totals[s.id];
        const avg = t && t.n ? Math.round((t.sum / t.n) * 10) / 10 : 0;
        return { id: s.id, user_id: s.user_id, name: uToName.get(s.user_id) || '—', average: avg };
      }));
      setLoading(false);
    })();
  }, [classId, sessionId]);

  const promote = async () => {
    if (!nextClassId) { toast({ title: 'Pick next class', variant: 'destructive' }); return; }
    setWorking(true);
    const promoteIds = rows.filter(r => r.average >= minAvg).map(r => r.user_id);
    for (const uid of promoteIds) {
      await supabase.from('class_assignments').update({ class_id: nextClassId }).eq('student_id', uid).eq('class_id', classId);
    }
    setWorking(false);
    toast({ title: 'Promotion complete', description: `${promoteIds.length} students moved.` });
  };

  const archive = async () => {
    setWorking(true);
    const ids = rows.map(r => r.id);
    await supabase.from('students').update({ archived_at: new Date().toISOString(), archived_reason: 'Graduated' }).in('id', ids);
    setWorking(false);
    toast({ title: 'Archived', description: `${ids.length} students moved to Past Students.` });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Promotion & Archive</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2"><Label>Current class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Session</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>{sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.session_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Promote to</Label>
            <Select value={nextClassId} onValueChange={setNextClassId}>
              <SelectTrigger><SelectValue placeholder="Next class" /></SelectTrigger>
              <SelectContent>{classes.filter(c => c.id !== classId).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex items-end gap-2">
            <Button onClick={promote} disabled={working || !rows.length}>
              <ArrowRight className="h-4 w-4 mr-2" />Promote qualifying
            </Button>
            <Button variant="outline" onClick={archive} disabled={working || !rows.length}>
              <Archive className="h-4 w-4 mr-2" />Archive (SSS3)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          : rows.length === 0 ? <div className="py-12 text-center text-muted-foreground">Select a class and session.</div>
          : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Session Average</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">{r.average}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.average >= minAvg ? 'default' : 'destructive'}>
                        {r.average >= minAvg ? 'Promote' : 'Repeat'}
                      </Badge>
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

export default PromotionPanel;