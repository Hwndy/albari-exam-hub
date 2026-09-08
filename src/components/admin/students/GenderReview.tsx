import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Users } from 'lucide-react';

interface Row {
  id: string;
  user_id: string | null;
  admission_number: string | null;
  full_name: string;
}

export const GenderReview: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, user_id, admission_number, gender')
        .is('archived_at', null)
        .order('admission_number');
      if (error) throw error;

      const missing = (students || []).filter(
        (s: any) => !s.gender || !String(s.gender).trim()
      );
      const userIds = missing.map((s: any) => s.user_id).filter(Boolean);
      const nameByUser = new Map<string, string>();
      for (let i = 0; i < userIds.length; i += 200) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds.slice(i, i + 200));
        (profs || []).forEach((p: any) => nameByUser.set(p.user_id, p.full_name));
      }

      setRows(
        missing.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          admission_number: s.admission_number,
          full_name: (s.user_id && nameByUser.get(s.user_id)) || s.admission_number || 'Unnamed student',
        }))
      );
    } catch (e: any) {
      toast({ title: 'Could not load list', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  const setGender = async (ids: string[], gender: 'male' | 'female') => {
    if (!ids.length) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('students').update({ gender }).in('id', ids);
      if (error) throw error;
      setRows(prev => prev.filter(r => !ids.includes(r.id)));
      setSelected(new Set());
      toast({ title: 'Saved', description: `${ids.length} student${ids.length > 1 ? 's' : ''} updated` });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const visible = rows.filter(r => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.full_name.toLowerCase().includes(q) || (r.admission_number || '').toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Missing gender
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Gender is needed for uniform and Friday wear billing, and for reports.
          </p>
        </div>
        <Badge variant={rows.length ? 'destructive' : 'secondary'}>{rows.length} to fix</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name or admission number"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Button size="sm" disabled={saving} onClick={() => setGender([...selected], 'male')}>
                Set {selected.size} as Male
              </Button>
              <Button size="sm" variant="secondary" disabled={saving} onClick={() => setGender([...selected], 'female')}>
                Set {selected.size} as Female
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {rows.length === 0 ? 'Every student has a gender recorded.' : 'No matches.'}
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Admission #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Set gender</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.admission_number || '—'}</TableCell>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => setGender([r.id], 'male')}>Male</Button>
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => setGender([r.id], 'female')}>Female</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GenderReview;
