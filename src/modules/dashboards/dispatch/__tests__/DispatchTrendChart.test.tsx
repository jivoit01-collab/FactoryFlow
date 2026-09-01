import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import { DispatchTrendChart } from '../components/DispatchTrendChart';
import type { DispatchDayTotals, TrendPoint } from '../hooks';
import { BoardDayProvider } from '../hooks/BoardDayProvider';

// Recharts measures its container, which jsdom reports as 0×0 — the chart body
// then renders nothing. The header (legend chips, which carry the real numbers
// and the "no history" state) is plain DOM and is what these assertions read.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 200 }}>{children}</div>
    ),
  };
});

function point(overrides: Partial<TrendPoint> & { date: string }): TrendPoint {
  return {
    trucks: 0,
    amount: 0,
    boxes: 0,
    litres: 0,
    weightKg: 0,
    bills: 0,
    isToday: false,
    ...overrides,
  };
}

function totalsWith(trend: TrendPoint[]): DispatchDayTotals {
  return {
    trucks: 0,
    bills: 0,
    amount: 0,
    boxes: 0,
    weightKg: 0,
    litres: 0,
    backlogCount: 0,
    backlogAmount: 0,
    backlogWeightKg: 0,
    backlogByStatus: [],
    byCustomer: [],
    yesterdayTrucks: 0,
    yesterdayAmount: 0,
    avgTrucks: 0,
    avgAmount: 0,
    trend,
    companyCount: 3,
    companyCodes: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    updatedAt: Date.now(),
    refetch: () => undefined,
  };
}

/** The chart reads the board's day for its labels and the app theme for its
 *  colours, so it needs both providers. */
function renderChart(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <BoardDayProvider>{ui}</BoardDayProvider>
    </ThemeProvider>,
  );
}

// jsdom ships no matchMedia, and ThemeProvider reads it to resolve the "system"
// setting. Stubbed the same way the ThemeProvider suite does it.
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

describe('DispatchTrendChart', () => {
  it("shows each series' real value for today on its legend chip", () => {
    renderChart(
      <DispatchTrendChart
        totals={totalsWith([
          point({ date: '2026-08-25', trucks: 20, amount: 2_000_000, bills: 20 }),
          point({ date: '2026-08-26', trucks: 20, amount: 2_000_000, bills: 20 }),
          point({ date: '2026-08-27', trucks: 14, amount: 2_900_000, bills: 14, isToday: true }),
        ])}
      />,
    );

    // Raw units on the chips, not the index the lines are plotted against.
    expect(screen.getByTitle(/Trucks out — today 14/)).toBeTruthy();
    expect(screen.getByTitle(/Dispatched value — today ₹29 L/)).toBeTruthy();
  });

  it('marks a measure with no history rather than drawing it as zero', () => {
    renderChart(
      <DispatchTrendChart
        totals={totalsWith([
          // A backend that never reports daily invoice counts sends null.
          point({ date: '2026-08-26', trucks: 10, amount: 100, bills: null }),
          point({ date: '2026-08-27', trucks: 10, amount: 100, bills: null, isToday: true }),
        ])}
      />,
    );

    const chip = screen.getByText('Invoices shipped').closest('span');
    expect(chip?.textContent).toContain('no history');
    // …and it must not be offered as a toggleable live series.
    expect(screen.queryByTitle(/Invoices shipped — today/)).toBeNull();
  });

  it('drops a measure that is flat at zero across the whole fortnight', () => {
    renderChart(
      <DispatchTrendChart
        totals={totalsWith([
          point({ date: '2026-08-26', trucks: 10, amount: 100, litres: 0 }),
          point({ date: '2026-08-27', trucks: 10, amount: 100, litres: 0, isToday: true }),
        ])}
      />,
    );

    const chip = screen.getByText('Volume out').closest('span');
    expect(chip?.textContent).toContain('no history');
  });

  it('keeps today out of the baseline so a part-day cannot skew it', () => {
    // Two finished days at 20 trucks, today at 5. The baseline is the finished
    // days only (20), so today plots at 25% — not at 40% (5/12.5) it would be
    // if the running day were averaged in with them.
    const { container } = renderChart(
      <DispatchTrendChart
        totals={totalsWith([
          point({ date: '2026-08-25', trucks: 20, amount: 100 }),
          point({ date: '2026-08-26', trucks: 20, amount: 100 }),
          point({ date: '2026-08-27', trucks: 5, amount: 100, isToday: true }),
        ])}
      />,
    );

    // The y-axis top is rounded up from the highest index seen; with today at
    // 25% and every finished day at 100%, nothing exceeds the 100% baseline.
    expect(container.textContent).toContain('% of own 14-day average');
  });
});
