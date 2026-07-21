import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const ParentProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    title: '', occupation: '', workplace: '', phone_primary: '', phone_secondary: '',
    notification_preferences: { email: true, sms: true, results: true, attendance: true, fees: true, announcements: true },
  });

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('parents').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        const prefs = (data as any).notification_preferences || {};
        setProfile((p: any) => ({ ...p, ...data, notification_preferences: { ...p.notification_preferences, ...prefs } }));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from('parents').update({
      title: profile.title, occupation: profile.occupation, workplace: profile.workplace,
      phone_primary: profile.phone_primary, phone_secondary: profile.phone_secondary,
      notification_preferences: profile.notification_preferences,
    }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Saved', description: 'Profile updated' });
  };

  const togglePref = (key: string) => setProfile((p: any) => ({ ...p, notification_preferences: { ...p.notification_preferences, [key]: !p.notification_preferences?.[key] } }));

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update your parent/guardian details</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Title</Label><Input value={profile.title || ''} onChange={e => setProfile({ ...profile, title: e.target.value })} placeholder="Mr / Mrs / Dr" /></div>
          <div className="space-y-2"><Label>Occupation</Label><Input value={profile.occupation || ''} onChange={e => setProfile({ ...profile, occupation: e.target.value })} /></div>
          <div className="space-y-2"><Label>Workplace</Label><Input value={profile.workplace || ''} onChange={e => setProfile({ ...profile, workplace: e.target.value })} /></div>
          <div className="space-y-2"><Label>Primary phone</Label><Input value={profile.phone_primary || ''} onChange={e => setProfile({ ...profile, phone_primary: e.target.value })} /></div>
          <div className="space-y-2"><Label>Secondary phone</Label><Input value={profile.phone_secondary || ''} onChange={e => setProfile({ ...profile, phone_secondary: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Choose what alerts you receive</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {[
            ['email', 'Email notifications'],
            ['sms', 'SMS notifications'],
            ['results', 'Results published'],
            ['attendance', 'Attendance alerts'],
            ['fees', 'Fee reminders'],
            ['announcements', 'School announcements'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key}>{label}</Label>
              <Switch id={key} checked={!!profile.notification_preferences?.[key]} onCheckedChange={() => togglePref(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save changes
      </Button>
    </div>
  );
};