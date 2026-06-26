/** Small shared helpers for building WMS records. */
import type { IsoDateTime, WmsId } from './types';

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
