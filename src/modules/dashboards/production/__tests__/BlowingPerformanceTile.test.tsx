import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import { BlowingPerformanceTile } from '../components/BlowingPerformanceTile';
import type { BlowingTile } from '../utils/blowingTiles';

const lead = { id: 1, runNumber: 2, machineName: 'Synergy 1/4' } as BlowingTile['lead'];

function tile(overrides: Partial<BlowingTile> = {}): BlowingTile {
  return {
    machineId: 3,
    machineName: 'Synergy 1/4',
    state: 'COMPLETED',
    runs: [lead],
    lead,
    preform: 'Frystal 40g',
    startedAt: '2026-09-17T03:03:00Z',
    endedAt: '2026-09-17T13:41:00Z',
    bottles: 25_867,
    rejects: 70,
    rejectPct: 0.27,
    yieldPct: 99.73,
    isLive: false,
    spanMinutes: 638,
    runningMinutes: 638,
    idleMinutes: 0,
    breakdownMinutes: 0,
    utilisationPct: 100,
    speed: 2_433,
    unitsPerBottle: 0.053,
    machineUnits: 105,
    utilityUnits: 960,
    totalUnits: 1_066,
    preformBoxes: 200,
    preformGrams: 802_000,
    goodBottles: 25_797,
    costPerBottle: 0.61,
    preformCost: 125_876,
    preformCostPerBottle: 6.28,
    blowingCost: 12_228,
    totalCostPerBottle: 6.92,
    benchmarkPerBottle: 0.5,
    netCost: 138_104,
    standards: { rejectPct: null, costPerBottle: null, unitsPerBottle: null },
    standardsSet: 0,
    operators: 1,
    contractLabour: 3,
    ownLabour: 1,
    labour: 4,
    stoppages: [],
    stoppageCount: 0,
    detailLoading: false,
    ...overrides,
  };
}

function draw(value: BlowingTile) {
  return render(
    <ThemeProvider>
      <BlowingPerformanceTile tile={value} benchmark={99} />
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

describe('BlowingPerformanceTile', () => {
  it('leads with what the counter says and what came out good', () => {
    draw(tile());

    expect(screen.getByText('Synergy 1/4')).toBeInTheDocument();
    expect(screen.getByText('Frystal 40g')).toBeInTheDocument();
    expect(screen.getByText('25,867')).toBeInTheDocument();
    expect(screen.getByText('99.7%')).toBeInTheDocument();
    expect(screen.getByText('25,797 good · 70 rejected')).toBeInTheDocument();
  });

  it('states the speed as unrated — blowing configures no bottles/hr', () => {
    draw(tile());

    expect(screen.getByText('2,433')).toBeInTheDocument();
    expect(screen.getByText('bottles/hr · unrated')).toBeInTheDocument();
  });

  it('says a target is missing rather than implying the figure was judged', () => {
    draw(tile({ benchmarkPerBottle: null }));

    expect(screen.getAllByText(/· no target/).length).toBe(3);
    expect(screen.getByText(/3 of 3 targets not set on this preform/)).toBeInTheDocument();
  });

  it('falls back to the costing service’s benchmark, and names it as one', () => {
    // The spec carries no cost target, but every costed run carries the
    // industry benchmark — worth grading against, worth labelling differently.
    draw(tile());

    expect(screen.getByText(/· benchmark ₹0.50/)).toBeInTheDocument();
  });

  it('shows what the machine drew — both metered buckets and the preform', () => {
    draw(tile());

    expect(screen.getByText('105')).toBeInTheDocument();
    expect(screen.getByText('960')).toBeInTheDocument();
    expect(screen.getByText('1,066')).toBeInTheDocument();
    expect(screen.getByText('200 boxes')).toBeInTheDocument();
    expect(screen.getByText('802 kg')).toBeInTheDocument();
  });

  it('splits the cost into the bought-in preform and what blowing added', () => {
    draw(tile());

    expect(screen.getByText('₹1.3 L · ₹6.28')).toBeInTheDocument();
    expect(screen.getByText('₹12K · ₹0.61')).toBeInTheDocument();
    expect(screen.getByText('₹6.92')).toBeInTheDocument();
  });

  it('names the crew the operator entered, by kind', () => {
    draw(tile());

    expect(screen.getByText('1 operator · 3 contract · 1 own')).toBeInTheDocument();
  });

  it('grades a figure against the target once the preform carries one', () => {
    draw(
      tile({
        costPerBottle: 0.62,
        standards: { rejectPct: null, costPerBottle: 0.5, unitsPerBottle: null },
        standardsSet: 1,
      }),
    );

    // The spec's own target wins over the benchmark, and is labelled as such.
    expect(screen.getByText(/· target ₹0.50/)).toBeInTheDocument();
    expect(screen.getByText(/2 of 3 targets not set/)).toBeInTheDocument();
  });

  it('splits the machine’s day into running, idle and breakdown', () => {
    draw(tile({ spanMinutes: 900, runningMinutes: 638, idleMinutes: 232, breakdownMinutes: 30 }));

    expect(screen.getByText('10h 38m')).toBeInTheDocument();
    expect(screen.getByText('3h 52m')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
  });

  it('names what stopped the machine', () => {
    draw(
      tile({
        breakdownMinutes: 50,
        stoppageCount: 2,
        stoppages: [
          {
            label: 'mould change',
            category: 'Machine',
            minutes: 50,
            count: 2,
            unrecovered: false,
            lines: ['Synergy 1/4'],
          },
        ],
      }),
    );

    expect(screen.getByText('mould change')).toBeInTheDocument();
    expect(screen.getByText('2 logged')).toBeInTheDocument();
  });
});
