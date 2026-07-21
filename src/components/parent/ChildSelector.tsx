import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChildren } from '@/contexts/ChildContext';
import { Users } from 'lucide-react';

export const ChildSelector: React.FC<{ includeAll?: boolean }> = ({ includeAll = false }) => {
  const { children, selectedChildId, setSelectedChildId } = useChildren();

  if (!children.length) return null;

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedChildId ?? (includeAll ? 'all' : undefined)}
        onValueChange={(v) => setSelectedChildId(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select child" />
        </SelectTrigger>
        <SelectContent>
          {includeAll && <SelectItem value="all">All children</SelectItem>}
          {children.map(c => (
            <SelectItem key={c.student_id} value={c.student_id}>
              {c.full_name} {c.class_name ? `• ${c.class_name}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};