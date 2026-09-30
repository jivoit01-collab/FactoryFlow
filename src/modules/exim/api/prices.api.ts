import { apiClient } from '@/core/api';

import type {
  PriceDay,
  PriceRange,
  PriceSaveResult,
  RateDay,
  RateRange,
  RateSaveResult,
  SheetPrices,
  SheetRates,
} from '../types';

export const PRICE_ENDPOINTS = {
  PRICES: '/exim/prices/',
  PRICE_RANGE: '/exim/prices/range/',
  PRICE_SHEET: '/exim/prices/sheet/',
  RATES: '/exim/pack-rates/',
  RATE_RANGE: '/exim/pack-rates/range/',
  RATE_SHEET: '/exim/pack-rates/sheet/',
} as const;

/**
 * The sheet is Google's: when it cannot be read the server answers 503 with the
 * reason, which the page shows where the prices would be. No global toast too.
 */
const QUIET = { suppressErrorToast: true };

export const priceApi = {
  async day(date?: string): Promise<PriceDay> {
    return (
      await apiClient.get<PriceDay>(PRICE_ENDPOINTS.PRICES, { params: date ? { date } : undefined })
    ).data;
  },
  async range(from: string, to: string): Promise<PriceRange> {
    return (await apiClient.get<PriceRange>(PRICE_ENDPOINTS.PRICE_RANGE, { params: { from, to } }))
      .data;
  },
  async sheet(): Promise<SheetPrices> {
    return (await apiClient.get<SheetPrices>(PRICE_ENDPOINTS.PRICE_SHEET, QUIET)).data;
  },
  async saveSheet(): Promise<PriceSaveResult> {
    return (await apiClient.post<PriceSaveResult>(PRICE_ENDPOINTS.PRICE_SHEET, {}, QUIET)).data;
  },
  async rateDay(date?: string): Promise<RateDay> {
    return (
      await apiClient.get<RateDay>(PRICE_ENDPOINTS.RATES, { params: date ? { date } : undefined })
    ).data;
  },
  async rateRange(from: string, to: string): Promise<RateRange> {
    return (await apiClient.get<RateRange>(PRICE_ENDPOINTS.RATE_RANGE, { params: { from, to } }))
      .data;
  },
  async rateSheet(): Promise<SheetRates> {
    return (await apiClient.get<SheetRates>(PRICE_ENDPOINTS.RATE_SHEET, QUIET)).data;
  },
  async saveRateSheet(): Promise<RateSaveResult> {
    return (await apiClient.post<RateSaveResult>(PRICE_ENDPOINTS.RATE_SHEET, {}, QUIET)).data;
  },
};
