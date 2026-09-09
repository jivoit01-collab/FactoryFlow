/**
 * The board's company-independence, pinned down.
 *
 * Warehouse Control is read on the factory floor, where the dock, the racking
 * and the trucks are shared by all three companies — so every figure on it has
 * to be the same figure whichever company the selector happens to hold. That is
 * a property of the *requests*, not of the panels, which is what these tests
 * assert: what each feed asks the server for, and that no cache key is split by
 * company.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';

import {
  useControlLinkingFeed,
  useControlNonMovingItemGroups,
  useControlNonMovingReport,
  useControlPlanBills,
  useControlWmsCollection,
  WAREHOUSE_CONTROL_QUERY_KEYS,
} from './warehouse-control.queries';

const getBills = vi.fn();
vi.mock('@/modules/dashboards/dispatch-plans/api', () => ({
  dispatchPlansApi: {
    getBills: (filters: unknown) => getBills(filters) as Promise<unknown>,
  },
}));

const getReport = vi.fn();
const getItemGroups = vi.fn();
vi.mock('@/modules/dashboards/non-moving/api', () => ({
  nonMovingApi: {
    getReport: (filters: unknown, companyCode?: string) =>
      getReport(filters, companyCode) as Promise<unknown>,
    getItemGroups: (companyCode?: string) => getItemGroups(companyCode) as Promise<unknown>,
  },
}));

const wmsList = vi.fn();
vi.mock('@/modules/wms', () => ({
  getActiveWmsAdapter: () => ({
    list: (collection: string, params?: unknown) => wmsList(collection, params) as Promise<unknown>,
  }),
}));

const TODAY = '2026-09-08';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  getBills.mockResolvedValue({ data: [], meta: {} });
  getReport.mockResolvedValue({ data: [], warehouse_summary: [] });
  getItemGroups.mockResolvedValue({ data: [] });
  wmsList.mockResolvedValue([]);
});

describe('the bills feeds are read across every company', () => {
  it("today's trucks-and-bills feed asks for all companies", async () => {
    renderHook(() => useControlLinkingFeed(TODAY), { wrapper });
    await waitFor(() => expect(getBills).toHaveBeenCalled());

    expect(getBills.mock.calls[0][0]).toMatchObject({ all_companies: true });
  });

  it('the pending-links feed asks for all companies', async () => {
    renderHook(() => useControlPlanBills(TODAY), { wrapper });
    await waitFor(() => expect(getBills).toHaveBeenCalled());

    expect(getBills.mock.calls[0][0]).toMatchObject({ all_companies: true });
  });

  it("windows today's feed on the dispatch date, not the invoice date", async () => {
    // Keyed on dispatch date the read returns exactly the set both panels fold
    // on — and it is what makes three companies affordable: the server resolves
    // the day's plans in its own DB instead of trawling a year of SAP invoices.
    renderHook(() => useControlLinkingFeed(TODAY), { wrapper });
    await waitFor(() => expect(getBills).toHaveBeenCalled());

    expect(getBills.mock.calls[0][0]).toMatchObject({
      by_dispatch_date: true,
      date_from: TODAY,
      date_to: TODAY,
    });
  });
});

describe('non-moving stock is pinned to one company', () => {
  it('names the pinned company on the report read', async () => {
    renderHook(() => useControlNonMovingReport({ age: 45, item_group: 105 }), { wrapper });
    await waitFor(() => expect(getReport).toHaveBeenCalled());

    expect(getReport.mock.calls[0][1]).toBe(COMPANY_CODES.JIVO_OIL);
  });

  it('resolves the item-group dropdown in that same company', async () => {
    // Group codes differ per SAP schema, so a code read from the active company
    // would name a different group in the pinned one.
    renderHook(() => useControlNonMovingItemGroups(), { wrapper });
    await waitFor(() => expect(getItemGroups).toHaveBeenCalled());

    expect(getItemGroups.mock.calls[0][0]).toBe(COMPANY_CODES.JIVO_OIL);
  });
});

describe('the WMS layout is read across every company', () => {
  it('asks the adapter for a cross-company list', async () => {
    renderHook(() => useControlWmsCollection('locations'), { wrapper });
    await waitFor(() => expect(wmsList).toHaveBeenCalled());

    expect(wmsList.mock.calls[0][0]).toBe('locations');
    expect(wmsList.mock.calls[0][1]).toEqual({ allCompanies: true });
  });
});

describe('cache keys', () => {
  /** Every company code, as it would appear anywhere inside a key. */
  function mentionsAnyCompany(key: readonly unknown[]): boolean {
    const flat = JSON.stringify(key);
    return Object.values(COMPANY_CODES).some((code) => flat.includes(code));
  }

  it('the cross-company feeds carry no company in their key', () => {
    // A company in the key would hold three copies of one answer and make the
    // board refetch — and flicker — on a switch that changes nothing.
    expect(mentionsAnyCompany(WAREHOUSE_CONTROL_QUERY_KEYS.linkingFeed(TODAY))).toBe(false);
    expect(mentionsAnyCompany(WAREHOUSE_CONTROL_QUERY_KEYS.planBills(TODAY))).toBe(false);
    expect(mentionsAnyCompany(WAREHOUSE_CONTROL_QUERY_KEYS.wmsCollection('pallets'))).toBe(false);
  });

  it('the pinned non-moving keys do name their company', () => {
    // The exception, deliberately: this read IS company-specific, so the code
    // belongs in the key — re-pinning must not serve the old company's answer.
    expect(
      mentionsAnyCompany(
        WAREHOUSE_CONTROL_QUERY_KEYS.nonMovingReport(COMPANY_CODES.JIVO_OIL, {
          age: 45,
          item_group: 105,
        }),
      ),
    ).toBe(true);
    expect(
      mentionsAnyCompany(WAREHOUSE_CONTROL_QUERY_KEYS.nonMovingItemGroups(COMPANY_CODES.JIVO_OIL)),
    ).toBe(true);
  });

  it('keeps the whole board under one prefix, so one invalidation refreshes it', () => {
    const prefix = WAREHOUSE_CONTROL_QUERY_KEYS.all[0];
    expect(WAREHOUSE_CONTROL_QUERY_KEYS.linkingFeed(TODAY)[0]).toBe(prefix);
    expect(WAREHOUSE_CONTROL_QUERY_KEYS.planBills(TODAY)[0]).toBe(prefix);
    expect(WAREHOUSE_CONTROL_QUERY_KEYS.wmsCollection('pallets')[0]).toBe(prefix);
    expect(
      WAREHOUSE_CONTROL_QUERY_KEYS.nonMovingReport(COMPANY_CODES.JIVO_OIL, {
        age: 45,
        item_group: 0,
      })[0],
    ).toBe(prefix);
    expect(WAREHOUSE_CONTROL_QUERY_KEYS.nonMovingItemGroups(COMPANY_CODES.JIVO_OIL)[0]).toBe(
      prefix,
    );
  });
});
