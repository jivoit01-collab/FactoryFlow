/**
 * React-query hooks for Request Labour.
 *
 * Everything is keyed by date alone, never by date + shift: one call returns
 * both shifts, so switching Day/Night on the screen is a local filter and not a
 * refetch. Every mutation therefore invalidates the whole `labour-request` key
 * — a decision on a Day request and the Night totals come from the same cached
 * list.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  DecideRequestPayload,
  RaiseRequestPayload,
  UpdateRequestPayload,
} from '../types';
import { labourRequestApi } from './labourRequest.api';

export const LABOUR_REQUEST_KEYS = {
  all: ['labour-request'] as const,
  day: (date: string) => ['labour-request', 'day', date] as const,
  audit: (id: number) => ['labour-request', 'audit', id] as const,
};

export function useLabourRequestDay(date: string, enabled: boolean = true) {
  return useQuery({
    queryKey: LABOUR_REQUEST_KEYS.day(date),
    queryFn: () => labourRequestApi.listDay(date),
    enabled,
  });
}

export function useLabourRequestAudit(id: number | null) {
  return useQuery({
    queryKey: LABOUR_REQUEST_KEYS.audit(id as number),
    queryFn: () => labourRequestApi.audit(id as number),
    enabled: id !== null,
  });
}

/** Shared invalidation: every write refreshes the day list it came from. */
function useDayInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: LABOUR_REQUEST_KEYS.all });
}

export function useRaiseLabourRequest() {
  const invalidate = useDayInvalidation();
  return useMutation({
    mutationFn: (payload: RaiseRequestPayload) => labourRequestApi.raise(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateLabourRequest() {
  const invalidate = useDayInvalidation();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateRequestPayload & { id: number }) =>
      labourRequestApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useRemoveLabourRequest() {
  const invalidate = useDayInvalidation();
  return useMutation({
    mutationFn: (id: number) => labourRequestApi.remove(id),
    onSuccess: invalidate,
  });
}

export function useRestoreLabourRequest() {
  const invalidate = useDayInvalidation();
  return useMutation({
    mutationFn: (id: number) => labourRequestApi.restore(id),
    onSuccess: invalidate,
  });
}

export function useDecideLabourRequest() {
  const invalidate = useDayInvalidation();
  return useMutation({
    mutationFn: ({ id, ...payload }: DecideRequestPayload & { id: number }) =>
      labourRequestApi.decide(id, payload),
    onSuccess: invalidate,
  });
}

export function useReopenLabourRequest() {
  const invalidate = useDayInvalidation();
  return useMutation({
    mutationFn: (id: number) => labourRequestApi.reopen(id),
    onSuccess: invalidate,
  });
}
