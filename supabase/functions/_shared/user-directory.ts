type SupabaseAdmin = any;

export interface DirectoryUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  roles: string[];
  class_name: string;
  admission_number: string;
  employee_id: string;
  phone: string;
  department: string;
  designation: string;
  employment_type: string;
  gender: string;
  date_of_birth: string;
  section: string;
  is_boarder: boolean | null;
  status: string;
  archived: boolean;
  created_at: string;
}

const ROLE_PRIORITY: Record<string, number> = {
  admin: 0,
  teacher: 1,
  parent: 2,
  student: 3,
};

async function fetchAll(admin: SupabaseAdmin, table: string, columns: string) {
  const rows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  return rows;
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return String((value[0] as any)?.name ?? '');
  return String((value as any)?.name ?? '');
}

export async function buildUserDirectory(admin: SupabaseAdmin): Promise<DirectoryUser[]> {
  const authUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Failed to load accounts: ${error.message}`);
    authUsers.push(...(data?.users ?? []));
    if (!data?.users || data.users.length < 1000) break;
    page += 1;
  }

  const [profiles, roles, classAssignments, teacherClassAssignments, students, staff, parents] = await Promise.all([
    fetchAll(admin, 'profiles', 'id, user_id, full_name, created_at'),
    fetchAll(admin, 'user_roles', 'user_id, role'),
    fetchAll(admin, 'class_assignments', 'student_id, class_id, classes(name)'),
    fetchAll(admin, 'teacher_class_assignments', 'teacher_id, class_id, classes(name)'),
    fetchAll(admin, 'students', 'user_id, admission_number, gender, date_of_birth, section, status, is_boarder, archived_at'),
    fetchAll(admin, 'staff_details', 'user_id, employee_id, department, designation, phone, employment_type, status'),
    fetchAll(admin, 'parents', 'user_id, phone_primary'),
  ]);

  const profileMap = new Map(profiles.filter((row) => row.user_id).map((row) => [row.user_id, row]));
  const rolesByUser = new Map<string, string[]>();
  for (const row of roles) {
    const current = rolesByUser.get(row.user_id) ?? [];
    if (!current.includes(row.role)) current.push(row.role);
    rolesByUser.set(row.user_id, current);
  }
  const roleForUser = (userId: string) =>
    (rolesByUser.get(userId) ?? []).sort((a, b) => (ROLE_PRIORITY[a] ?? 99) - (ROLE_PRIORITY[b] ?? 99))[0] ?? 'unassigned';

  const studentClassMap = new Map<string, string[]>();
  for (const row of classAssignments) {
    const name = relationName(row.classes);
    if (!name) continue;
    studentClassMap.set(row.student_id, [...(studentClassMap.get(row.student_id) ?? []), name]);
  }
  const teacherClassMap = new Map<string, string[]>();
  for (const row of teacherClassAssignments) {
    const name = relationName(row.classes);
    if (!name) continue;
    teacherClassMap.set(row.teacher_id, [...(teacherClassMap.get(row.teacher_id) ?? []), name]);
  }
  const studentMap = new Map(students.filter((row) => row.user_id).map((row) => [row.user_id, row]));
  const staffMap = new Map(staff.filter((row) => row.user_id).map((row) => [row.user_id, row]));
  const parentPhoneMap = new Map(parents.filter((row) => row.user_id).map((row) => [row.user_id, row.phone_primary ?? '']));

  return authUsers.map((authUser) => {
    const userId = authUser.id;
    const profile = profileMap.get(userId);
    const student = studentMap.get(userId);
    const staffMember = staffMap.get(userId);
    const role = roleForUser(userId);
    const classes = role === 'teacher' ? teacherClassMap.get(userId) ?? [] : studentClassMap.get(userId) ?? [];

    return {
      id: profile?.id ?? userId,
      user_id: userId,
      full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email || 'Unnamed user',
      email: authUser.email ?? '',
      role,
      roles: rolesByUser.get(userId) ?? [],
      class_name: classes.length ? [...new Set(classes)].join(', ') : 'Not Assigned',
      admission_number: student?.admission_number ?? '',
      employee_id: staffMember?.employee_id ?? '',
      phone: staffMember?.phone ?? parentPhoneMap.get(userId) ?? '',
      department: staffMember?.department ?? '',
      designation: staffMember?.designation ?? '',
      employment_type: staffMember?.employment_type ?? '',
      gender: student?.gender ?? '',
      date_of_birth: student?.date_of_birth ?? '',
      section: student?.section ?? '',
      is_boarder: student?.is_boarder ?? null,
      status: student?.status ?? staffMember?.status ?? (authUser.email_confirmed_at ? 'active' : 'invited'),
      archived: Boolean(student?.archived_at),
      created_at: profile?.created_at ?? authUser.created_at,
    };
  });
}