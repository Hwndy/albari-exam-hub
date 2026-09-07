import React, { useEffect, useRef } from 'react';
import { usePWAContext } from '@/contexts/PWAContext';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Applies a newly published version automatically — no manual "Update" click.
 * The reload is deferred while the user is typing so nothing in progress is lost.
 */
export const UpdateAvailable: React.FC = () => {
  const { isUpdateAvailable, updateApp } = usePWAContext();
  const applied = useRef(false);

  useEffect(() => {
    if (!isUpdateAvailable || applied.current) return;

    const isBusy = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    let timer: ReturnType<typeof setInterval> | null = null;

    const apply = () => {
      if (applied.current) return;
      applied.current = true;
      if (timer) clearInterval(timer);
      // Remember across the reload so we can confirm afterwards
      try { sessionStorage.setItem('app-just-updated', '1'); } catch { /* ignore */ }
      updateApp();
    };

    if (!isBusy()) {
      apply();
    } else {
      // Wait until the user stops typing, then apply
      timer = setInterval(() => {
        if (!isBusy()) apply();
      }, 5000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isUpdateAvailable, updateApp]);

  // Passive confirmation after the automatic reload
  useEffect(() => {
    try {
      if (sessionStorage.getItem('app-just-updated')) {
        sessionStorage.removeItem('app-just-updated');
        toast('Updated to the latest version', {
          duration: 4000,
          icon: <RefreshCw className="h-4 w-4" />,
        });
      }
    } catch { /* ignore */ }
  }, []);

  return null;
};
