import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChildren } from '@/contexts/ChildContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen } from 'lucide-react';

export const ParentLessonNotes: React.FC = () => {
  const { selectedChild } = useChildren();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!selectedChild?.class_id) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase.from('lesson_notes')
        .select('*, subjects(name)')
        .eq('is_published', true).eq('class_id', selectedChild.class_id)
        .order('created_at', { ascending: false });
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, [selectedChild?.class_id]);

  if (!selectedChild) return <Card><CardContent className="p-6 text-center text-muted-foreground">Select a child.</CardContent></Card>;
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;
  if (rows.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">No lesson notes.</CardContent></Card>;

  return (
    <div className="space-y-3">
      {rows.map(n => (
        <Card key={n.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{n.title}</h3>
              {n.week_number && <Badge variant="outline">Week {n.week_number}</Badge>}
              {n.term && <Badge variant="outline">{n.term} term</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{n.subjects?.name}</p>
            {n.content && <p className="text-sm mt-3 whitespace-pre-wrap line-clamp-6">{n.content}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};