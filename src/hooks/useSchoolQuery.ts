import { useSchool } from '@/contexts/SchoolContext';

/**
 * Hook to automatically filter queries by school_id for multi-tenancy
 * Usage:
 * const { withSchoolFilter, withSchoolData, schoolId } = useSchoolQuery();
 * 
 * // For SELECT queries:
 * const query = supabase.from('classes').select('*');
 * const { data } = await withSchoolFilter(query);
 * 
 * // For INSERT operations:
 * const newData = withSchoolData({ name: 'New Class' });
 * await supabase.from('classes').insert(newData);
 */
export const useSchoolQuery = () => {
  const { schoolId } = useSchool();

  /**
   * Adds school_id filter to a Supabase query
   * @param query - Supabase query builder
   * @returns Query builder with school_id filter applied (if schoolId exists)
   */
  const withSchoolFilter = (query: any) => {
    // Only filter if schoolId exists (null for super admin viewing all schools)
    return schoolId ? query.eq('school_id', schoolId) : query;
  };

  /**
   * Adds school_id to data object for INSERT/UPDATE operations
   * @param data - Data object to insert/update
   * @returns Data object with school_id added (if schoolId exists)
   */
  const withSchoolData = <T extends Record<string, any>>(data: T): T & { school_id?: string } => {
    return schoolId ? { ...data, school_id: schoolId } : data;
  };

  /**
   * Checks if a school is currently selected
   * @returns true if schoolId exists, false otherwise
   */
  const hasSchoolSelected = (): boolean => {
    return schoolId !== null;
  };

  return {
    withSchoolFilter,
    withSchoolData,
    schoolId,
    hasSchoolSelected,
  };
};
