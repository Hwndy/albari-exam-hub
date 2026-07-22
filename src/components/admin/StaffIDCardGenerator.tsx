import React, { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { StaffIDCard, StaffIDCardData, StaffIDCardSchool } from './StaffIDCard';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Search, IdCard } from 'lucide-react';

interface Row {
  user_id: string;
  employee_id: string | null;
  designation: string | null;
  department: string | null;
  date_of_joining: string | null;
  blood_group: string | null;
  full_name: string;
  phone: string | null;
  photo_url: string | null;
}

export const StaffIDCardGenerator: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [school, setSchool] = useState<StaffIDCardSchool>({ name: 'Al-Bari Model Schools' });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const [staffRes, schoolRes] = await Promise.all([
        supabase
          .from('staff_details')
          .select('user_id, employee_id, designation, department, date_of_joining, blood_group, phone')
          .order('employee_id'),
        supabase.from('school_info').select('*').limit(1).maybeSingle(),
      ]);
      const list = staffRes.data || [];
      const userIds = list.map((s: any) => s.user_id);
      const { data: profs } = userIds.length
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
        : { data: [] as any };
      const nameMap = new Map<string, string>((profs || []).map((p: any) => [p.user_id, p.full_name]));
      setRows(
        list.map((s: any) => ({
          user_id: s.user_id,
          employee_id: s.employee_id,
          designation: s.designation,
          department: s.department,
          date_of_joining: s.date_of_joining,
          blood_group: s.blood_group,
          phone: s.phone,
          full_name: nameMap.get(s.user_id) || '—',
          photo_url: null,
        })),
      );
      if (schoolRes.data) {
        const s: any = schoolRes.data;
        setSchool({ name: s.name || 'Al-Bari Model Schools', address: s.address, phone: s.phone, logo_url: s.logo_url, motto: s.motto });
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r =>
    !q.trim() ||
    (r.full_name?.toLowerCase().includes(q.toLowerCase())) ||
    (r.employee_id?.toLowerCase().includes(q.toLowerCase())) ||
    (r.designation?.toLowerCase().includes(q.toLowerCase())),
  );

  const staffCard: StaffIDCardData | null = selected && {
    user_id: selected.user_id,
    full_name: selected.full_name,
    employee_id: selected.employee_id,
    designation: selected.designation,
    department: selected.department,
    date_of_joining: selected.date_of_joining,
    blood_group: selected.blood_group,
    phone: selected.phone,
    photo_url: selected.photo_url,
  };

  const download = async () => {
    const el = document.getElementById('staff-id-card');
    if (!el || !selected) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `${selected.full_name.replace(/\s+/g, '_')}_ID.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><IdCard className="h-5 w-5" /> Staff ID Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, ID, role…" className="pl-8" />
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No staff found. Add staff in Staff Management first.</TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.user_id} className={selected?.user_id === r.user_id ? 'bg-accent' : ''}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.employee_id || '—'}</TableCell>
                      <TableCell>{r.designation || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(r)}>Preview</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Preview</CardTitle>
          {staffCard && (
            <Button size="sm" onClick={download} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} PNG
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {staffCard ? (
            <StaffIDCard staff={staffCard} school={school} showBack />
          ) : (
            <div className="text-center text-muted-foreground py-16">Select a staff member to preview their ID card.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffIDCardGenerator;