import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import { PerformanceTrend } from '../components/PerformanceTrend';
import type { TrendPoint } from '../utils/trend';

const points: TrendPoint[] = [
  { date: '2026-09-15', value: 4_400, isShown: false },
  { date: '2026-09-16', value: 0, isShown: false },
  { date: '2026-09-17', value: 5_520, isShown: false },
  { date: '2026-09-18', value: 2_530, isShown: true },
];

function draw(value: TrendPoint[] = points, average = 4_150) {
  return render(
    <ThemeProvider>
      <PerformanceTrend points={value} noun="cases" average={average} />
    </ThemeProvider>,
  );
}

// jsdom ships no matchMedia, and ThemeProvider reads it to resolve the "system"
// setting. Stubbed the same way the other wall suites do it.
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

describe('PerformanceTrend', () => {
  it('draws a bar with real height for every day that ran', () => {
    const { container } = draw();

    // The bug this replaces: every bar resolved to 0% because its column had
    // collapsed to the height of its label.
    const heights = [...container.querySelectorAll<HTMLElement>('[style*="height"]')].map(
      (bar) => Number.parseFloat(bar.style.height),
    );

    expect(heights).toHaveLength(4);
    expect(heights.filter((height) => height > 10)).toHaveLength(3);
    // The best day of the window is the tallest, and nothing exceeds the ceiling.
    expect(Math.max(...heights)).toBeCloseTo(82, 0);
  });

  it('keeps a sliver for a day nothing ran on, so the gap is visible', () => {
    const { container } = draw();
    const heights = [...container.querySelectorAll<HTMLElement>('[style*="height"]')].map(
      (bar) => Number.parseFloat(bar.style.height),
    );

    expect(Math.min(...heights)).toBe(2);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('names the window and the plant’s own habit', () => {
    draw();

    expect(screen.getByText('Last 4 days')).toBeInTheDocument();
    expect(screen.getByText('4,150 cases')).toBeInTheDocument();
    expect(screen.getByText(/over 3 days that ran/)).toBeInTheDocument();
  });

  it('says so rather than drawing an empty plot when nothing ran', () => {
    draw(
      points.map((point) => ({ ...point, value: 0 })),
      0,
    );

    expect(screen.getByText('nothing ran in this window')).toBeInTheDocument();
  });

  it('labels each day and marks the one the tiles below belong to', () => {
    draw();

    expect(screen.getAllByText(/^18 Sep/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^15 Sep/).length).toBeGreaterThan(0);
    // The shown day's figure is the bold one.
    expect(screen.getByText('2.5K')).toBeInTheDocument();
  });
});
