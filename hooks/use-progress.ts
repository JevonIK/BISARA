'use client';

import { useMemo, useSyncExternalStore } from 'react';

import {
  getProgressSnapshot,
  getServerProgressSnapshot,
  parseProgressSnapshot,
  subscribeToProgress,
} from '@/lib/progress-storage';

export function useProgress() {
  const snapshot = useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    getServerProgressSnapshot,
  );

  return useMemo(() => parseProgressSnapshot(snapshot), [snapshot]);
}
