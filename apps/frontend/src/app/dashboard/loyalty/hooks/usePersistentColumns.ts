'use client';

import { useState, useEffect } from 'react';

/**
 * Persists a boolean column-visibility map to localStorage.
 * Replaces the repetitive useEffect pattern for each export column set.
 */
export function usePersistentColumns(
  key: string,
  defaults: Record<string, boolean>
): [Record<string, boolean>, React.Dispatch<React.SetStateAction<Record<string, boolean>>>] {
  const [cols, setCols] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(cols));
    } catch {}
  }, [key, cols]);

  return [cols, setCols];
}
