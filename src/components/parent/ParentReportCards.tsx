import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Pub {
  id: string;
  student_id: string;
  class_id: string;
  session_id: string;
  term: string;
  published_at: string;
  student_name: string;
  class_name: string;
  session_name: string;
}

export const ParentReportCards: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
      if (!parent) { setLoading(false); return; }
      const { data: rels } = await supabase.from('student_parent_relationships').select('student_id').eq('parent_id', parent.id);
      const ids = (rels || []).map((r: any) => r.student_id);
      if (!ids.length) { setLoading(false); return; }

      const { data: pubs } = await supabase
        .from('report_card_publications')
        .select('*')
        .in('student_id', ids)
        .order('published_at', { ascending: false });

      const studentIds = Array.from(new Set((pubs || []).map((p: any) => p.student_id)));
      const classIds = Array.from(new Set((pubs || []).map((p: any) => p.class_id)));
      const sessionIds = Array.from(new Set((pubs || []).map((p: any) => p.session_id)));

      const [studs, classes, sessions] = await Promise.all([
        studentIds.length ? supabase.from('students').select('id,user_id').in('id', studentIds) : Promise.resolve({ data: [] as any }),
        classIds.length ? supabase.from('classes').select('id,name').in('id', classIds) : Promise.resolve({ data: [] as any }),
        sessionIds.length ? supabase.from('admission_sessions').select('id,session_name').in('id', sessionIds) : Promise.resolve({ data: [] as any }),
      ]);

      const uids = (studs.data || []).map((s: any) => s.user_id);
      const { data: profs } = uids.length
        ? await supabase.from('profiles').select('user_id,full_name').in('user_id', uids)
        : { data: [] as any };

      const nameByStudent = new Map<string, string>();
      (studs.data || []).forEach((s: any) => {
        const n = (profs || []).find((p: any) => p.user_id === s.user_id)?.full_name || '—';
        nameByStudent.set(s.id, n);
      });
      const classMap = new Map((classes.data || []).map((c: any) => [c.id, c.name]));
      const sessMap = new Map((sessions.data || []).map((s: any) => [s.id, s.session_name]));

      setRows((pubs || []).map((p: any) => ({
        id: p.id,
        student_id: p.student_id,
        class_id: p.class_id,
        session_id: p.session_id,
        term: p.term,
        published_at: p.published_at,
        student_name: nameByStudent.get(p.student_id) || '—',
        class_name: classMap.get(p.class_id) || '—',
        session_name: sessMap.get(p.session_id) || '—',
      })));
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Published Report Cards</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            No report cards have been published yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell>{r.class_name}</TableCell>
                  <TableCell>{r.session_name}</TableCell>
                  <TableCell>{r.term}</TableCell>
                  <TableCell>{new Date(r.published_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ParentReportCards;