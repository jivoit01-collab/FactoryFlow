import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { MachineBreakdown } from '@/modules/production/execution/types';
import { ThemeProvider } from '@/shared/contexts';

import { LinePerformanceTile } from '../components/LinePerformanceTile';
import type { LineTile } from '../utils/lineTiles';

const lead = {
  id: 7,
  runNumber: 2,
  line: 'JP Machine',
  lineId: 1,
} as LineTile['lead'];

function tile(overrides: Partial<LineTile> = {}): LineTile {
  return {
    key: '1::FG001',
    lineId: 1,
    lineName: 'JP Machine',
    state: 'RUNNING',
    runs: [lead],
    lead,
    product: 'MUSTARD KACHI GHANI 1 LTR 20 PCS',
    itemCode: 'FG001',
    startedAt: '2026-09-17T06:30:00Z',
    endedAt: '2026-09-17T11:06:00Z',
    cases: 360,
    litres: 7_200,
    expectedLitres: 8_000,
    targetLitres: 20_000,
    actualLitresPerHour: 3_600,
    ratedLitresPerHour: 4_000,
    isLive: true,
    runningMinutes: 120,
    breakdownMinutes: 30,
    spanMinutes: 150,
    idleMinutes: 0,
    utilisationPct: 80,
    expectedCases: 400,
    efficiencyPct: 90,
    ratedRuns: 1,
    actualSpeed: 3_600,
    ratedSpeed: 4_000,
    ratedFrom: 'run',
    targetCases: 1_000,
    targetPct: 36,
    rejectedCases: 12,
    reworkedCases: 0,
    netCost: null,
    costedCases: 0,
    supervisor: 'R. Kumar',
    operators: '',
    labourCount: 8,
    otherManpowerCount: 2,
    openBreakdown: null,
    stoppages: [],
    stoppageCount: 0,
    configCount: 2,
    detailLoading: false,
    ...overrides,
  };
}

function draw(value: LineTile, unit: 'cases' | 'litres' = 'cases') {
  return render(
    <ThemeProvider>
      <LinePerformanceTile
        tile={value}
        unitNoun="case"
        unit={unit}
        benchmark={75}
        onOpen={() => undefined}
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

describe('LinePerformanceTile', () => {
  it('reads output against the rating, not on its own', () => {
    draw(tile());

    expect(screen.getByText('JP Machine')).toBeInTheDocument();
    expect(screen.getByText('360')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText(/400 cases expected in 2h/)).toBeInTheDocument();
    expect(screen.getByText('of 4,000')).toBeInTheDocument();
  });

  it('carries the line’s whole picture — target, cost, quality and crew', () => {
    draw(tile({ netCost: 450_000, costedCases: 300, reworkedCases: 4 }));

    expect(screen.getByText('1,000 · 36%')).toBeInTheDocument();
    expect(screen.getByText('₹4.5 L · ₹1,500/case')).toBeInTheDocument();
    expect(screen.getByText('12 · 4 reworked')).toBeInTheDocument();
    expect(screen.getByText('R. Kumar · 8 labour · +2')).toBeInTheDocument();
  });

  it('turns the expectation red, and says by how much, when the line is behind', () => {
    const { container } = draw(tile({ cases: 360, expectedCases: 400 }));

    const caption = screen.getByText(/400 cases expected in 2h/);
    expect(caption).toHaveTextContent('40 short');
    expect(caption.className).toMatch(/text-rose-600/);
    expect(container).toBeTruthy();
  });

  it('leaves the expectation in the quiet ink when the line is ahead of it', () => {
    const caption = (() => {
      draw(tile({ cases: 500, expectedCases: 400 }));
      return screen.getByText(/400 cases expected in 2h/);
    })();

    expect(caption).not.toHaveTextContent('short');
    expect(caption.className).toMatch(/text-muted-foreground/);
  });

  it('names the run and the hours the line was on it', () => {
    draw(tile());

    // A finished line reads first spell to last; a running one reads "–now".
    expect(screen.getByText(/FG001 · run #2 · \d{2}:\d{2}–\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('leaves a running line’s finish open rather than stamping one', () => {
    draw(tile({ endedAt: null }));

    expect(screen.getByText(/\d{2}:\d{2}–now/)).toBeInTheDocument();
  });

  it('says which day a shift that ran past midnight finished on', () => {
    // 6 Head on 2026-09-17: started 08:33, last spell closed 11:04 the NEXT
    // morning. Without the marker that window reads as two and a half hours
    // over a figure claiming eleven hours of running.
    draw(
      tile({
        startedAt: '2026-09-17T06:30:00Z',
        endedAt: '2026-09-18T05:34:00Z',
        runningMinutes: 670,
      }),
    );

    expect(screen.getByText(/\d{2}:\d{2}–\d{2}:\d{2} \+1d/)).toBeInTheDocument();
  });

  it('counts the whole tile in litres when the board is switched', () => {
    draw(
      tile({
        cases: 1_509,
        litres: 30_180,
        expectedCases: 655,
        expectedLitres: 13_100,
        targetCases: 1_200,
        targetLitres: 24_000,
        actualSpeed: 7_331,
        actualLitresPerHour: 7_331,
        ratedSpeed: 3_180,
        ratedLitresPerHour: 3_180,
      }),
      'litres',
    );

    expect(screen.getByText('30,180')).toBeInTheDocument();
    expect(screen.getByText(/^ltr/)).toBeInTheDocument();
    expect(screen.getByText(/13,100 ltr expected in 2h/)).toBeInTheDocument();
    expect(screen.getByText('24,000 · 36%')).toBeInTheDocument();
    expect(screen.getByText('Litres/hr')).toBeInTheDocument();
  });

  it('shows a dash, never a zero, for a SKU SAP holds no volume for', () => {
    draw(tile({ litres: null, expectedLitres: null, targetLitres: null }), 'litres');

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText(/no volume in SAP/)).toBeInTheDocument();
  });

  it('names the runs a split job was booked under, not just how many', () => {
    // A tile only holds more than one run when the floor split ONE SKU across
    // two records, and the numbers are what tie it to the run screen.
    draw(
      tile({
        runs: [
          { ...lead, runNumber: 3 },
          { ...lead, runNumber: 2 },
        ],
      }),
    );

    expect(screen.getByText(/FG001 · runs #2, #3/)).toBeInTheDocument();
  });

  it('says when the rating came from the line’s preset rather than the run', () => {
    draw(tile({ ratedFrom: 'config' }));

    expect(screen.getByText('of 4,000 · preset')).toBeInTheDocument();
  });

  it('names what is holding the line up while it is down', () => {
    draw(
      tile({
        state: 'BREAKDOWN',
        breakdownMinutes: 95,
        stoppageCount: 1,
        stoppages: [
          { label: 'Head jam', category: 'Machine', minutes: 95, count: 1, unrecovered: false, lines: ['JP Machine'] },
        ],
        openBreakdown: {
          id: 5,
          is_active: true,
          end_time: null,
          breakdown_category_name: 'Capping',
          start_time: '2026-09-17T11:00:00Z',
          reason: 'Head jam',
          maintenance_work_order_no: 'WO-123',
        } as MachineBreakdown,
      }),
    );

    // The state chip and the time figure now both say Breakdown.
    expect(screen.getAllByText('Breakdown').length).toBe(2);
    expect(screen.getAllByText('1h 35m').length).toBeGreaterThan(0);
    expect(screen.getByText('1 logged')).toBeInTheDocument();
    expect(screen.getByText(/Capping since .* · Head jam · WO WO-123/)).toBeInTheDocument();
  });

  it('says no stoppage was LOGGED rather than awarding a clean shift', () => {
    draw(tile({ breakdownMinutes: 0 }));

    expect(screen.getByText('none logged')).toBeInTheDocument();
  });

  it('names what stopped the line, worst cause first', () => {
    draw(
      tile({
        breakdownMinutes: 95,
        stoppageCount: 4,
        stoppages: [
          { label: 'DOWNSTREAM', category: 'Machine', minutes: 50, count: 2, unrecovered: false, lines: ['JP Machine'] },
          { label: 'powercut', category: 'Other', minutes: 30, count: 1, unrecovered: false, lines: ['JP Machine'] },
          { label: 'capstuck', category: 'Other', minutes: 15, count: 1, unrecovered: false, lines: ['JP Machine'] },
        ],
      }),
    );

    expect(screen.getByText('4 logged')).toBeInTheDocument();
    expect(screen.getByText('DOWNSTREAM')).toBeInTheDocument();
    expect(screen.getByText('50m')).toBeInTheDocument();
    expect(screen.getByText('powercut')).toBeInTheDocument();
  });

  it('keeps the tile short when a line stopped for many different causes', () => {
    draw(
      tile({
        breakdownMinutes: 100,
        stoppageCount: 5,
        stoppages: [
          { label: 'DOWNSTREAM', category: 'Machine', minutes: 40, count: 1, unrecovered: false, lines: [] },
          { label: 'powercut', category: 'Other', minutes: 30, count: 1, unrecovered: false, lines: [] },
          { label: 'capstuck', category: 'Other', minutes: 20, count: 1, unrecovered: false, lines: [] },
          { label: 'HDPE', category: 'PM Short', minutes: 10, count: 1, unrecovered: true, lines: [] },
          { label: 'label jam', category: 'Machine', minutes: 5, count: 1, unrecovered: false, lines: [] },
        ],
      }),
    );

    expect(screen.getByText('+2 more causes')).toBeInTheDocument();
    expect(screen.queryByText('HDPE')).not.toBeInTheDocument();
  });

  it('admits when only some of the line’s runs are rated', () => {
    draw(tile({ ratedRuns: 1, runs: [lead, lead, lead] }));

    expect(screen.getByText('1 of 3 runs carry a rating')).toBeInTheDocument();
  });

  it('says a run is not costed rather than pricing it at zero', () => {
    draw(tile());

    expect(screen.getByText('not costed yet')).toBeInTheDocument();
  });

  it('opens the line’s run when clicked', () => {
    draw(tile());

    expect(screen.getByRole('button', { name: /open the run/i })).toBeInTheDocument();
  });
});
