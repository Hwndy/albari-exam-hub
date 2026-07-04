import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ClassData { id: string; name: string; }
interface SubjectData { id: string; name: string; }
interface StudentRow { student_id: string; full_name: string; }
interface ScoreRow { test1: string; test2: string; exam: string; }

interface AcademicSession {
  id: string;
  session_name: string;
  academic_year: string;
  is_current: boolean;
}

const TERMS = ['First Term', 'Second Term', 'Third Term'];
const TERM_VALUES: Record<string, 'first' | 'second' | 'third'> = {
  'First Term': 'first',
  'Second Term': 'second',
  'Third Term': 'third',
};

const gradeFor = (total: number) => {
  if (total >= 70) return 'A';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  if (total >= 30) return 'E';
  return 'F';
};

export const ManualScoresEntry: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [term, setTerm] = useState('First Term');
  const [sessionId, setSessionId] = useState('');

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, s, ss] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        
          supabase
            .from('admission_sessions')
            .select('id, session_name, academic_year, is_current')
            .order('start_date', { ascending: false })
        ,
      ]);
      setClasses(c.data || []);
      setSubjects(s.data || []);
      const list = (ss.data || []) as AcademicSession[];
      setSessions(list);
      const cur = list.find(x => x.is_current) || list[0];
      if (cur) setSessionId(cur.id);
    })();
  }, [schoolId]);

  useEffect(() => {
    if (classId && subjectId && sessionId && term) loadStudentsAndScores();
    else { setStudents([]); setScores({}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, sessionId, term]);

  const loadStudentsAndScores = async () => {
    setLoading(true);
    try {
      const { data: assigns } = await supabase
        .from('class_assignments')
        .select('student_id')
        .eq('class_id', classId);
      const userIds = (assigns || []).map(a => a.student_id);
      if (userIds.length === 0) { setStudents([]); setScores({}); return; }

      const [profilesRes, studentsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
        supabase.from('students').select('id, user_id').in('user_id', userIds),
      ]);
      const idByUser = new Map((studentsRes.data || []).map(s => [s.user_id, s.id]));
      const rows: StudentRow[] = (profilesRes.data || [])
        .filter(p => idByUser.has(p.user_id))
        .map(p => ({ student_id: idByUser.get(p.user_id)!, full_name: p.full_name }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
      setStudents(rows);

      const studentIds = rows.map(r => r.student_id);
      const { data: existing } = await supabase
        .from('gradebook_entries')
        .select('student_id, test1_score, test2_score, exam_score')
        .in('student_id', studentIds)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('session_id', sessionId)
        .eq('term', TERM_VALUES[term]);

      const map: Record<string, ScoreRow> = {};
      rows.forEach(r => { map[r.student_id] = { test1: '', test2: '', exam: '' }; });
      (existing || []).forEach((e: any) => {
        map[e.student_id] = {
          test1: e.test1_score != null ? String(e.test1_score) : '',
          test2: e.test2_score != null ? String(e.test2_score) : '',
          exam: e.exam_score != null ? String(e.exam_score) : '',
        };
      });
      setScores(map);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to load', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const setScore = (id: string, field: keyof ScoreRow, v: string) => {
    setScores(s => ({ ...s, [id]: { ...(s[id] || { test1: '', test2: '', exam: '' }), [field]: v } }));
  };

  const clamp = (v: string, max: number) => {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(max, n));
  };

  const academicYear = useMemo(
    () => sessions.find(s => s.id === sessionId)?.academic_year || '',
    [sessions, sessionId]
  );

  const handleSave = async () => {
    if (!schoolId || !classId || !subjectId || !sessionId || !term) return;
    setSaving(true);
    try {
      const termVal = TERM_VALUES[term];
      const assessmentName = `${term} - ${sessions.find(s => s.id === sessionId)?.session_name || ''} (Manual)`;
      const today = format(new Date(), 'yyyy-MM-dd');

      const rows = students
        .map(st => {
          const row = scores[st.student_id] || { test1: '', test2: '', exam: '' };
          if (row.test1 === '' && row.test2 === '' && row.exam === '') return null;
          const t1 = clamp(row.test1, 20);
          const t2 = clamp(row.test2, 20);
          const ex = clamp(row.exam, 60);
          const total = t1 + t2 + ex;
          return {
                        student_id: st.student_id,
            subject_id: subjectId,
            class_id: classId,
            session_id: sessionId,
            term: termVal,
            academic_year: academicYear,
            test1_score: t1,
            test2_score: t2,
            exam_score: ex,
            assessment_type: 'terminal',
            assessment_name: assessmentName,
            assessment_date: today,
            max_score: 100,
            obtained_score: total,
            grade: gradeFor(total),
            teacher_id: user?.id,
          };
        })
        .filter(Boolean) as any[];

      if (rows.length === 0) {
        toast({ title: 'Nothing to save', description: 'Enter at least one score.' });
        return;
      }

      const { error } = await supabase
        .from('gradebook_entries')
        .upsert(rows, { onConflict: 'student_id,subject_id,class_id,session_id,term' });
      if (error) throw error;
      toast({ title: 'Saved', description: `${rows.length} score row(s) saved.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enter Test 1, Test 2 & Exam Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.session_name}{s.is_current ? ' (current)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Select a class, subject, term and session to begin.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-center w-32">Test 1 (/20)</TableHead>
                    <TableHead className="text-center w-32">Test 2 (/20)</TableHead>
                    <TableHead className="text-center w-32">Exam (/60)</TableHead>
                    <TableHead className="text-center w-24">Total</TableHead>
                    <TableHead className="text-center w-20">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(st => {
                    const row = scores[st.student_id] || { test1: '', test2: '', exam: '' };
                    const total = clamp(row.test1, 20) + clamp(row.test2, 20) + clamp(row.exam, 60);
                    return (
                      <TableRow key={st.student_id}>
                        <TableCell className="font-medium">{st.full_name}</TableCell>
                        <TableCell><Input type="number" min={0} max={20} value={row.test1}
                          onChange={e => setScore(st.student_id, 'test1', e.target.value)} /></TableCell>
                        <TableCell><Input type="number" min={0} max={20} value={row.test2}
                          onChange={e => setScore(st.student_id, 'test2', e.target.value)} /></TableCell>
                        <TableCell><Input type="number" min={0} max={60} value={row.exam}
                          onChange={e => setScore(st.student_id, 'exam', e.target.value)} /></TableCell>
                        <TableCell className="text-center font-semibold">{total || ''}</TableCell>
                        <TableCell className="text-center">{total ? gradeFor(total) : ''}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end p-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Scores
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualScoresEntry;