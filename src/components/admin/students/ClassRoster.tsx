import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, SlidersHorizontal, UserPlus, Download, Search, X,
  MoreVertical, Eye, Pencil, Archive, Loader2,
} from 'lucide-react';
import { EditStudentDialog } from '@/components/admin/EditStudentDialog';

export interface RosterProps {
  levelId: string;
  levelName: string;
  onBack: () => void;
}

interface Campus { id: string; name: string; code: string }
interface Arm { id: string; code: string; offering_id: string; legacy_class_id: string | null }
interface Offering { id: string; campus_id: string; class_level_id: string }

interface Row {
  id: string; user_id: string | null; admission_number: string | null;
  gender: string | null; date_of_birth: string | null; status: string | null;
  photo_url: string | null; is_boarder: boolean | null; admission_date: string | null;
  full_name: string | null; campus_name: string | null; class_name: string | null;
  arm_code: string | null; student_type: string | null; legacy_class_id: string | null;
}

const ALL = 'all';
const PAGE = 50;

const initials = (n?: string | null) =>
  (n || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export const ClassRoster: React.FC<RosterProps> = ({ levelId, levelName, onBack }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    campus: ALL, gender: ALL, arm: ALL, boarding: ALL,
    studentType: ALL, status: 'active', admissionYear: ALL,
  });
  const [draft, setDraft] = useState(filters);

  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '', email: '', password: '', admissionNumber: '',
    gender: '', campusId: '', armId: '', boarding: 'day',
  });

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Row | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    (async () => {
      const [c, o, a] = await Promise.all([
        supabase.from('campuses').select('id, name, code').eq('is_active', true).order('name'),
        supabase.from('campus_class_offerings').select('id, campus_id, class_level_id').eq('class_level_id', levelId),
        supabase.from('arms').select('id, code, offering_id, legacy_class_id').eq('is_active', true),
      ]);
      setCampuses((c.data as any) || []);
      setOfferings((o.data as any) || []);
      const offIds = ((o.data as any[]) || []).map(x => x.id);
      setArms((((a.data as any[]) || []).filter(x => offIds.includes(x.offering_id))) as any);
    })();
  }, [levelId]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('list_students_filtered', {
        p_class_level_id: levelId,
        p_campus_id: filters.campus === ALL ? null : filters.campus,
        p_arm_id: filters.arm === ALL ? null : filters.arm,
        p_gender: filters.gender === ALL ? null : filters.gender,
        p_boarding: filters.boarding === ALL ? null : filters.boarding,
        p_student_type: filters.studentType === ALL ? null : filters.studentType,
        p_status: filters.status === ALL ? null : filters.status,
        p_search: debounced || null,
        p_admission_year: filters.admissionYear === ALL ? null : Number(filters.admissionYear),
        p_limit: PAGE,
        p_offset: page * PAGE,
      });
      if (error) throw error;
      setRows((data?.rows as Row[]) || []);
      setTotal(data?.total || 0);
    } catch (e: any) {
      toast({ title: 'Could not load students', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [levelId, filters, debounced, page, toast]);

  useEffect(() => { void fetchRows(); }, [fetchRows]);

  const activeChips = useMemo(() => {
    const chips: { key: keyof typeof filters; label: string }[] = [];
    if (filters.campus !== ALL) chips.push({ key: 'campus', label: campuses.find(c => c.id === filters.campus)?.name || 'Campus' });
    if (filters.gender !== ALL) chips.push({ key: 'gender', label: filters.gender === 'male' ? 'Male' : 'Female' });
    if (filters.arm !== ALL) chips.push({ key: 'arm', label: `Arm ${arms.find(a => a.id === filters.arm)?.code || ''}` });
    if (filters.boarding !== ALL) chips.push({ key: 'boarding', label: filters.boarding === 'boarding' ? 'Boarding' : 'Day' });
    if (filters.studentType !== ALL) chips.push({ key: 'studentType', label: filters.studentType === 'new' ? 'New' : 'Returning' });
    if (filters.status !== 'active') chips.push({ key: 'status', label: filters.status === ALL ? 'Any status' : filters.status });
    if (filters.admissionYear !== ALL) chips.push({ key: 'admissionYear', label: `Admitted ${filters.admissionYear}` });
    return chips;
  }, [filters, campuses, arms]);

  const clearChip = (key: keyof typeof filters) => {
    const next = { ...filters, [key]: key === 'status' ? 'active' : ALL };
    setFilters(next); setDraft(next); setPage(0);
  };

  const exportCsv = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('list_students_filtered', {
        p_class_level_id: levelId,
        p_campus_id: filters.campus === ALL ? null : filters.campus,
        p_arm_id: filters.arm === ALL ? null : filters.arm,
        p_gender: filters.gender === ALL ? null : filters.gender,
        p_boarding: filters.boarding === ALL ? null : filters.boarding,
        p_student_type: filters.studentType === ALL ? null : filters.studentType,
        p_status: filters.status === ALL ? null : filters.status,
        p_search: debounced || null,
        p_admission_year: filters.admissionYear === ALL ? null : Number(filters.admissionYear),
        p_limit: 5000, p_offset: 0,
      });
      if (error) throw error;
      const all = (data?.rows as Row[]) || [];
      if (!all.length) { toast({ title: 'Nothing to export' }); return; }
      const header = ['S/N', 'Admission #', 'Full Name', 'Gender', 'Campus', 'Class', 'Arm', 'Student Type', 'Boarding', 'Status', 'Date of Birth', 'Admission Date'];
      const lines = [header, ...all.map((r, i) => [
        String(i + 1), r.admission_number || '', r.full_name || '', r.gender || '',
        r.campus_name || '', r.class_name || levelName, r.arm_code || '',
        r.student_type || '', r.is_boarder ? 'Boarding' : 'Day', r.status || '',
        r.date_of_birth || '', r.admission_date || '',
      ])];
      const csv = lines.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${levelName.replace(/\s+/g, '-')}-students-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    }
  };

  const campusArms = arms.filter(a => {
    if (!addForm.campusId) return true;
    const off = offerings.find(o => o.id === a.offering_id);
    return off?.campus_id === addForm.campusId;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fullName || !addForm.email || !addForm.password || !addForm.gender || !addForm.campusId) {
      toast({ title: 'Missing details', description: 'Name, email, password, gender and campus are required.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const arm = arms.find(a => a.id === addForm.armId);
      const legacyClassId = arm?.legacy_class_id
        || (await supabase.from('class_structure_map')
              .select('legacy_class_id')
              .eq('campus_code', campuses.find(c => c.id === addForm.campusId)?.code || 'MAIN')
              .eq('level_name', levelName)
              .maybeSingle()).data?.legacy_class_id
        || null;

      const { data, error } = await supabase.functions.invoke('create-student', {
        body: {
          fullName: addForm.fullName,
          email: addForm.email,
          password: addForm.password,
          classId: legacyClassId || undefined,
          admissionNumber: addForm.admissionNumber || undefined,
        },
      });
      if (error) throw error;
      const newUserId = (data as any)?.user?.id;
      if (newUserId) {
        const { data: stu } = await supabase.from('students')
          .select('id').eq('user_id', newUserId).maybeSingle();
        if (stu?.id) {
          await supabase.from('students').update({
            gender: addForm.gender,
            is_boarder: addForm.boarding === 'boarding',
          } as any).eq('id', stu.id);
          await supabase.from('student_enrollments').insert({
            student_id: stu.id,
            campus_id: addForm.campusId,
            class_level_id: levelId,
            arm_id: addForm.armId || null,
            legacy_class_id: legacyClassId,
            student_type: 'new',
            boarding: addForm.boarding,
            status: 'active',
          } as any);
          await supabase.from('student_movement_log').insert({
            student_id: stu.id, event_type: 'student_created',
            details: { class: levelName, arm: arm?.code || null },
          } as any);
        }
      }
      toast({ title: 'Student added', description: addForm.fullName });
      setAddOpen(false);
      setAddForm({ fullName: '', email: '', password: '', admissionNumber: '', gender: '', campusId: '', armId: '', boarding: 'day' });
      await fetchRows();
    } catch (e: any) {
      toast({ title: 'Could not add student', description: e.message, variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('students').update({
        archived_at: new Date().toISOString(),
        archived_reason: archiveReason.trim() || 'Archived by admin',
        status: 'archived',
      } as any).eq('id', archiveTarget.id);
      if (error) throw error;
      await supabase.from('student_movement_log').insert({
        student_id: archiveTarget.id, event_type: 'status_change',
        details: { to: 'archived', reason: archiveReason || null },
      } as any);
      toast({ title: 'Student archived' });
      setArchiveTarget(null); setArchiveReason('');
      await fetchRows();
    } catch (e: any) {
      toast({ title: 'Archive failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold">{levelName}</h2>
            <p className="text-sm text-muted-foreground">{total} student{total === 1 ? '' : 's'} match the current view</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setDraft(filters); setFilterOpen(true); }}>
            <SlidersHorizontal className="h-4 w-4 mr-2" /> Filter
          </Button>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Add student</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name or student ID"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChips.map(c => (
            <Badge key={c.key} variant="secondary" className="gap-1 capitalize">
              {c.label}
              <button onClick={() => clearChip(c.key)} aria-label={`Remove ${c.label}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No students match this view. Try clearing filters or add a student.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead>Arm</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Boarding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={r.photo_url || ''} alt={r.full_name || 'Student'} />
                            <AvatarFallback>{initials(r.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{r.full_name || 'Unnamed student'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.admission_number || '—'}</TableCell>
                      <TableCell className="capitalize">
                        {r.gender || <Badge variant="destructive" className="text-xs">missing</Badge>}
                      </TableCell>
                      <TableCell>{r.campus_name || '—'}</TableCell>
                      <TableCell>{r.arm_code || '—'}</TableCell>
                      <TableCell className="capitalize">{r.student_type || '—'}</TableCell>
                      <TableCell>{r.is_boarder ? 'Boarding' : 'Day'}</TableCell>
                      <TableCell><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/dashboard?tab=academic&subtab=student-detail&id=${r.user_id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View profile
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!r.user_id} onClick={() => setEditUserId(r.user_id)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setArchiveTarget(r)}>
                              <Archive className="h-4 w-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > PAGE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter students</SheetTitle>
            <SheetDescription>Filters combine — e.g. Annex + Female + Boarding.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Campus</Label>
              <Select value={draft.campus} onValueChange={v => setDraft({ ...draft, campus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All campuses</SelectItem>
                  {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={draft.gender} onValueChange={v => setDraft({ ...draft, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arm</Label>
              <Select value={draft.arm} onValueChange={v => setDraft({ ...draft, arm: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All arms</SelectItem>
                  {arms.map(a => <SelectItem key={a.id} value={a.id}>Arm {a.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Boarding</Label>
              <Select value={draft.boarding} onValueChange={v => setDraft({ ...draft, boarding: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="boarding">Boarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student type</Label>
              <Select value={draft.studentType} onValueChange={v => setDraft({ ...draft, studentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="returning">Returning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Admission year</Label>
              <Select value={draft.admissionYear} onValueChange={v => setDraft({ ...draft, admissionYear: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any year</SelectItem>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              const reset = { campus: ALL, gender: ALL, arm: ALL, boarding: ALL, studentType: ALL, status: 'active', admissionYear: ALL };
              setDraft(reset); setFilters(reset); setPage(0); setFilterOpen(false);
            }}>Reset</Button>
            <Button onClick={() => { setFilters(draft); setPage(0); setFilterOpen(false); }}>Apply filters</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add student */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add student to {levelName}</DialogTitle>
            <DialogDescription>Campus decides which arms are available. Gender is required.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div><Label>Full name</Label><Input value={addForm.fullName} onChange={e => setAddForm({ ...addForm, fullName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="text" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Student ID (optional)</Label><Input value={addForm.admissionNumber} onChange={e => setAddForm({ ...addForm, admissionNumber: e.target.value })} /></div>
              <div>
                <Label>Gender</Label>
                <Select value={addForm.gender} onValueChange={v => setAddForm({ ...addForm, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Campus</Label>
                <Select value={addForm.campusId} onValueChange={v => setAddForm({ ...addForm, campusId: v, armId: '' })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Arm</Label>
                <Select value={addForm.armId || 'none'} onValueChange={v => setAddForm({ ...addForm, armId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Not applicable" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not applicable</SelectItem>
                    {campusArms.map(a => <SelectItem key={a.id} value={a.id}>Arm {a.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Boarding</Label>
              <Select value={addForm.boarding} onValueChange={v => setAddForm({ ...addForm, boarding: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="boarding">Boarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : 'Add student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {editUserId && (
        <EditStudentDialog
          open={!!editUserId}
          onOpenChange={o => !o && setEditUserId(null)}
          userId={editUserId}
          onSaved={fetchRows}
        />
      )}

      <AlertDialog open={!!archiveTarget} onOpenChange={o => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archiveTarget?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They move to Past Students and drop out of active lists. Their records are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder="Reason (optional)" value={archiveReason} onChange={e => setArchiveReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassRoster;
