import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChildren } from '@/contexts/ChildContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format, isPast } from 'date-fns';

export const ParentAssignments: React.FC = () => {
  const { selectedChild } = useChildren();
  const [rows, setRows] = useState<any[]>([]);
  const [subs, setSubs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!selectedChild) return;
      setLoading(true);
      const { data: asgs } = await supabase
        .from('assignments').select('*, subjects(name)')
        .eq('is_published', true).eq('class_id', selectedChild.class_id!)
        .order('due_date', { ascending: true });
      setRows((asgs as any) || []);
      const { data: mySubs } = await supabase.from('assignment_submissions').select('*').eq('student_id', selectedChild.student_id);
      const map: Record<string, any> = {};
      (mySubs || []).forEach((s: any) => { map[s.assignment_id] = s; });
      setSubs(map);
      setLoading(false);
    })();
  }, [selectedChild?.student_id]);

  if (!selectedChild) return <Card><CardContent className="p-6 text-center text-muted-foreground">Select a child.</CardContent></Card>;
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (rows.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">No assignments.</CardContent></Card>;

  return (
    <div className="space-y-3">
      {rows.map(a => {
        const sub = subs[a.id];
        const overdue = a.due_date && isPast(new Date(a.due_date)) && !sub;
        return (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{a.title}</h3>
                {sub?.graded_at ? <Badge>Graded {sub.score}{a.max_score ? `/${a.max_score}` : ''}</Badge> :
                  sub ? <Badge variant="secondary">Submitted</Badge> :
                  overdue ? <Badge variant="destructive">Overdue</Badge> : <Badge variant="outline">Pending</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {a.subjects?.name} {a.due_date && `• Due ${format(new Date(a.due_date), 'PP')}`}
              </p>
              {a.instructions && <p className="text-sm mt-2 line-clamp-2">{a.instructions}</p>}
              {sub?.feedback && <p className="text-sm mt-2 italic text-muted-foreground">Teacher: {sub.feedback}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};