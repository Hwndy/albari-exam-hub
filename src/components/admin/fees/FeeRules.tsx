import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Search, AlertTriangle } from 'lucide-react';
import {
  NGN, TERMS, FREQUENCIES, STUDENT_TYPES, STUDENT_CATEGORIES, labelFor,
  fetchAcademicYears, fetchCurrentAcademicYear,
} from '@/lib/fees';

interface Rule {
  id: string; fee_id: string; academic_year: string; amount: number;
  student_type: string; student_category: string; class_ids: string[] | null;
  genders: string[] | null; campus_ids: string[] | null;
  requirement_type: string; frequency: string; terms: string[]; due_date: string | null;
  is_active: boolean; notes: string | null;
  fees?: { name: string; category_id: string | null } | null;
}
interface Klass { id: string; name: string }
interface Category { id: string; name: string }
interface Campus { id: string; name: string }

const emptyForm = {
  fee_name: '', category_id: '', amount: '', student_type: 'both', student_category: 'both',
  scope: 'ALL' as 'ALL' | 'SELECTED', class_ids: [] as string[],
  gender: 'all', campus_ids: [] as string[],
  requirement_type: 'compulsory', frequency: 'termly', terms: ['First', 'Second', 'Third'] as string[],
  due_date: '', is_active: true,
};

