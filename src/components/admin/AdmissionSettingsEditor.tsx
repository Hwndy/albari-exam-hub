import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

const DEFAULT_NOTE = "This acceptance fee will be deducted from your child's school fees.";

/**
 * Admissions defaults — acceptance fee amount and the note shown to parents.
 * Stored in app_settings so offers and the public acceptance page stay in sync.
 */
export const AdmissionSettingsEditor: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('50000');
  const [note, setNote] = useState(DEFAULT_NOTE);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['acceptance_fee_amount', 'acceptance_fee_note']);

      data?.forEach((row) => {
        if (row.setting_key === 'acceptance_fee_amount') {
          setAmount(String(row.setting_value ?? 50000));
        } else if (row.setting_key === 'acceptance_fee_note') {
          setNote(String(row.setting_value ?? DEFAULT_NOTE));
        }
      });
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter an acceptance fee greater than zero.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert(
        [
          { setting_key: 'acceptance_fee_amount', setting_value: parsed as any },
          { setting_key: 'acceptance_fee_note', setting_value: (note.trim() || DEFAULT_NOTE) as any },
        ],
        { onConflict: 'setting_key' }
      );
      if (error) throw error;
      toast({ title: 'Saved', description: 'Admission settings updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admissions</CardTitle>
        <CardDescription>Defaults used when sending admission offers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="acceptance-fee">Acceptance Fee (₦)</Label>
          <Input
            id="acceptance-fee"
            type="number"
            min={0}
            step={500}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Pre-filled on every new offer. You can still override it per applicant.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acceptance-note">Acceptance Fee Note</Label>
          <Textarea
            id="acceptance-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Shown on the offer letter and the online acceptance page.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdmissionSettingsEditor;