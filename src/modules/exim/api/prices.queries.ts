/**
 * React-query hooks for the oil prices. A day's prices change once a day, so
 * reads are kept a few minutes; saving the sheet refreshes every price read.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { priceApi } from './prices.api';

export const PRICE_KEYS = {
  all: ['exim', 'prices'] as const,
  day: (date?: string) => ['exim', 'prices', 'day', date ?? 'latest'] as const,
  range: (from: string, to: string) => ['exim', 'prices', 'range', from, to] as const,
  sheet: () => ['exim', 'prices', 'sheet'] as const,
  rateDay: (date?: string) => ['exim', 'prices', 'rate-day', date ?? 'latest'] as const,
  rateRange: (from: string, to: string) => ['exim', 'prices', 'rate-range', from, to] as const,
  rateSheet: () => ['exim', 'prices', 'rate-sheet'] as const,
};

const FIVE_MINUTES = 5 * 60 * 1000;

export function usePriceDay(date?: string) {
  return useQuery({
    queryKey: PRICE_KEYS.day(date),
    queryFn: () => priceApi.day(date),
    staleTime: FIVE_MINUTES,
    placeholderData: (previous) => previous,
  });
}

export function usePriceRange(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: PRICE_KEYS.range(from, to),
    queryFn: () => priceApi.range(from, to),
    enabled: enabled && !!from && !!to,
    staleTime: FIVE_MINUTES,
    placeholderData: (previous) => previous,
  });
}

/** The sheet as it stands now: only when asked for (a preview before saving). */
export function usePriceSheet(enabled: boolean) {
  return useQuery({
    queryKey: PRICE_KEYS.sheet(),
    queryFn: () => priceApi.sheet(),
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export function useSavePriceSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => priceApi.saveSheet(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICE_KEYS.all }),
  });
}

export function useRateDay(date?: string) {
  return useQuery({
    queryKey: PRICE_KEYS.rateDay(date),
    queryFn: () => priceApi.rateDay(date),
    staleTime: FIVE_MINUTES,
    placeholderData: (previous) => previous,
  });
}

export function useRateRange(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: PRICE_KEYS.rateRange(from, to),
    queryFn: () => priceApi.rateRange(from, to),
    enabled: enabled && !!from && !!to,
    staleTime: FIVE_MINUTES,
    placeholderData: (previous) => previous,
  });
}

export function useRateSheet(enabled: boolean) {
  return useQuery({
    queryKey: PRICE_KEYS.rateSheet(),
    queryFn: () => priceApi.rateSheet(),
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export function useSaveRateSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => priceApi.saveRateSheet(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICE_KEYS.all }),
  });
}