export const FeeRules: React.FC = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Rule | null>(null);
  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);

  const load = async (y?: string) => {
    setLoading(true);
    const activeYear = y || year || (await fetchCurrentAcademicYear());
    if (!year) setYear(activeYear);
    const [{ data: r }, { data: cls }, { data: cat }, { data: camp }, ys] = await Promise.all([
      supabase.from('fee_rules').select('*, fees(name, category_id)').eq('academic_year', activeYear).order('created_at'),
      supabase.from('classes').select('id, name').order('name'),
      supabase.from('fee_categories').select('id, name').order('name'),
      supabase.from('campuses').select('id, name').eq('is_active', true).order('name'),
      fetchAcademicYears(),
    ]);
    setRules((r || []) as any);
    setClasses((cls || []) as Klass[]);
    setCategories((cat || []) as Category[]);
    setCampuses((camp || []) as Campus[]);
    setYears(ys.length ? ys : [activeYear]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, class_ids: [], campus_ids: [] }); setOpen(true); };
  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({
      fee_name: r.fees?.name || '', category_id: r.fees?.category_id || '', amount: String(r.amount),
      student_type: r.student_type, student_category: r.student_category,
      scope: (r.class_ids?.length ? 'SELECTED' : 'ALL'), class_ids: r.class_ids || [],
      gender: r.genders?.length === 1 ? r.genders[0] : 'all',
      campus_ids: r.campus_ids || [],
      requirement_type: r.requirement_type, frequency: r.frequency, terms: r.terms || [],
      due_date: r.due_date || '', is_active: r.is_active,
    });
    setOpen(true);
  };

  const toggle = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const save = async () => {
    if (!form.fee_name.trim() || !form.amount) { toast({ title: 'Fee name and amount are required', variant: 'destructive' }); return; }
    if (!form.terms.length) { toast({ title: 'Choose at least one term', variant: 'destructive' }); return; }
    if (form.scope === 'SELECTED' && !form.class_ids.length) { toast({ title: 'Choose at least one class', variant: 'destructive' }); return; }
    setSaving(true);
    const name = form.fee_name.trim();
    let feeId = editing?.fee_id;
    const { data: existing } = await supabase.from('fees').select('id').eq('name', name).maybeSingle();
    if (existing) {
      feeId = existing.id;
      if (form.category_id) await supabase.from('fees').update({ category_id: form.category_id }).eq('id', existing.id);
    } else {
      const { data: created, error } = await supabase.from('fees')
        .insert({ name, category_id: form.category_id || null }).select('id').maybeSingle();
      if (error || !created) { setSaving(false); toast({ title: 'Could not save the fee', description: error?.message, variant: 'destructive' }); return; }
      feeId = created.id;
    }
    const payload = {
      fee_id: feeId!, academic_year: year, amount: Number(form.amount),
      student_type: form.student_type, student_category: form.student_category,
      class_ids: form.scope === 'ALL' ? [] : form.class_ids,
      genders: form.gender === 'all' ? null : [form.gender],
      campus_ids: form.campus_ids.length ? form.campus_ids : null,
      requirement_type: form.requirement_type, frequency: form.frequency,
      terms: form.frequency === 'termly' ? form.terms : [form.terms[0] || 'First'],
      due_date: form.due_date || null, is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from('fee_rules').update(payload).eq('id', editing.id)
      : await supabase.from('fee_rules').insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing ? 'Fee rule updated' : 'Fee rule created' });
    setOpen(false); load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    const { data: setting } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'finance_delete_code').maybeSingle();
    const expected = String((setting as any)?.setting_value ?? '4250645').replace(/"/g, '');
    if (code.trim() !== expected) {
      setWorking(false);
      toast({ title: 'Wrong access code', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('fee_rules').delete().eq('id', deleting.id);
    setWorking(false);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Fee rule deleted', description: 'Bills already issued are unchanged.' });
    setDeleting(null); setCode(''); load();
  };

  const setActive = async (r: Rule, v: boolean) => {
    await supabase.from('fee_rules').update({ is_active: v }).eq('id', r.id);
    setRules(rs => rs.map(x => x.id === r.id ? { ...x, is_active: v } : x));
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rules.filter(r => !t || (r.fees?.name || '').toLowerCase().includes(t));
  }, [rules, q]);

  // Two active rules for the same fee, term and overlapping audience will double-charge.
  const conflicts = useMemo(() => {
    const seen = new Map<string, number>();
    rules.filter(r => r.is_active).forEach(r => {
      (r.terms || []).forEach(term => {
        const key = [r.fee_id, term, r.student_type, r.student_category, (r.class_ids || []).slice().sort().join('|')].join('::');
        seen.set(key, (seen.get(key) || 0) + 1);
      });
    });
    return [...seen.values()].filter(v => v > 1).length;
  }, [rules]);

  const className = (id: string) => classes.find(c => c.id === id)?.name || '—';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Fee Rules</CardTitle>
            <CardDescription>One list of charges. Each rule decides who pays it.</CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />New fee rule</Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search fees" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={year} onValueChange={v => { setYear(v); load(v); }}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Session" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {conflicts > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
            <span>{conflicts} set(s) of rules charge the same fee to the same students in the same term. Retire the duplicates so nobody is billed twice.</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin h-6 w-6" /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fee</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead>Applies to</TableHead><TableHead>Classes</TableHead>
                <TableHead>Terms</TableHead><TableHead>Type</TableHead>
                <TableHead>Active</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className={r.is_active ? undefined : 'opacity-60'}>
                    <TableCell className="font-medium">{r.fees?.name}</TableCell>
                    <TableCell className="text-right">{NGN(Number(r.amount))}</TableCell>
                    <TableCell className="text-xs">
                      <div>{labelFor(STUDENT_TYPES, r.student_type)}</div>
                      <div className="text-muted-foreground">{labelFor(STUDENT_CATEGORIES, r.student_category)}</div>
                      {r.genders?.length === 1 && (
                        <Badge variant="secondary" className="mt-1 capitalize">{r.genders[0]} only</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[220px]">
                      {!r.class_ids?.length ? <Badge variant="outline">All classes</Badge>
                        : r.class_ids.length <= 3 ? r.class_ids.map(className).join(', ')
                        : `${r.class_ids.length} classes`}
                      {r.campus_ids?.length ? (
                        <div className="text-muted-foreground mt-1">
                          {r.campus_ids.map(id => campuses.find(c => c.id === id)?.name || '—').join(', ')}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(r.terms || []).join(', ')}
                      <div className="text-muted-foreground">{labelFor(FREQUENCIES, r.frequency)}</div>
                    </TableCell>
                    <TableCell>
                      {r.requirement_type === 'compulsory'
                        ? <Badge>Compulsory</Badge>
                        : <Badge variant="outline">Optional</Badge>}
                    </TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={v => setActive(r, v)} /></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { setCode(''); setDeleting(r); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No fee rules for this session yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit fee rule' : 'New fee rule'}</DialogTitle>
            <DialogDescription>Session {year}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fee name *</Label>
                <Input list="fee-name-options" value={form.fee_name} onChange={e => setForm({ ...form, fee_name: e.target.value })} placeholder="Tuition, Boarding, School Bus…" />
                <datalist id="fee-name-options">
                  {[...new Set(rules.map(r => r.fees?.name).filter(Boolean))].map(n => <option key={n} value={n!} />)}
                </datalist>
              </div>
              <div><Label>Amount (₦) *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category_id || 'none'} onValueChange={v => setForm({ ...form, category_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorised</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Who pays</Label>
                <Select value={form.student_type} onValueChange={v => setForm({ ...form, student_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STUDENT_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Day or boarding</Label>
                <Select value={form.student_category} onValueChange={v => setForm({ ...form, student_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STUDENT_CATEGORIES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Boys or girls</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Both</SelectItem>
                    <SelectItem value="male">Boys only</SelectItem>
                    <SelectItem value="female">Girls only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Campuses</Label>
                <div className="rounded-md border p-2 space-y-1 max-h-28 overflow-y-auto">
                  {campuses.length === 0 && <p className="text-xs text-muted-foreground">No campuses yet</p>}
                  {campuses.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.campus_ids.includes(c.id)}
                        onCheckedChange={() => setForm((f: any) => ({ ...f, campus_ids: toggle(f.campus_ids, c.id) }))}
                      /> {c.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {form.campus_ids.length ? 'Only the ticked campuses pay this.' : 'Leave empty for every campus.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Compulsory or optional</Label>
                <Select value={form.requirement_type} onValueChange={v => setForm({ ...form, requirement_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compulsory">Compulsory</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>How often</Label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{form.frequency === 'termly' ? 'Charged in these terms' : 'Charged in'}</Label>
              <div className="flex gap-4 pt-2">
                {TERMS.map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.terms.includes(t)}
                      onCheckedChange={() => setForm((f: any) => ({
                        ...f,
                        terms: f.frequency === 'termly' ? toggle(f.terms, t) : [t],
                      }))}
                    /> {t} term
                  </label>
                ))}
              </div>
              {form.frequency !== 'termly' && (
                <p className="text-xs text-muted-foreground pt-1">
                  {form.frequency === 'annual' ? 'Charged once this session, in the term you tick.' : 'Charged once ever, in the term you tick.'}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Classes</Label>
              <Select value={form.scope} onValueChange={v => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All classes</SelectItem>
                  <SelectItem value="SELECTED">Selected classes</SelectItem>
                </SelectContent>
              </Select>
              {form.scope === 'SELECTED' && (
                <div className="rounded-md border p-3 max-h-48 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-muted-foreground">{form.class_ids.length} selected</span>
                    <Button type="button" size="sm" variant="ghost"
                      onClick={() => setForm((f: any) => ({ ...f, class_ids: f.class_ids.length === classes.length ? [] : classes.map(c => c.id) }))}>
                      {form.class_ids.length === classes.length ? 'Clear all' : 'Select all'}
                    </Button>
                  </div>
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.class_ids.includes(c.id)} onCheckedChange={() => setForm((f: any) => ({ ...f, class_ids: toggle(f.class_ids, c.id) }))} /> {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2"><Checkbox checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: !!v })} /> Active</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete fee rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              “{deleting?.fees?.name}” will no longer be charged. Bills already issued keep their lines and receipts.
            </p>
            <div><Label>Finance access code</Label>
              <Input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter access code" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={working || !code.trim()}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
