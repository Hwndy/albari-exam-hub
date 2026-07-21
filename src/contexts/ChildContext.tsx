import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LinkedChild {
  student_id: string;
  full_name: string;
  admission_number: string;
  gender: string | null;
  date_of_birth: string | null;
  status: string | null;
  class_id: string | null;
  class_name: string | null;
  relationship_id: string;
  can_view_grades: boolean;
  can_view_attendance: boolean;
  can_view_fees: boolean;
}

interface ChildContextValue {
  children: LinkedChild[];
  selectedChildId: string | null;
  selectedChild: LinkedChild | null;
  setSelectedChildId: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ChildContext = createContext<ChildContextValue | undefined>(undefined);

export const ChildProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('parent:selectedChildId') : null;
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_parent_children');
    if (error) {
      console.error('get_parent_children error', error);
      setLinkedChildren([]);
    } else {
      const rows = (data || []) as LinkedChild[];
      setLinkedChildren(rows);
      if (rows.length && (!selectedChildId || !rows.find(r => r.student_id === selectedChildId))) {
        setSelectedChildId(rows[0].student_id);
      }
      if (!rows.length) setSelectedChildId(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.role === 'parent') load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (selectedChildId) localStorage.setItem('parent:selectedChildId', selectedChildId);
  }, [selectedChildId]);

  const selectedChild = linkedChildren.find(c => c.student_id === selectedChildId) || null;

  return (
    <ChildContext.Provider
      value={{ children: linkedChildren, selectedChildId, selectedChild, setSelectedChildId, loading, refresh: load }}
    >
      {children}
    </ChildContext.Provider>
  );
};

export const useChildren = () => {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useChildren must be used within ChildProvider');
  return ctx;
};