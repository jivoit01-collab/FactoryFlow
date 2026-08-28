import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyWarehouses } from '../userWarehouse.api';

const mine = vi.fn();
vi.mock('../userWarehouse.api', () => ({
  userWarehouseApi: { mine: () => mine() as Promise<MyWarehouses> },
}));

const { useWarehouseScope } = await import('../userWarehouse.queries');

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mine.mockReset();
});

describe('useWarehouseScope', () => {
  it('restricts to the warehouses the user manages', async () => {
    mine.mockResolvedValue({ unrestricted: false, warehouse_codes: ['BH-PF', 'BH-FG'] });
    const { result } = renderHook(() => useWarehouseScope(), { wrapper });

    await waitFor(() => expect(result.current.scopeKnown).toBe(true));
    expect(result.current.manages('BH-PF')).toBe(true);
    expect(result.current.manages('DL-FG')).toBe(false);
    expect(result.current.managesNothing).toBe(false);
  });

  it('matches regardless of case or stray spaces', async () => {
    mine.mockResolvedValue({ unrestricted: false, warehouse_codes: ['BH-PF'] });
    const { result } = renderHook(() => useWarehouseScope(), { wrapper });

    await waitFor(() => expect(result.current.scopeKnown).toBe(true));
    expect(result.current.manages(' bh-pf ')).toBe(true);
  });

  it('lets a superuser through everything', async () => {
    mine.mockResolvedValue({ unrestricted: true, warehouse_codes: [] });
    const { result } = renderHook(() => useWarehouseScope(), { wrapper });

    await waitFor(() => expect(result.current.scopeKnown).toBe(true));
    expect(result.current.manages('ANY-WH')).toBe(true);
    // An empty list plus unrestricted is NOT "manages nothing" — telling an
    // admin to go and see an administrator would be nonsense.
    expect(result.current.managesNothing).toBe(false);
  });

  it('reports a genuinely empty scope, so the screens can explain it', async () => {
    mine.mockResolvedValue({ unrestricted: false, warehouse_codes: [] });
    const { result } = renderHook(() => useWarehouseScope(), { wrapper });

    await waitFor(() => expect(result.current.scopeKnown).toBe(true));
    expect(result.current.managesNothing).toBe(true);
    expect(result.current.manages('BH-PF')).toBe(false);
  });

  // ---- the regression that matters -------------------------------------
  //
  // On 27 Aug 2026 the frontend shipped ahead of its backend,
  // /warehouse/my-warehouses/ returned 404, and code reading
  // `data?.warehouse_codes ?? []` concluded every user managed nothing. BST
  // creation and transfer raising stopped for everyone, while the server — which
  // had no scoping code at all — was enforcing nothing.

  it('FAILS OPEN when the endpoint is unavailable', async () => {
    mine.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
    const { result } = renderHook(() => useWarehouseScope(), { wrapper });

    await waitFor(() => expect(result.current.unrestricted).toBe(true));
    expect(result.current.manages('BH-PF')).toBe(true);
    expect(result.current.manages('ANY-WH')).toBe(true);
    // Crucially: never claim the user manages nothing when we simply could not
    // find out. That is the message that sent people to an administrator.
    expect(result.current.managesNothing).toBe(false);
    expect(result.current.scopeKnown).toBe(false);
  });

  it('fails open while still loading, rather than flashing a restriction', async () => {
    mine.mockReturnValue(new Promise(() => {})); // never settles
    const { result } = renderHook(() => useWarehouseScope(), { wrapper });

    expect(result.current.unrestricted).toBe(true);
    expect(result.current.manages('BH-PF')).toBe(true);
    expect(result.current.managesNothing).toBe(false);
  });
});
