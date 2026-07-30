import { supabase } from '@/integrations/supabase/client';

export interface RosterStudent {
  student_id: string;
  user_id: string | null;
  full_name: string;
  admission_number: string | null;
  status: string | null;
  photo_url: string | null;
}

/**
 * Loads every student in a class.
 *
 * `class_assignments.student_id` historically holds either the student's
 * record id or their auth user id, so both are resolved. Names come from
 * `profiles` when available and fall back to the admission number, so a
 * missing profile never removes a student from the roster.
 */
export async function fetchClassRoster(classId: string): Promise<RosterStudent[]> {
  if (!classId) return [];

  const { data: assigns, error } = await supabase
    .from('class_assignments')
    .select('student_id')
    .eq('class_id', classId);
  if (error) throw error;

  const refs = Array.from(new Set((assigns || []).map((a: any) => a.student_id).filter(Boolean)));
  if (refs.length === 0) return [];

  const [byId, byUser] = await Promise.all([
    supabase.from('students').select('id, user_id, admission_number, status, photo_url').in('id', refs),
    supabase.from('students').select('id, user_id, admission_number, status, photo_url').in('user_id', refs),
  ]);

  const students = new Map<string, any>();
  [...(byId.data || []), ...(byUser.data || [])].forEach(s => students.set(s.id, s));
  if (students.size === 0) return [];

  const userIds = Array.from(students.values()).map(s => s.user_id).filter(Boolean);
  const nameByUser = new Map<string, string>();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    (profs || []).forEach((p: any) => nameByUser.set(p.user_id, p.full_name));
  }

  return Array.from(students.values())
    .map(s => ({
      student_id: s.id,
      user_id: s.user_id ?? null,
      full_name: (s.user_id && nameByUser.get(s.user_id)) || s.admission_number || 'Unnamed student',
      admission_number: s.admission_number ?? null,
      status: s.status ?? null,
      photo_url: s.photo_url ?? null,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
