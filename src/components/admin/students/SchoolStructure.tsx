import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Building2, RefreshCw, Check, Plus } from 'lucide-react';

interface Campus { id: string; name: string; code: string; address: string | null; phone: string | null; is_active: boolean }
interface MapRow {
  id: string; legacy_class_id: string; legacy_name: string;
  campus_code: string; level_name: string; level_order: number;
  arm_code: string | null; applied_at: string | null;
}
interface LevelRow { id: string; name: string; level_order: number }
interface ArmRow { id: string; code: string; offering_id: string; is_active: boolean }
interface OfferingRow { id: string; campus_id: string; class_level_id: string; is_active: boolean }

export const SchoolStructure: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [rows, setRows] = useState<MapRow[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [arms, setArms] = useState<ArmRow[]>([]);
  const [offerings, setOfferings] = useState<OfferingRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newCampus, setNewCampus] = useState({ name: '', code: '', address: '', phone: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [c, m, l, a, o, ca] = await Promise.all([
        supabase.from('campuses').select('*').order('name'),
        supabase.from('class_structure_map').select('*').order('level_order'),
        supabase.from('class_levels').select('id, name, level_order').order('level_order'),
        supabase.from('arms').select('id, code, offering_id, is_active'),
        supabase.from('campus_class_offerings').select('id, campus_id, class_level_id, is_active'),
        supabase.from('class_assignments').select('class_id'),
      ]);
      setCampuses((c.data as any) || []);
      setRows((m.data as any) || []);
      setLevels((l.data as any) || []);
      setArms((a.data as any) || []);
      setOfferings((o.data as any) || []);
      const tally: Record<string, number> = {};
      ((ca.data as any[]) || []).forEach(r => { tally[r.class_id] = (tally[r.class_id] || 0) + 1; });
      setCounts(tally);
    } catch (e: any) {
      toast({ title: 'Could not load structure', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  const buildProposal = async () => {
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc('build_class_structure_map');
      if (error) throw error;
      toast({ title: 'Proposal ready', description: 'Review each row, then apply.' });
      await load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const updateRow = async (id: string, patch: Partial<MapRow>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } as MapRow : r)));
    const { error } = await supabase.from('class_structure_map').update(patch as any).eq('id', id);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
  };

  const applyMap = async () => {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('apply_class_structure_map');
      if (error) throw error;
      toast({
        title: 'Structure applied',
        description: `${data?.students_enrolled ?? 0} students placed · ${data?.without_enrollment ?? 0} still unplaced`,
      });
      await load();
    } catch (e: any) {
      toast({ title: 'Apply failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const addCampus = async () => {
    if (!newCampus.name.trim() || !newCampus.code.trim()) {
      toast({ title: 'Name and code required', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('campuses').insert({
      name: newCampus.name.trim(),
      code: newCampus.code.trim().toUpperCase(),
      address: newCampus.address || null,
      phone: newCampus.phone || null,
    } as any);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setNewCampus({ name: '', code: '', address: '', phone: '' });
    await load();
  };

  const toggleCampus = async (c: Campus) => {
    await supabase.from('campuses').update({ is_active: !c.is_active } as any).eq('id', c.id);
    await load();
  };

  const armsForLevel = (levelId: string) => {
    const offIds = offerings.filter(o => o.class_level_id === levelId).map(o => o.id);
    return arms.filter(a => offIds.includes(a.offering_id));
  };
  const campusesForLevel = (levelId: string) =>
    offerings
      .filter(o => o.class_level_id === levelId)
      .map(o => campuses.find(c => c.id === o.campus_id)?.name)
      .filter(Boolean) as string[];

  const pending = rows.filter(r => !r.applied_at).length;

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Campuses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Campuses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Code</TableHead>
                  <TableHead>Address</TableHead><TableHead>Phone</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campuses.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.code}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{c.address || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Switch checked={c.is_active} onCheckedChange={() => toggleCampus(c)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-2 md:grid-cols-5 items-end">
            <div><Label>Name</Label><Input value={newCampus.name} onChange={e => setNewCampus({ ...newCampus, name: e.target.value })} /></div>
            <div><Label>Code</Label><Input value={newCampus.code} onChange={e => setNewCampus({ ...newCampus, code: e.target.value })} placeholder="MAIN" /></div>
            <div><Label>Address</Label><Input value={newCampus.address} onChange={e => setNewCampus({ ...newCampus, address: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={newCampus.phone} onChange={e => setNewCampus({ ...newCampus, phone: e.target.value })} /></div>
            <Button onClick={addCampus}><Plus className="h-4 w-4 mr-2" /> Add campus</Button>
          </div>
        </CardContent>
      </Card>

      {/* Mapping review */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Class structure review</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Each old class name is split into campus, class and arm. Edit anything that looks wrong, then apply.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={buildProposal} disabled={busy}>
              <RefreshCw className="h-4 w-4 mr-2" /> Build proposal
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={busy || rows.length === 0}>
                  <Check className="h-4 w-4 mr-2" /> Apply structure
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apply this structure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Students will be placed into campus, class and arm using the mapping below. Old class records are kept,
                    so nothing is lost and you can adjust and apply again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={applyMap}>Apply</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              No proposal yet — press “Build proposal”.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">{pending} of {rows.length} rows not applied yet.</p>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Old class</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Campus</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Arm</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>State</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.legacy_name}</TableCell>
                        <TableCell>{counts[r.legacy_class_id] || 0}</TableCell>
                        <TableCell>
                          <Select value={r.campus_code} onValueChange={v => updateRow(r.id, { campus_code: v })}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {campuses.map(c => <SelectItem key={c.id} value={c.code}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input className="w-36" value={r.level_name}
                            onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, level_name: e.target.value } : x))}
                            onBlur={e => updateRow(r.id, { level_name: e.target.value.toUpperCase().trim() })} />
                        </TableCell>
                        <TableCell>
                          <Input className="w-20" value={r.arm_code || ''} placeholder="—"
                            onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, arm_code: e.target.value } : x))}
                            onBlur={e => updateRow(r.id, { arm_code: e.target.value.toUpperCase().trim() || null })} />
                        </TableCell>
                        <TableCell>
                          <Input className="w-20" type="number" value={r.level_order}
                            onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, level_order: Number(e.target.value) } : x))}
                            onBlur={e => updateRow(r.id, { level_order: Number(e.target.value) })} />
                        </TableCell>
                        <TableCell>
                          {r.applied_at
                            ? <Badge variant="secondary">Applied</Badge>
                            : <Badge variant="outline">Pending</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resulting structure */}
      <Card>
        <CardHeader><CardTitle>Classes &amp; arms</CardTitle></CardHeader>
        <CardContent>
          {levels.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Apply the structure to see classes here.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {levels.map(l => (
                <div key={l.id} className="border rounded-lg p-3">
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {campusesForLevel(l.id).join(' · ') || 'No campus'}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {armsForLevel(l.id).length === 0
                      ? <span className="text-xs text-muted-foreground">No arms</span>
                      : armsForLevel(l.id).map(a => <Badge key={a.id} variant="outline">Arm {a.code}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolStructure;
