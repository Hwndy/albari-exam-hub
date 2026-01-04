import React, { createContext, useContext, ReactNode } from 'react';
import { usePWA } from '@/hooks/usePWA';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  installApp: () => Promise<boolean>;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: ReactNode }) {
  const pwa = usePWA();

  return (
    <PWAContext.Provider value={pwa}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWAContext(): PWAContextType {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWAContext must be used within a PWAProvider');
  }
  return context;
}
