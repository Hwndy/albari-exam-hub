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
    supabase.from('students').select('id, user_id, admission_number, status, photo_url').is('archived_at', null).in('id', refs),
    supabase.from('students').select('id, user_id, admission_number, status, photo_url').is('archived_at', null).in('user_id', refs),
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

export interface StudentClassInfo { class_id: string | null; class_name: string | null; }

/**
 * Resolves the class of many students at once.
 *
 * `class_assignments.student_id` stores the student's auth user id (not
 * `students.id`), so there is no foreign key between `students` and
 * `class_assignments` and PostgREST embeds fail. This helper joins the two
 * manually, accepting either id form.
 */
export async function fetchStudentClassMap(
  students: { id: string; user_id?: string | null }[]
): Promise<Map<string, StudentClassInfo>> {
  const map = new Map<string, StudentClassInfo>();
  if (!students.length) return map;

  const [{ data: assigns }, { data: classes }] = await Promise.all([
    supabase.from('class_assignments').select('student_id, class_id'),
    supabase.from('classes').select('id, name'),
  ]);

  const classNameById = new Map((classes || []).map((c: any) => [c.id, c.name as string]));
  const classByRef = new Map<string, string>();
  (assigns || []).forEach((a: any) => {
    if (a.student_id && a.class_id) classByRef.set(a.student_id, a.class_id);
  });

  students.forEach(s => {
    const classId = (s.user_id && classByRef.get(s.user_id)) || classByRef.get(s.id) || null;
    map.set(s.id, { class_id: classId, class_name: classId ? classNameById.get(classId) ?? null : null });
  });
  return map;
}

/** Resolves a single student's class, accepting the student record id. */
export async function fetchStudentClass(studentId: string): Promise<StudentClassInfo> {
  const { data: s } = await supabase.from('students').select('id, user_id').eq('id', studentId).maybeSingle();
  if (!s) return { class_id: null, class_name: null };
  const refs = [s.user_id, s.id].filter(Boolean) as string[];
  const { data: ca } = await supabase
    .from('class_assignments')
    .select('class_id, classes(name)')
    .in('student_id', refs)
    .limit(1);
  const row: any = (ca || [])[0];
  return { class_id: row?.class_id ?? null, class_name: row?.classes?.name ?? null };
}
