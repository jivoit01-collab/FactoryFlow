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

/**
 * Generate a new record id (no extra dependency).
 *
 * `crypto.randomUUID()` is only defined in a *secure context* (HTTPS or
 * localhost). When the app is served over plain HTTP via a LAN IP — common for
 * shop-floor tablets/PCs — `crypto.randomUUID` is `undefined` and calling it
 * throws, which previously made every record create fail (data "not saved").
 * We fall back to building a v4 UUID from `crypto.getRandomValues` (available in
 * non-secure contexts too) and, as a last resort, `Math.random`.
 */
export function createWmsId(): WmsId {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    try {
      return cryptoObj.randomUUID();
    } catch {
      // Fall through to the manual builders below.
    }
  }

  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Set the version (4) and variant (RFC 4122) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = (value: number): string => (value + 0x100).toString(16).slice(1);
  const b = Array.from(bytes, hex);
  return (
    b[0] + b[1] + b[2] + b[3] +
    '-' + b[4] + b[5] +
    '-' + b[6] + b[7] +
    '-' + b[8] + b[9] +
    '-' + b[10] + b[11] + b[12] + b[13] + b[14] + b[15]
  );
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
