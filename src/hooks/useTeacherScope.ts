import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ScopeItem { id: string; name: string }

export interface TeacherScope {
  classes: ScopeItem[];
  subjects: ScopeItem[];
  loading: boolean;
  isAdmin: boolean;
  /** true when the teacher has no explicit assignments and is seeing everything */
  unscoped: boolean;
}

/**
 * Resolves the classes and subjects a user may work with.
 * Admins get everything. Teachers get their assigned classes/subjects and,
 * when they have none recorded, fall back to the full list so the screen
 * is never silently empty.
 */
export const useTeacherScope = (): TeacherScope => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ScopeItem[]>([]);
  const [subjects, setSubjects] = useState<ScopeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unscoped, setUnscoped] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [allClasses, allSubjects] = await Promise.all([
          supabase.from('classes').select('id, name').order('name'),
          supabase.from('subjects').select('id, name').order('name'),
        ]);
        const everyClass = (allClasses.data || []) as ScopeItem[];
        const everySubject = (allSubjects.data || []) as ScopeItem[];

        if (isAdmin || !user?.id) {
          if (!cancelled) {
            setClasses(everyClass);
            setSubjects(everySubject);
            setUnscoped(false);
          }
          return;
        }

        const [tca, sa] = await Promise.all([
          supabase.from('teacher_class_assignments').select('class_id').eq('teacher_id', user.id),
          supabase.from('subject_assignments').select('subject_id, class_id').eq('user_id', user.id),
        ]);

        const classIds = new Set<string>();
        (tca.data || []).forEach((r: any) => r.class_id && classIds.add(r.class_id));
        (sa.data || []).forEach((r: any) => r.class_id && classIds.add(r.class_id));
        const subjectIds = new Set<string>();
        (sa.data || []).forEach((r: any) => r.subject_id && subjectIds.add(r.subject_id));

        const scopedClasses = everyClass.filter(c => classIds.has(c.id));
        const scopedSubjects = everySubject.filter(s => subjectIds.has(s.id));
        const noScope = scopedClasses.length === 0 && scopedSubjects.length === 0;

        if (!cancelled) {
          setClasses(scopedClasses.length ? scopedClasses : everyClass);
          setSubjects(scopedSubjects.length ? scopedSubjects : everySubject);
          setUnscoped(noScope);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, isAdmin]);

  return { classes, subjects, loading, isAdmin, unscoped };
};
