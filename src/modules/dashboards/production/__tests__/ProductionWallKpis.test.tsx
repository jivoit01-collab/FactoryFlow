import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import { ProductionWallKpis } from '../components/ProductionWallKpis';
import type {
  CostSlice,
  MaterialSlice,
  ProductionBoard,
  ProductionDay,
  ReconSlice,
} from '../hooks';

const day: ProductionDay = {
  date: '2026-09-01',
  today: '2026-09-01',
  isToday: true,
  trendFrom: '2026-08-19',
  setDate: () => undefined,
  resetToToday: () => undefined,
};

function recon(overrides: Partial<ReconSlice> = {}): ReconSlice {
  return {
    rows: [],
    produced: 0,
    inProgress: 0,
    sap: 0,
    difference: 0,
    differencePct: 0,
    status: 'MATCHED',
    litres: { perRow: [], app: 0, sap: 0, unknown: 0 },
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

function cost(overrides: Partial<CostSlice> = {}): CostSlice {
  return {
    total: 0,
    net: 0,
    wasteRecovery: 0,
    perCase: 0,
    costedCases: 0,
    runCount: 0,
    categories: [],
    material: 0,
    includesMaterial: true,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

const material: MaterialSlice = {
  rows: [],
  should: 0,
  app: 0,
  sap: 0,
  differencePct: 0,
  status: 'MATCHED',
  isLoading: false,
  isError: false,
};

function board(overrides: Partial<ProductionBoard> = {}): ProductionBoard {
  return {
    runs: [],
    cases: 0,
    liveCases: 0,
    runningLines: 0,
    fg: recon(),
    waste: recon(),
    material,
    cost: cost(),
    trend: [],
    runsLoading: false,
    isFetching: false,
    updatedAt: Date.now(),
    refetch: () => undefined,
    ...overrides,
  };
}

function renderKpis(value: ProductionBoard) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <ProductionWallKpis board={value} day={day} unitNoun="case" />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

// jsdom ships no matchMedia, and ThemeProvider reads it to resolve the "system"
// setting. Stubbed the same way the dispatch wall's suites do it.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ProductionWallKpis', () => {
  it('counts live segment output into the day, not just closed runs', () => {
    renderKpis(board({ cases: 1_240, liveCases: 300, runningLines: 2, runs: [] }));

    expect(screen.getByText('1,240')).toBeInTheDocument();
    expect(screen.getByText('300 still on the line')).toBeInTheDocument();
  });

  it('names the missing setup instead of showing a confident zero cost', () => {
    renderKpis(board({ cost: cost({ total: 0 }) }));

    expect(screen.getByText('No cost on these runs yet')).toBeInTheDocument();
  });

  it('says so on the tile when the cost on show leaves RM/PM out', () => {
    renderKpis(
      board({
        cost: cost({
          total: 40_000,
          net: 40_000,
          perCase: 21,
          costedCases: 1_900,
          runCount: 3,
          material: 260_000,
          includesMaterial: false,
        }),
      }),
    );

    expect(screen.getByText('₹21')).toBeInTheDocument();
    expect(screen.getByText('₹40K conversion only · excl. RM/PM ₹2.6 L')).toBeInTheDocument();
  });

  it('will not price a case before any case has been closed', () => {
    renderKpis(
      board({
        cost: cost({ total: 8_140_000, net: 8_140_000, costedCases: 0, runCount: 8 }),
      }),
    );

    expect(screen.getByText('₹81 L spent · no cases closed yet')).toBeInTheDocument();
    // ...and never a per-case rate divided by nothing.
    expect(screen.queryByText('₹0')).not.toBeInTheDocument();
  });

  it('refuses to state a volume or a SAP gap when SAP could not be read', () => {
    renderKpis(board({ fg: recon({ isError: true }), waste: recon({ isError: true }) }));

    expect(
      screen.getByText('SAP unreachable — volume comes from the item master'),
    ).toBeInTheDocument();
    expect(screen.getByText('SAP could not be reached for reconciliation')).toBeInTheDocument();
    expect(screen.getByText('SAP could not be reached for scrap')).toBeInTheDocument();
  });
});
