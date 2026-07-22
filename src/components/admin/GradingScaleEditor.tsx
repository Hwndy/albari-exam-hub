import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Band { grade: string; min: number; max: number; remark: string }

export const GradingScaleEditor: React.FC = () => {
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('grading_scales')
        .select('id,name,scale_data').eq('is_default', true).maybeSingle();
      if (data) {
        setId(data.id); setName(data.name);
        setBands((data.scale_data as any) || []);
      }
      setLoading(false);
    })();
  }, []);

  const update = (i: number, k: keyof Band, v: any) =>
    setBands(bs => bs.map((b, idx) => idx === i ? { ...b, [k]: k === 'min' || k === 'max' ? Number(v) : v } : b));

  const save = async () => {
    setSaving(true);
    const sorted = [...bands].sort((a, b) => b.min - a.min);
    const payload = { name, scale_data: sorted as any, is_default: true };
    const { error } = id
      ? await supabase.from('grading_scales').update(payload).eq('id', id)
      : await supabase.from('grading_scales').insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success('Grading scale saved');
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>;

  return (
    <Card>
      <CardHeader><CardTitle>Grading Scale</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><Label>Scale name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-2">Grade</div><div className="col-span-2">Min %</div><div className="col-span-2">Max %</div>
            <div className="col-span-5">Remark</div><div className="col-span-1" />
          </div>
          {bands.map((b, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-2" value={b.grade} onChange={(e) => update(i, 'grade', e.target.value)} />
              <Input className="col-span-2" type="number" value={b.min} onChange={(e) => update(i, 'min', e.target.value)} />
              <Input className="col-span-2" type="number" value={b.max} onChange={(e) => update(i, 'max', e.target.value)} />
              <Input className="col-span-5" value={b.remark} onChange={(e) => update(i, 'remark', e.target.value)} />
              <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setBands(bs => bs.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setBands(bs => [...bs, { grade: '', min: 0, max: 0, remark: '' }])}>
            <Plus className="h-4 w-4 mr-1" /> Add band
          </Button>
        </div>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save scale</Button>
      </CardContent>
    </Card>
  );
};

export default GradingScaleEditor;