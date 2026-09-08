import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Report {
  by_campus: { campus: string; count: number }[];
  by_gender: { gender: string; count: number }[];
  by_class_gender: { class: string; gender: string; count: number }[];
  by_campus_gender: { campus: string; gender: string; count: number }[];
  by_arm: { class: string; arm: string; count: number }[];
  boarding: { boarding: number; day: number };
  student_type: { new: number; returning: number };
}

const Block: React.FC<{ title: string; rows: [string, number][] }> = ({ title, rows }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-1">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
      {rows.map(([label, n]) => (
        <div key={label} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
          <span className="capitalize">{label}</span>
          <span className="font-semibold">{n}</span>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const StructureReports: React.FC = () => {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: res } = await (supabase as any).rpc('get_student_structure_report');
      setData(res as Report);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return <p className="text-muted-foreground">No report available.</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Block title="Students by campus" rows={(data.by_campus || []).map(r => [r.campus, r.count])} />
      <Block title="Students by gender" rows={(data.by_gender || []).map(r => [r.gender, r.count])} />
      <Block title="Day vs boarding" rows={[['Day', data.boarding?.day || 0], ['Boarding', data.boarding?.boarding || 0]]} />
      <Block title="New vs returning" rows={[['New', data.student_type?.new || 0], ['Returning', data.student_type?.returning || 0]]} />
      <Block
        title="Class + gender"
        rows={(data.by_class_gender || []).map(r => [`${r.class} · ${r.gender}`, r.count])}
      />
      <Block
        title="Campus + gender"
        rows={(data.by_campus_gender || []).map(r => [`${r.campus} · ${r.gender}`, r.count])}
      />
      <Block title="Class + arm" rows={(data.by_arm || []).map(r => [`${r.class} ${r.arm}`, r.count])} />
    </div>
  );
};

export default StructureReports;
