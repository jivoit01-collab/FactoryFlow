/**
 * Production QC entries are made on the floor and approved elsewhere, so the
 * dashboard's list and counts must refresh when the user comes back to the tab —
 * together — even though the app switches refresh-on-focus off by default.
 */

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_CONFIG } from '@/config/query.config';

const api = vi.hoisted(() => ({
  listEntries: vi.fn(),
  getEntryCounts: vi.fn(),
}));

vi.mock('@/modules/qc/api/productionQC/productionQC.api', () => ({ productionQCApi: api }));

const { useProductionQCEntries, useProductionQCEntryCounts } =
  await import('@/modules/qc/api/productionQC/productionQC.queries');

function Dashboard() {
  const range = { from_date: '2026-01-01', to_date: '2026-09-29' };
  useProductionQCEntries(range);
  useProductionQCEntryCounts(range);
  return null;
}

beforeEach(() => {
  api.listEntries.mockResolvedValue([]);
  api.getEntryCounts.mockResolvedValue({ pending: 0, sent_back: 0, approved: 0 });
});

afterEach(() => {
  focusManager.setFocused(undefined);
  vi.clearAllMocks();
});

describe('production QC dashboard refresh', () => {
  it('fetches the list and the counts again on coming back to the tab', async () => {
    // The app's own defaults, which turn refresh-on-focus off.
    const client = new QueryClient(QUERY_CONFIG);
    render(
      <QueryClientProvider client={client}>
        <Dashboard />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(api.listEntries).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(api.getEntryCounts).toHaveBeenCalledTimes(1));

    // Seconds later — well inside the stale time — the user returns to the tab.
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() => expect(api.listEntries).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.getEntryCounts).toHaveBeenCalledTimes(2));
  });
});
