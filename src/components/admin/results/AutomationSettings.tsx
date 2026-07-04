import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Settings {
  min_promotion_average: number;
  below_max: number;
  average_max: number;
  above_max: number;
  principal_remark_below: string;
  principal_remark_average: string;
  principal_remark_above: string;
  principal_remark_distinction: string;
  show_parent_signature: boolean;
}

const DEFAULTS: Settings = {
  min_promotion_average: 40,
  below_max: 39,
  average_max: 59,
  above_max: 74,
  principal_remark_below: 'Below Average. Needs to work much harder next term.',
  principal_remark_average: 'A bit above average. Keep pushing to improve.',
  principal_remark_above: 'Far above average. Well done, keep it up.',
  principal_remark_distinction: 'Distinction. Excellent performance!',
  show_parent_signature: false,
};

export const AutomationSettings: React.FC = () => {
  const { toast } = useToast();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!schoolId) return;
      const { data } = await supabase
        .from('result_automation_settings')
        .select('*')
        
        .maybeSingle();
      if (data) {
        setS({
          min_promotion_average: Number(data.min_promotion_average),
          below_max: Number(data.below_max),
          average_max: Number(data.average_max),
          above_max: Number(data.above_max),
          principal_remark_below: data.principal_remark_below,
          principal_remark_average: data.principal_remark_average,
          principal_remark_above: data.principal_remark_above,
          principal_remark_distinction: data.principal_remark_distinction,
          show_parent_signature: !!data.show_parent_signature,
        });
      }
      setLoading(false);
    })();
  }, [schoolId]);

  const save = async () => {
    if (!schoolId) return;
    setSaving(true);
    const { error } = await supabase
      .from('result_automation_settings')
      .upsert({ school_id: schoolId, ...s }, { onConflict: 'school_id' });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Automation settings updated.' });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const num = (k: keyof Settings) => (
    <Input
      type="number"
      value={s[k] as number}
      onChange={e => setS({ ...s, [k]: Number(e.target.value) })}
    />
  );
  const txt = (k: keyof Settings) => (
    <Textarea
      rows={2}
      value={s[k] as string}
      onChange={e => setS({ ...s, [k]: e.target.value })}
    />
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Promotion & Thresholds</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Minimum average for promotion (%)</Label>{num('min_promotion_average')}</div>
          <div className="space-y-2"><Label>Below Average up to (%)</Label>{num('below_max')}</div>
          <div className="space-y-2"><Label>Average up to (%)</Label>{num('average_max')}</div>
          <div className="space-y-2"><Label>Above Average up to (%)</Label>{num('above_max')}</div>
          <div className="space-y-2 sm:col-span-2 flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Show Parent/Guardian signature on report card</Label>
              <p className="text-xs text-muted-foreground">Off by default. Turn on to include a parent signature line.</p>
            </div>
            <Switch checked={s.show_parent_signature} onCheckedChange={v => setS({ ...s, show_parent_signature: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Central Principal's Remarks (auto-applied)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Below Average</Label>{txt('principal_remark_below')}</div>
          <div className="space-y-2"><Label>A bit above average</Label>{txt('principal_remark_average')}</div>
          <div className="space-y-2"><Label>Far Above Average</Label>{txt('principal_remark_above')}</div>
          <div className="space-y-2"><Label>Distinction</Label>{txt('principal_remark_distinction')}</div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default AutomationSettings;