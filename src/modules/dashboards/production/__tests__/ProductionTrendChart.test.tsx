import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import { ProductionTrendChart } from '../components/ProductionTrendChart';
import type { ProductionTrendPoint } from '../hooks';

// Recharts measures its container, which jsdom reports as 0×0 — the chart body
// then renders nothing. The header (the RM/PM switch, the badges) and the
// legend are plain DOM and are what these assertions read.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 240 }}>{children}</div>
    ),
  };
});

function point(overrides: Partial<ProductionTrendPoint> & { date: string }): ProductionTrendPoint {
  return {
    cases: 0,
    cost: 0,
    perCase: 0,
    material: 0,
    isToday: false,
    costMissing: false,
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

const TREND: ProductionTrendPoint[] = [
  point({ date: '2026-08-31', cases: 3_000, cost: 120_000, perCase: 40, material: 90_000 }),
  point({
    date: '2026-09-01',
    cases: 1_900,
    cost: 76_000,
    perCase: 40,
    material: 57_000,
    isToday: true,
  }),
];

function renderChart(includeMaterial: boolean, onToggle = () => undefined) {
  return render(
    <ThemeProvider>
      <ProductionTrendChart
        trend={TREND}
        unitNoun="case"
        includeMaterial={includeMaterial}
        onToggleMaterial={onToggle}
      />
    </ThemeProvider>,
  );
}

describe('ProductionTrendChart · RM/PM switch', () => {
  it('reads as pressed while the full cost is on show', () => {
    renderChart(true);

    expect(screen.getByRole('button', { name: /RM\/PM/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('excl. RM/PM')).not.toBeInTheDocument();
  });

  it('flags the legend once the cost line drops bought-in material', () => {
    renderChart(false);

    expect(screen.getByRole('button', { name: /RM\/PM/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('excl. RM/PM')).toBeInTheDocument();
  });

  it('hands the switch back to the board rather than keeping its own basis', () => {
    const onToggle = vi.fn();
    renderChart(true, onToggle);

    fireEvent.click(screen.getByRole('button', { name: /RM\/PM/ }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
