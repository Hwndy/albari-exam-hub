import { supabase } from '@/integrations/supabase/client';

export interface GradeBand { grade: string; min: number; max: number; remark: string }

let cache: { bands: GradeBand[]; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

export async function getGradingScale(): Promise<GradeBand[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.bands;
  const { data } = await supabase
    .from('grading_scales')
    .select('scale_data')
    .eq('is_default', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const bands = ((data?.scale_data as any) || [
    { grade: 'A', min: 75, max: 100, remark: 'Excellent' },
    { grade: 'B', min: 65, max: 74, remark: 'Very Good' },
    { grade: 'C', min: 50, max: 64, remark: 'Good' },
    { grade: 'D', min: 40, max: 49, remark: 'Pass' },
    { grade: 'F', min: 0, max: 39, remark: 'Fail' },
  ]) as GradeBand[];
  cache = { bands, ts: Date.now() };
  return bands;
}

export function gradeFor(score: number, bands: GradeBand[]): GradeBand {
  return bands.find(b => score >= b.min && score <= b.max) || { grade: 'F', min: 0, max: 0, remark: 'Fail' };
}

export function gradeColor(grade: string): string {
  switch (grade?.toUpperCase()) {
    case 'A': return 'text-green-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-yellow-600';
    case 'D': return 'text-orange-600';
    default: return 'text-red-600';
  }
}