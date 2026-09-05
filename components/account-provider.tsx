'use client';
import { useEffect } from 'react';
import { subscribeToProgress } from '@/lib/progress-storage';
import {
  AUTH_EVENT_KEY,
  refreshAccount,
  syncProgress,
} from '@/lib/account-session';

export function AccountProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void refreshAccount();
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = subscribeToProgress(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void syncProgress();
      }, 500);
    });
    const handleAuthChange = (event: StorageEvent) => {
      if (event.key === AUTH_EVENT_KEY || event.key === null)
        void refreshAccount();
    };
    const online = () => {
      void refreshAccount();
    };
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('online', online);
    return () => {
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('online', online);
    };
  }, []);
  return children;
}
