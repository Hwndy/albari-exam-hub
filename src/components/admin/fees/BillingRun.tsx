import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Receipt, Eye } from 'lucide-react';
import { NGN, TERMS, fetchAcademicYears, fetchCurrentAcademicYear, fetchStudentDirectory, StudentLite } from '@/lib/fees';

export const BillingRun: React.FC = () => {
  const { toast } = useToast();
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [term, setTerm] = useState<string>('First');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('ALL');
  const [dueDate, setDueDate] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [confirm, setConfirm] = useState(false);

  const [students, setStudents] = useState<StudentLite[]>([]);
  const [studentId, setStudentId] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    (async () => {
      const [ys, cy, { data: cls }, dir] = await Promise.all([
        fetchAcademicYears(), fetchCurrentAcademicYear(),
        supabase.from('classes').select('id, name').order('name'),
        fetchStudentDirectory(),
      ]);
      setYears(ys.length ? ys : [cy]); setYear(cy);
      setClasses((cls || []) as any); setStudents(dir);
    })();
  }, []);

  const runPreview = async (sid: string) => {
    setStudentId(sid); setPreview(null);
    if (!sid) return;
    setPreviewing(true);
    const { data, error } = await supabase.rpc('preview_student_bill', {
      _student_id: sid, _academic_year: year, _term: term,
    } as any);
    setPreviewing(false);
    if (error) { toast({ title: 'Preview failed', description: error.message, variant: 'destructive' }); return; }
    setPreview(data);
  };

  const generate = async () => {
    setRunning(true); setConfirm(false);
    const { data, error } = await supabase.rpc('generate_invoices', {
      _academic_year: year, _term: term,
      _class_id: classId === 'ALL' ? null : classId,
      _due_date: dueDate || null,
    } as any);
    setRunning(false);
    if (error) { toast({ title: 'Could not create bills', description: error.message, variant: 'destructive' }); return; }
    setResult(data);
    toast({ title: 'Bills ready', description: `${(data as any)?.lines_added ?? 0} charge(s) added` });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create term bills</CardTitle>
          <CardDescription>
            Every active student gets the charges that match them — new or returning, day or boarding, and their class.
            Running it again only adds what is missing, so nobody is charged twice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div><Label>Session</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t} term</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Classes</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Payment deadline</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          </div>
          <Button onClick={() => setConfirm(true)} disabled={running || !year}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Receipt className="h-4 w-4 mr-2" />}
            Create bills
          </Button>
          {result && (
            <div className="rounded-md border p-3 text-sm">
              <div>New bills: <strong>{result.invoices_created}</strong></div>
              <div>Bills updated: <strong>{result.invoices_touched}</strong></div>
              <div>Charges added: <strong>{result.lines_added}</strong></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Check one student first</CardTitle>
          <CardDescription>See exactly what a student will be charged before you create bills.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={studentId} onValueChange={runPreview}>
            <SelectTrigger className="w-full sm:w-[360px]"><SelectValue placeholder="Choose a student" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {students.slice(0, 500).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}{s.admission_number ? ` • ${s.admission_number}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {previewing && <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5" /></div>}
          {preview && !previewing && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{preview.student_type === 'new' ? 'New student' : 'Returning student'}</Badge>
                <Badge variant="outline">{preview.student_category === 'boarding' ? 'Boarder' : 'Day student'}</Badge>
                <Badge variant="outline">{preview.term} term • {preview.academic_year}</Badge>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Charge</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...(preview.compulsory || []), ...(preview.optional || [])].map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.fee_name}</TableCell>
                      <TableCell>{i.requirement_type === 'compulsory' ? <Badge>Compulsory</Badge> : <Badge variant="outline">Optional</Badge>}</TableCell>
                      <TableCell className="text-right">{NGN(Number(i.amount))}</TableCell>
                    </TableRow>
                  ))}
                  {!(preview.compulsory || []).length && !(preview.optional || []).length && (
                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Nothing new to charge — this student is already billed for this term.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="text-right font-semibold">Compulsory total: {NGN(Number(preview.total_compulsory || 0))}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create bills for {term} term?</DialogTitle>
            <DialogDescription>
              Bills will be created for {classId === 'ALL' ? 'every class' : classes.find(c => c.id === classId)?.name} in {year}.
              Existing charges stay exactly as they are.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button onClick={generate}>Yes, create bills</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
