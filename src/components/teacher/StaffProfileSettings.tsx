import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PhotoUpload } from '@/components/shared/PhotoUpload';
import { StaffIDCard } from '@/components/admin/StaffIDCard';
import { fetchSchoolBranding, DEFAULT_SCHOOL_BRANDING, SchoolBranding } from '@/lib/school-branding';
import { printNode } from '@/lib/print-node';
import { Loader2, Save, Printer } from 'lucide-react';

interface StaffRow {
  user_id: string;
  employee_id: string | null;
  designation: string | null;
  department: string | null;
  join_date: string | null;
  phone: string | null;
  address: string | null;
  photo_url: string | null;
  blood_group: string | null;
  date_of_birth: string | null;
  next_of_kin: { name?: string; phone?: string; relationship?: string } | null;
  bank_details: { bank_name?: string; account_number?: string; account_name?: string } | null;
}

/** Staff self-service profile: contact details, photo, next of kin, bank details. */
export const StaffProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [row, setRow] = useState<StaffRow | null>(null);
  const [branding, setBranding] = useState<SchoolBranding>(DEFAULT_SCHOOL_BRANDING);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const [detailRes, profRes, b] = await Promise.all([
          supabase.from('staff_details').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
          fetchSchoolBranding(),
        ]);
        setBranding(b);
        setFullName(((profRes.data as any)?.full_name as string) || '');
        const d = detailRes.data as any;
        setRow({
          user_id: user.id,
          employee_id: d?.employee_id ?? null,
          designation: d?.designation ?? null,
          department: d?.department ?? null,
          join_date: d?.join_date ?? null,
          phone: d?.phone ?? '',
          address: d?.address ?? '',
          photo_url: d?.photo_url ?? '',
          blood_group: d?.blood_group ?? '',
          date_of_birth: d?.date_of_birth ?? '',
          next_of_kin: d?.next_of_kin ?? {},
          bank_details: d?.bank_details ?? {},
        });
      } catch (e: any) {
        toast({ title: 'Could not load profile', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const set = (patch: Partial<StaffRow>) => setRow(prev => (prev ? { ...prev, ...patch } : prev));

  const save = async () => {
    if (!row || !user?.id) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        phone: row.phone || null,
        address: row.address || null,
        photo_url: row.photo_url || null,
        blood_group: row.blood_group || null,
        date_of_birth: row.date_of_birth || null,
        next_of_kin: row.next_of_kin || {},
        bank_details: row.bank_details || {},
      };
      const { error } = await supabase.from('staff_details').upsert(payload as any, { onConflict: 'user_id' });
      if (error) throw error;
      if (fullName.trim()) {
        await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('user_id', user.id);
      }
      toast({ title: 'Profile updated' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !row) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>
            Keep your contact and emergency details current. Employee ID, role and salary are managed by the school office.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Employee ID: {row.employee_id || 'Not issued'}</Badge>
            {row.designation && <Badge variant="outline">{row.designation}</Badge>}
            {row.department && <Badge variant="outline">{row.department}</Badge>}
          </div>

          <PhotoUpload
            value={row.photo_url || ''}
            onChange={(url) => set({ photo_url: url })}
            folder={`staff/${user?.id}`}
            label="Passport Photo"
            id="staff-photo"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Full name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={row.phone || ''} onChange={e => set({ phone: e.target.value })} /></div>
            <div><Label>Date of birth</Label><Input type="date" value={row.date_of_birth || ''} onChange={e => set({ date_of_birth: e.target.value })} /></div>
            <div><Label>Blood group</Label><Input value={row.blood_group || ''} onChange={e => set({ blood_group: e.target.value })} placeholder="O+" /></div>
            <div className="sm:col-span-2"><Label>Home address</Label><Input value={row.address || ''} onChange={e => set({ address: e.target.value })} /></div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Next of kin</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>Name</Label><Input value={row.next_of_kin?.name || ''} onChange={e => set({ next_of_kin: { ...row.next_of_kin, name: e.target.value } })} /></div>
              <div><Label>Relationship</Label><Input value={row.next_of_kin?.relationship || ''} onChange={e => set({ next_of_kin: { ...row.next_of_kin, relationship: e.target.value } })} /></div>
              <div><Label>Phone</Label><Input value={row.next_of_kin?.phone || ''} onChange={e => set({ next_of_kin: { ...row.next_of_kin, phone: e.target.value } })} /></div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Salary account</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>Bank</Label><Input value={row.bank_details?.bank_name || ''} onChange={e => set({ bank_details: { ...row.bank_details, bank_name: e.target.value } })} /></div>
              <div><Label>Account number</Label><Input value={row.bank_details?.account_number || ''} onChange={e => set({ bank_details: { ...row.bank_details, account_number: e.target.value } })} /></div>
              <div><Label>Account name</Label><Input value={row.bank_details?.account_name || ''} onChange={e => set({ bank_details: { ...row.bank_details, account_name: e.target.value } })} /></div>
            </div>
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">My ID Card</CardTitle>
          <Button size="sm" variant="outline" onClick={() => printNode(document.getElementById('staff-id-card'), { title: 'Staff ID Card' })}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
        </CardHeader>
        <CardContent className="overflow-auto">
          <StaffIDCard
            staff={{
              user_id: row.user_id,
              full_name: fullName || 'Staff Member',
              employee_id: row.employee_id,
              designation: row.designation,
              department: row.department,
              photo_url: row.photo_url,
              phone: row.phone,
              blood_group: row.blood_group,
              date_of_joining: row.join_date,
            }}
            school={{ name: branding.name, address: branding.address, phone: branding.phone, logo_url: branding.logo_url, motto: branding.motto }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffProfileSettings;