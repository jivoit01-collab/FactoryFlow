/**
 * Picking a second value in a column filter, without the drop-down closing.
 *
 * The register is filtered on the server, so every tick changes the query key.
 * A query that drops back to pending on a new key takes the table with it --
 * and the open filter drop-down lives in that table's header, so it closed on
 * the first tick and the next date had to be found again. The page it is
 * showing has to stay put until the next one arrives.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const entries = vi.fn();
vi.mock('../api/cashBook.api', () => ({
  cashBookApi: {
    entries: (params: unknown) => entries(params) as Promise<unknown>,
  },
}));

import type { CashEntryListParams } from '../api/cashBook.api';
import { useCashEntries } from '../api/cashBook.queries';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const FIRST_PICK: CashEntryListParams = { page: 1, filters: { date: ['2026-09-01'] } };
const SECOND_PICK: CashEntryListParams = {
  page: 1,
  filters: { date: ['2026-09-01', '2026-09-02'] },
};

function page(count: number) {
  return { results: [{ id: count }], count, page: 1, total_pages: 1 };
}

beforeEach(() => {
  vi.clearAllMocks();
  entries.mockResolvedValue(page(9));
});

describe('the register while a second filter value is being picked', () => {
  it('holds the rows on screen instead of falling back to loading', async () => {
    const { result, rerender } = renderHook((params: CashEntryListParams) => useCashEntries(params), {
      wrapper,
      initialProps: FIRST_PICK,
    });

    await waitFor(() => expect(result.current.data).toEqual(page(9)));

    // The second date, asked for before the first answer is superseded.
    entries.mockImplementation(() => new Promise(() => {}));
    rerender(SECOND_PICK);

    await waitFor(() => expect(entries).toHaveBeenCalledTimes(2));
    expect(entries.mock.calls[1][0]).toEqual(SECOND_PICK);

    // What the table renders from -- unchanged, so it is never unmounted and
    // the drop-down the tick was made in stays open.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(page(9));
    // ...and the page says so, rather than pretending the figures are current.
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.isFetching).toBe(true);
  });

  it('shows the loading state only on the first read of the book', async () => {
    const { result } = renderHook(() => useCashEntries(FIRST_PICK), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isPlaceholderData).toBe(false);
  });
});
