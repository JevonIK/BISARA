'use client';
import { useSyncExternalStore } from 'react';
import {
  getAccountSnapshot,
  getServerAccountSnapshot,
  subscribeAccount,
} from '@/lib/account-session';

export function useAccount() {
  return useSyncExternalStore(
    subscribeAccount,
    getAccountSnapshot,
    getServerAccountSnapshot,
  );
}
