/** Small shared helpers for building WMS records. */
import { toast } from 'sonner';

import type { IsoDateTime, WmsId } from './types';

function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // Vibration unsupported — colour + toast still convey the result.
  }
}

/** Success feedback: green toast + a short single buzz (handheld-friendly). */
export function notifyOk(message: string): void {
  vibrate(40);
  toast.success(message);
}

/** Failure feedback: red toast + a double buzz so it's felt without looking. */
export function notifyFail(message: string): void {
  vibrate([70, 50, 70]);
  toast.error(message);
}

/** Generate a new record id (native, no extra dependency). */
export function createWmsId(): WmsId {
  return crypto.randomUUID();
}

/** Current time as an ISO-8601 string, the timestamp format every record uses. */
export function nowIso(): IsoDateTime {
  return new Date().toISOString();
}

/**
 * Stamp `createdAt`/`updatedAt` onto a new record payload, generating an `id`
 * when one was not supplied.
 */
export function withTimestamps<T extends { id?: WmsId }>(
  payload: T,
): T & { id: WmsId; createdAt: IsoDateTime; updatedAt: IsoDateTime } {
  const timestamp = nowIso();
  return {
    ...payload,
    id: payload.id ?? createWmsId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
