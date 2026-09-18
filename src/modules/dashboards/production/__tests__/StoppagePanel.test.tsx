import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import { StoppagePanel } from '../components/StoppagePanel';
import type { LineStoppage } from '../utils/lineTiles';

function stoppage(overrides: Partial<LineStoppage> = {}): LineStoppage {
  return {
    label: 'DOWNSTREAM',
    category: 'Machine',
    minutes: 86,
    count: 8,
    unrecovered: false,
    lines: ['Sidel'],
    ...overrides,
  };
}

function draw(stoppages: LineStoppage[], extra: { unrecoveredMinutes?: number } = {}) {
  const minutes = stoppages.reduce((sum, s) => sum + s.minutes, 0);
  const count = stoppages.reduce((sum, s) => sum + s.count, 0);
  return render(
    <ThemeProvider>
      <StoppagePanel
        stoppages={stoppages}
        stoppageCount={count}
        breakdownMinutes={minutes}
        unrecoveredMinutes={extra.unrecoveredMinutes ?? 0}
      />
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

describe('StoppagePanel', () => {
  it('names why the plant stopped, and for how long', () => {
    draw([
      stoppage({ label: 'DOWNSTREAM', minutes: 86, count: 8 }),
      stoppage({ label: 'powercut', category: 'Other', minutes: 45, count: 2 }),
    ]);

    expect(screen.getByText('DOWNSTREAM')).toBeInTheDocument();
    expect(screen.getByText('1h 26m')).toBeInTheDocument();
    expect(screen.getByText('powercut')).toBeInTheDocument();
    expect(screen.getByText('45m')).toBeInTheDocument();
    expect(screen.getByText(/2h 11m/)).toBeInTheDocument();
    expect(screen.getByText(/10 stoppages/)).toBeInTheDocument();
  });

  it('names every line a cause stopped, so one fix is one row', () => {
    draw([stoppage({ label: 'powercut', lines: ['6 Head', 'Sidel'], count: 2 })]);

    expect(screen.getByText(/Sidel/)).toBeInTheDocument();
    expect(screen.getByText(/6 Head/)).toBeInTheDocument();
    expect(screen.getByText(/×2/)).toBeInTheDocument();
  });

  it('separates the time nobody made up from the rest', () => {
    draw([stoppage({ label: 'HDPE', category: 'PM Short', minutes: 47, count: 1, unrecovered: true })], {
      unrecoveredMinutes: 47,
    });

    expect(screen.getByText(/47m never made up/)).toBeInTheDocument();
    expect(screen.getByLabelText('never made up')).toBeInTheDocument();
  });

  it('says nothing was logged rather than reading as a flawless day', () => {
    draw([]);

    expect(
      screen.getByText('No stoppage was logged against any line on this day.'),
    ).toBeInTheDocument();
  });
});
