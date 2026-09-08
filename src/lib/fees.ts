import { supabase } from '@/integrations/supabase/client';

export const NGN = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);

export const TERMS = ['First', 'Second', 'Third'] as const;
export type Term = (typeof TERMS)[number];

export const FREQUENCIES = [
  { value: 'termly', label: 'Every term' },
  { value: 'annual', label: 'Once a session' },
  { value: 'one_time', label: 'One time only' },
] as const;

export const STUDENT_TYPES = [
  { value: 'both', label: 'New & returning' },
  { value: 'new', label: 'New students only' },
  { value: 'returning', label: 'Returning students only' },
] as const;

export const STUDENT_CATEGORIES = [
  { value: 'both', label: 'Day & boarding' },
  { value: 'day', label: 'Day students only' },
  { value: 'boarding', label: 'Boarders only' },
] as const;

export const labelFor = (list: readonly { value: string; label: string }[], v: string) =>
  list.find(o => o.value === v)?.label ?? v;

/** The academic year of the current admission session, e.g. "2026/2027". */
export async function fetchCurrentAcademicYear(): Promise<string> {
  const { data } = await supabase
    .from('admission_sessions')
    .select('academic_year, is_current, created_at')
    .order('created_at', { ascending: false });
  const current = (data || []).find((s: any) => s.is_current) || (data || [])[0];
  if (current?.academic_year) return current.academic_year as string;
  const y = new Date().getFullYear();
  return `${y}/${y + 1}`;
}

export async function fetchAcademicYears(): Promise<string[]> {
  const [{ data: sessions }, { data: rules }] = await Promise.all([
    supabase.from('admission_sessions').select('academic_year'),
    supabase.from('fee_rules').select('academic_year'),
  ]);
  const set = new Set<string>();
  (sessions || []).forEach((s: any) => s.academic_year && set.add(s.academic_year));
  (rules || []).forEach((r: any) => r.academic_year && set.add(r.academic_year));
  return [...set].sort().reverse();
}

export interface StudentLite {
  id: string;
  user_id: string | null;
  name: string;
  admission_number: string | null;
}

/** All active students with their display name resolved from profiles. */
export async function fetchStudentDirectory(): Promise<StudentLite[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from('students')
      .select('id, user_id, admission_number')
      .is('archived_at', null)
      .range(from, from + 999);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
  const nameMap = new Map<string, string>();
  for (let i = 0; i < userIds.length; i += 500) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds.slice(i, i + 500));
    (profs || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name));
  }
  return rows
    .map(r => ({
      id: r.id,
      user_id: r.user_id ?? null,
      name: (r.user_id && nameMap.get(r.user_id)) || r.admission_number || 'Unnamed student',
      admission_number: r.admission_number ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const invoiceStatusLabel = (s: string) =>
  ({ unpaid: 'Unpaid', partial: 'Part paid', paid: 'Paid', cancelled: 'Cancelled' } as Record<string, string>)[s] || s;
