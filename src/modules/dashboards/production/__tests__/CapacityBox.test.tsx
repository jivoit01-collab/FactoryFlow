import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import { CapacityBox } from '../components/CapacityBox';

/** 2026-09-17: four lines, 33h 34m running, 5,520 cases against 4,110 rated. */
function draw(props: Partial<Parameters<typeof CapacityBox>[0]> = {}) {
  return render(
    <ThemeProvider>
      <CapacityBox
        produced={5_520}
        producedLitres={110_400}
        capacity={4_110}
        capacityLitres={82_200}
        capacityPct={134.3}
        capacityMinutes={2_014}
        idleMinutes={2_173}
        breakdownMinutes={0}
        stoppageCount={0}
        lines={4}
        unit="cases"
        unitNoun="case"
        {...props}
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

describe('CapacityBox', () => {
  it('puts what the lines made against what their rating says they could have', () => {
    draw();

    expect(screen.getByText('5,520')).toBeInTheDocument();
    expect(screen.getByText('4,110')).toBeInTheDocument();
    expect(screen.getByText('134%')).toBeInTheDocument();
  });

  it('names the running time the capacity was measured over', () => {
    // Not a standard day: the hours the lines were actually on.
    draw();

    expect(screen.getByText('4 lines ran · 33h 34m running')).toBeInTheDocument();
  });

  it('says how far ahead of the rating the day finished', () => {
    draw();

    expect(screen.getByText('1,410 cases ahead')).toBeInTheDocument();
  });

  it('says how far short when the lines are behind their rating', () => {
    draw({ produced: 3_000, capacity: 4_110, capacityPct: 73 });

    expect(screen.getByText('1,110 cases short')).toBeInTheDocument();
  });

  it('carries the hours that made nothing, now the strip is gone', () => {
    draw({ idleMinutes: 2_173, breakdownMinutes: 95, stoppageCount: 3 });

    expect(screen.getByText(/36h 13m/)).toBeInTheDocument();
    expect(screen.getByText(/1h 35m/)).toBeInTheDocument();
    expect(screen.getByText(/3 logged/)).toBeInTheDocument();
  });

  it('says no breakdown was logged rather than leaving the line blank', () => {
    draw();

    expect(screen.getByText('no breakdown logged')).toBeInTheDocument();
  });

  it('switches to litres with the rest of the board', () => {
    draw({ unit: 'litres' });

    expect(screen.getByText('1,10,400')).toBeInTheDocument();
    expect(screen.getByText('82,200')).toBeInTheDocument();
    expect(screen.getByText('28,200 ltr ahead')).toBeInTheDocument();
  });

  it('says why rather than showing a capacity it cannot stand behind', () => {
    // A total quietly short of a line reads as capacity the plant has not got.
    draw({ capacity: null, capacityPct: null });

    expect(screen.getByText(/carries no rating/)).toBeInTheDocument();
    expect(screen.queryByText('4,110')).not.toBeInTheDocument();
  });

  it('says so plainly on a day nothing ran', () => {
    draw({ lines: 0, capacity: null, capacityLitres: null, capacityPct: null });

    expect(screen.getByText('No line ran on this day.')).toBeInTheDocument();
  });
});
