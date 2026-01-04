import React, { useEffect, useState } from 'react';
import { usePWAContext } from '@/contexts/PWAContext';
import { WifiOff, Wifi } from 'lucide-react';
import { toast } from 'sonner';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAContext();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline && !wasOffline) {
      setWasOffline(true);
      toast.error('You are offline', {
        description: 'Some features may be limited',
        duration: 5000,
        icon: <WifiOff className="h-4 w-4" />,
      });
    } else if (isOnline && wasOffline) {
      setWasOffline(false);
      toast.success('Back online', {
        description: 'Connection restored',
        duration: 3000,
        icon: <Wifi className="h-4 w-4" />,
      });
    }
  }, [isOnline, wasOffline]);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground py-1 px-4 text-center text-sm font-medium animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You are offline - Some features may be limited</span>
      </div>
    </div>
  );
};
