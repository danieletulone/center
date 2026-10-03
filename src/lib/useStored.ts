'use client';
import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** Read a localStorage value without hydration mismatches (null on the server). */
export function useStored(key: string): string | null {
  return useSyncExternalStore(
    noop,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}
