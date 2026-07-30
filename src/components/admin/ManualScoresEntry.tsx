import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTeacherScope } from '@/hooks/useTeacherScope';
import { fetchClassRoster, RosterStudent } from '@/lib/class-roster';
import { format } from 'date-fns';

interface ScoreRow { test1: string; test2: string; exam: string }

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

const EMPTY: ScoreRow = { test1: '', test2: '', exam: '' };

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
  const { classes, subjects, unscoped, loading: scopeLoading } = useTeacherScope();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [term, setTerm] = useState('First Term');
  const [sessionId, setSessionId] = useState('');

  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('admission_sessions')
        .select('id, session_name, academic_year, is_current')
        .order('start_date', { ascending: false });
      const list = (data || []) as AcademicSession[];
      setSessions(list);
      const cur = list.find(x => x.is_current) || list[0];
      if (cur) setSessionId(cur.id);
    })();
  }, []);

  useEffect(() => {
    if (classId && subjectId && sessionId && term) loadStudentsAndScores();
    else { setStudents([]); setScores({}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, sessionId, term]);

  const loadStudentsAndScores = async () => {
    const id = ++requestId.current;
    setLoading(true);
    setTouched(false);
    try {
      const roster = await fetchClassRoster(classId);
      if (id !== requestId.current) return;
      setStudents(roster);

      const map: Record<string, ScoreRow> = {};
      roster.forEach(r => { map[r.student_id] = { ...EMPTY }; });

      if (roster.length) {
        const { data: existing, error } = await supabase
          .from('gradebook_entries')
          .select('student_id, test1_score, test2_score, exam_score')
          .in('student_id', roster.map(r => r.student_id))
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
          .eq('session_id', sessionId)
          .eq('term', TERM_VALUES[term]);
        if (error) throw error;
        (existing || []).forEach((e: any) => {
          map[e.student_id] = {
            test1: e.test1_score != null ? String(e.test1_score) : '',
            test2: e.test2_score != null ? String(e.test2_score) : '',
            exam: e.exam_score != null ? String(e.exam_score) : '',
          };
        });
      }
      if (id !== requestId.current) return;
      setScores(map);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to load students', variant: 'destructive' });
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const setScore = (id: string, field: keyof ScoreRow, v: string) => {
    setTouched(true);
    setScores(s => ({ ...s, [id]: { ...(s[id] || EMPTY), [field]: v } }));
  };

  const clamp = (v: string, max: number) => {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(max, n));
  };

  const overMax = (v: string, max: number) => {
    const n = parseFloat(v);
    return !Number.isNaN(n) && (n > max || n < 0);
  };

  const academicYear = useMemo(
    () => sessions.find(s => s.id === sessionId)?.academic_year || '',
    [sessions, sessionId]
  );

  const enteredCount = useMemo(
    () => students.filter(st => {
      const r = scores[st.student_id] || EMPTY;
      return r.test1 !== '' || r.test2 !== '' || r.exam !== '';
    }).length,
    [students, scores]
  );

  const hasInvalid = useMemo(
    () => students.some(st => {
      const r = scores[st.student_id] || EMPTY;
      return overMax(r.test1, 20) || overMax(r.test2, 20) || overMax(r.exam, 60);
    }),
    [students, scores]
  );

  const handleSave = async () => {
    if (hasInvalid) {
      toast({
        title: 'Check the scores',
        description: 'Test 1 and Test 2 must be 0–20 and the exam 0–60.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const termVal = TERM_VALUES[term];
      const assessmentName = `${term} - ${sessions.find(s => s.id === sessionId)?.session_name || ''} (Manual)`;
      const today = format(new Date(), 'yyyy-MM-dd');

      const rows = students
        .map(st => {
          const row = scores[st.student_id] || EMPTY;
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
      setTouched(false);
      toast({
        title: 'Scores saved',
        description: `${rows.length} of ${students.length} student(s) recorded for ${term}.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filtersComplete = Boolean(classId && subjectId && sessionId && term);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enter Test 1, Test 2 &amp; Exam Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId} disabled={scopeLoading}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={scopeLoading}>
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
          {unscoped && (
            <p className="mt-3 text-xs text-muted-foreground">
              You have no class or subject assignments recorded, so every class and subject is listed.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !filtersComplete ? (
            <div className="py-12 text-center text-muted-foreground">
              Select a class, subject, term and session to begin.
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-1">
              <Users className="h-6 w-6 mx-auto opacity-60" />
              <p>No students are assigned to this class yet.</p>
              <p className="text-xs">Add students to the class from Students &rarr; Class list.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {students.length} student{students.length === 1 ? '' : 's'}
                  <Badge variant="secondary">{enteredCount} of {students.length} entered</Badge>
                </div>
                {touched && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
              </div>
              <div className="overflow-x-auto">
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
                      const row = scores[st.student_id] || EMPTY;
                      const total = clamp(row.test1, 20) + clamp(row.test2, 20) + clamp(row.exam, 60);
                      return (
                        <TableRow key={st.student_id}>
                          <TableCell>
                            <div className="font-medium">{st.full_name}</div>
                            {st.admission_number && (
                              <div className="text-xs text-muted-foreground">{st.admission_number}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} max={20} value={row.test1}
                              aria-invalid={overMax(row.test1, 20)}
                              className={overMax(row.test1, 20) ? 'border-destructive' : undefined}
                              onChange={e => setScore(st.student_id, 'test1', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} max={20} value={row.test2}
                              aria-invalid={overMax(row.test2, 20)}
                              className={overMax(row.test2, 20) ? 'border-destructive' : undefined}
                              onChange={e => setScore(st.student_id, 'test2', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} max={60} value={row.exam}
                              aria-invalid={overMax(row.exam, 60)}
                              className={overMax(row.exam, 60) ? 'border-destructive' : undefined}
                              onChange={e => setScore(st.student_id, 'exam', e.target.value)} />
                          </TableCell>
                          <TableCell className="text-center font-semibold">{total || ''}</TableCell>
                          <TableCell className="text-center">{total ? gradeFor(total) : ''}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end p-4 border-t">
                <Button onClick={handleSave} disabled={saving || hasInvalid}>
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
