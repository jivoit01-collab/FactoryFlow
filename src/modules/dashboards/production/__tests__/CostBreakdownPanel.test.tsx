import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import { CostBreakdownPanel } from '../components/CostBreakdownPanel';
import type { CostHeadRow, CostSlice } from '../hooks';

function head(overrides: Partial<CostHeadRow> & { key: string; label: string }): CostHeadRow {
  return { rate: '₹1,200 · Per Day', credit: false, fromBom: false, ...overrides };
}

function slice(overrides: Partial<CostSlice> = {}): CostSlice {
  return {
    total: 0,
    net: 0,
    wasteRecovery: 0,
    perCase: 0,
    costedCases: 0,
    runCount: 0,
    categories: [],
    heads: [],
    material: 0,
    includesMaterial: true,
    isLoading: false,
    isError: false,
    ...overrides,
  };
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

function renderPanel(value: CostSlice) {
  return render(
    <ThemeProvider>
      <CostBreakdownPanel cost={value} unitNoun="case" />
    </ThemeProvider>,
  );
}

describe('CostBreakdownPanel', () => {
  it('names the heads and what has to happen, rather than reading as broken', () => {
    renderPanel(
      slice({
        heads: [
          head({ key: 'LABOUR', label: 'Labour', rate: '₹650 · Per Person per Day' }),
          head({ key: 'MATERIAL', label: 'Material', rate: 'BOM snapshot', fromBom: true }),
        ],
      }),
    );

    expect(screen.getByText('Heads this day will be priced under')).toBeInTheDocument();
    expect(screen.getByText('Labour')).toBeInTheDocument();
    expect(screen.getByText('₹650 · Per Person per Day')).toBeInTheDocument();
    // The reason, not just the absence.
    expect(
      screen.getByText(/Cost lands on a run once its resources are entered/),
    ).toBeInTheDocument();
  });

  it('treats an empty Cost Master as the finding itself', () => {
    renderPanel(slice({ heads: [] }));

    expect(screen.getByText(/No cost heads are configured/)).toBeInTheDocument();
    expect(screen.queryByText('Heads this day will be priced under')).not.toBeInTheDocument();
  });

  it('explains an empty breakdown that is empty only because RM/PM is switched out', () => {
    renderPanel(
      slice({
        heads: [head({ key: 'LABOUR', label: 'Labour' })],
        material: 260_000,
        includesMaterial: false,
      }),
    );

    expect(screen.getByText(/All of this day's cost was bought-in material/)).toBeInTheDocument();
  });

  it('draws the real breakdown once the day has been costed', () => {
    renderPanel(
      slice({
        total: 100_000,
        net: 100_000,
        perCase: 32,
        costedCases: 3_100,
        runCount: 4,
        categories: [
          { key: 'MATERIAL', label: 'Material', amount: 80_000, credit: false, pct: 80 },
          { key: 'LABOUR', label: 'Labour', amount: 20_000, credit: false, pct: 20 },
        ],
      }),
    );

    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.queryByText('Heads this day will be priced under')).not.toBeInTheDocument();
  });
});
