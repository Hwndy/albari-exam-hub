import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Note {
  id: string; class_id: string; subject_id: string | null; title: string;
  week_number: number | null; term: string | null; content: string | null;
  is_published: boolean; created_at: string;
}

export const LessonNotesManager: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    class_id: '', subject_id: '', title: '', week_number: '',
    term: 'first', content: '', is_published: true,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('lesson_notes').select('*').order('created_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    (async () => {
      const [{ data: cls }, { data: sub }] = await Promise.all([
        supabase.from('classes').select('id,name').order('name'),
        supabase.from('subjects').select('id,name').order('name'),
      ]);
      setClasses((cls as any) || []); setSubjects((sub as any) || []);
    })();
  }, []);

  const submit = async () => {
    if (!user || !form.class_id || !form.title) { toast.error('Class and title required'); return; }
    setSaving(true);
    const { error } = await supabase.from('lesson_notes').insert({
      class_id: form.class_id,
      subject_id: form.subject_id || null,
      teacher_id: user.id,
      title: form.title,
      week_number: form.week_number ? Number(form.week_number) : null,
      term: form.term || null,
      content: form.content || null,
      is_published: form.is_published,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Lesson note created'); setOpen(false);
      setForm({ class_id: '', subject_id: '', title: '', week_number: '', term: 'first', content: '', is_published: true });
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    const { error } = await supabase.from('lesson_notes').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  const togglePublish = async (n: Note) => {
    await supabase.from('lesson_notes').update({ is_published: !n.is_published }).eq('id', n.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Lesson Notes</h2>
          <p className="text-sm text-muted-foreground">Publish scheme of work and lesson materials.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Note</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Lesson Note</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm(f => ({ ...f, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm(f => ({ ...f, subject_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Week</Label><Input type="number" value={form.week_number} onChange={(e) => setForm(f => ({ ...f, week_number: e.target.value }))} /></div>
                <div><Label>Term</Label>
                  <Select value={form.term} onValueChange={(v) => setForm(f => ({ ...f, term: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">First</SelectItem>
                      <SelectItem value="second">Second</SelectItem>
                      <SelectItem value="third">Third</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Content</Label><Textarea rows={8} value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div> :
        rows.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No lesson notes yet.</CardContent></Card> :
        <div className="grid gap-3">
          {rows.map(n => {
            const cls = classes.find(c => c.id === n.class_id)?.name;
            const sub = subjects.find(s => s.id === n.subject_id)?.name;
            return (
              <Card key={n.id}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">{n.title}</h3>
                      <Badge variant={n.is_published ? 'default' : 'secondary'}>{n.is_published ? 'Published' : 'Draft'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cls} {sub && `• ${sub}`} {n.week_number && `• Week ${n.week_number}`} {n.term && `• ${n.term} term`}
                    </p>
                    {n.content && <p className="text-sm mt-2 line-clamp-3 whitespace-pre-wrap">{n.content}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => togglePublish(n)}>{n.is_published ? 'Unpublish' : 'Publish'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(n.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      }
    </div>
  );
};