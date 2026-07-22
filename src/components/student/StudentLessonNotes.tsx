import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen } from 'lucide-react';

export const StudentLessonNotes: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ classes: Record<string, string>; subjects: Record<string, string> }>({ classes: {}, subjects: {} });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lesson_notes').select('*').eq('is_published', true).order('created_at', { ascending: false });
      setRows((data as any) || []);
      const clsIds = Array.from(new Set((data || []).map((r: any) => r.class_id)));
      const subIds = Array.from(new Set((data || []).map((r: any) => r.subject_id).filter(Boolean)));
      const [{ data: cls }, { data: sub }] = await Promise.all([
        clsIds.length ? supabase.from('classes').select('id,name').in('id', clsIds) : Promise.resolve({ data: [] as any }),
        subIds.length ? supabase.from('subjects').select('id,name').in('id', subIds) : Promise.resolve({ data: [] as any }),
      ]);
      const cm: Record<string, string> = {}, sm: Record<string, string> = {};
      (cls || []).forEach((c: any) => { cm[c.id] = c.name; });
      (sub || []).forEach((s: any) => { sm[s.id] = s.name; });
      setMeta({ classes: cm, subjects: sm });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (rows.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">No lesson notes yet.</CardContent></Card>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Lesson Notes</h2>
      <div className="grid gap-3">
        {rows.map(n => (
          <Card key={n.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{n.title}</h3>
                {n.week_number && <Badge variant="outline">Week {n.week_number}</Badge>}
                {n.term && <Badge variant="outline">{n.term} term</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {meta.classes[n.class_id]} {n.subject_id && `• ${meta.subjects[n.subject_id]}`}
              </p>
              {n.content && <p className="text-sm mt-3 whitespace-pre-wrap">{n.content}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};