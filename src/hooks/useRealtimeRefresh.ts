import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Re-runs `onChange` whenever any of the given tables change in the database,
 * so screens stay up to date without a manual reload.
 */
export function useRealtimeRefresh(
  channelName: string,
  tables: string[],
  onChange: () => void,
) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = tables.join(',');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 300);
    };

    let channel = supabase.channel(`${channelName}-live`);
    key.split(',').filter(Boolean).forEach(table => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        trigger,
      );
    });
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [channelName, key]);
}
