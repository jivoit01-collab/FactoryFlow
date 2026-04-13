import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { ignoreStorageError } from '@/shared/utils/error';

import { useEntryId } from './useEntryId';

const STORAGE_KEY = 'gate_entry_last_step';

/**
 * Extracts the current step segment from the URL path.
 * e.g., "/gate/raw-materials/edit/42/step3" → "step3"
 *       "/gate/raw-materials/edit/42/review" → "review"
 *       "/gate/raw-materials/edit/42/attachments" → "attachments"
 */
function getStepFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (
    lastSegment?.startsWith('step') ||
    lastSegment === 'review' ||
    lastSegment === 'attachments'
  ) {
    return lastSegment;
  }
  return null;
}

/**
 * Returns a map of entryId → lastStep from localStorage.
 */
function getStepMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    ignoreStorageError();
    return {};
  }
}

/**
 * Saves the current step for a given entry ID.
 */
function saveStep(entryId: string, step: string): void {
  try {
    const map = getStepMap();
    map[entryId] = step;

    // Keep only last 50 entries to avoid unbounded growth
    const keys = Object.keys(map);
    if (keys.length > 50) {
      for (const key of keys.slice(0, keys.length - 50)) {
        delete map[key];
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    ignoreStorageError();
  }
}

/**
 * Removes a stored step for a given entry ID (e.g., after completion).
 */
export function clearEntryStep(entryId: string | number): void {
  try {
    const map = getStepMap();
    delete map[String(entryId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    ignoreStorageError();
  }
}

/**
 * Gets the last known step for a given entry ID.
 * Returns null if no step is tracked.
 */
export function getLastStep(entryId: string | number): string | null {
  const map = getStepMap();
  return map[String(entryId)] || null;
}

/**
 * Hook that automatically tracks the current step whenever a step page mounts.
 * Call this in every step page component to keep the tracker up to date.
 */
export function useEntryStepTracker(): void {
  const { entryId } = useEntryId();
  const location = useLocation();

  useEffect(() => {
    if (!entryId) return;
    const step = getStepFromPath(location.pathname);
    if (step) {
      saveStep(entryId, step);
    }
  }, [entryId, location.pathname]);
}
