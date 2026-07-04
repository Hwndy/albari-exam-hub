import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
const TERMS: Record<string, 'first' | 'second' | 'third'> = {
  'First Term': 'first', 'Second Term': 'second', 'Third Term': 'third',
};

export const Broadsheet: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [term, setTerm] = useState('First Term');
  const [rows, setRows] = useState<any[]>([]);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, s, ss] = await Promise.all([
        supabase.from('classes').select('id,name').order('name'),
        supabase.from('subjects').select('id,name').order('name'),
        supabase.from('admission_sessions').select('id,session_name,is_current').order('start_date', { ascending: false }),
      ]);
      setClasses(c.data || []);
      setSubjects(s.data || []);
      const list = ss.data || [];
      setSessions(list);
      const cur = list.find((x: any) => x.is_current) || list[0];
      if (cur) setSessionId(cur.id);
    })();
  }, [undefined]);

  useEffect(() => {
    if (!classId || !sessionId) { setRows([]); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('v_student_term_scores')
        .select('*')
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term', TERMS[term]);
      setRows(data || []);

      const ids = Array.from(new Set((data || []).map((r: any) => r.student_id)));
      if (ids.length) {
        const { data: studs } = await supabase.from('students').select('id,user_id').in('id', ids);
        const userIds = (studs || []).map((s: any) => s.user_id);
        const { data: profs } = await supabase.from('profiles').select('user_id,full_name').in('user_id', userIds);
        const uToName = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
        const map: Record<string, string> = {};
        (studs || []).forEach((s: any) => { map[s.id] = uToName.get(s.user_id) || '—'; });
        setStudents(map);
      }
      setLoading(false);
    })();
  }, [classId, sessionId, term]);

  const grid = useMemo(() => {
    const byStudent: Record<string, Record<string, number>> = {};
    rows.forEach((r: any) => {
      const total = (Number(r.test1) || 0) + (Number(r.test2) || 0) + (Number(r.exam_score) || 0);
      byStudent[r.student_id] = byStudent[r.student_id] || {};
      byStudent[r.student_id][r.subject_id] = total;
    });
    return byStudent;
  }, [rows]);

  const studentIds = Object.keys(grid);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Termly Broadsheet</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(TERMS).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Session</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>{sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.session_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : studentIds.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Select a class, term and session.</div>
          ) : (
            <>
              <div className="flex justify-end p-3">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    {subjects.map(s => <TableHead key={s.id} className="text-center">{s.name}</TableHead>)}
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Avg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentIds.map(sid => {
                    const scores = subjects.map(s => grid[sid][s.id] ?? '');
                    const nums = scores.filter(v => typeof v === 'number') as number[];
                    const total = nums.reduce((a, b) => a + b, 0);
                    const avg = nums.length ? Math.round((total / nums.length) * 10) / 10 : 0;
                    return (
                      <TableRow key={sid}>
                        <TableCell className="font-medium">{students[sid] || sid}</TableCell>
                        {scores.map((v, i) => <TableCell key={i} className="text-center">{v === '' ? '—' : v}</TableCell>)}
                        <TableCell className="text-center font-semibold">{total}</TableCell>
                        <TableCell className="text-center">{avg}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Broadsheet;