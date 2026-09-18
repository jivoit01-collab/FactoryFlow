import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { RunMetrics } from '@/modules/production/execution/utils';
import { ThemeProvider } from '@/shared/contexts';

import { ProductionRunCard } from '../components/ProductionRunCard';
import { runTone } from '../constants/production-wall.constants';
import type { ProductionRunRow } from '../hooks';

function metrics(overrides: Partial<RunMetrics> = {}): RunMetrics {
  return {
    producedCases: 360,
    isLive: true,
    runningMinutes: 120,
    breakdownMinutes: 30,
    ratedSpeed: 4_000,
    piecesPerCase: 20,
    actualSpeed: 3_600,
    expectedCases: 400,
    efficiencyPct: 90,
    utilisationPct: 80,
    targetCases: 1_000,
    targetPct: 36,
    litresPerPiece: 1,
    litresPerCase: 20,
    producedLitres: 7_200,
    expectedLitres: 8_000,
    targetLitres: 20_000,
    rejectedCases: 0,
    reworkedCases: 0,
    isPartial: false,
    ...overrides,
  };
}

function row(overrides: Partial<ProductionRunRow> = {}): ProductionRunRow {
  return {
    id: 7,
    runNumber: 2,
    line: 'JP Machine',
    product: 'MUSTARD KACHI GHANI 1 LTR 20 PCS',
    itemCode: 'FG001',
    cases: 360,
    tone: runTone('RUNNING', 'IN_PROGRESS'),
    metrics: metrics(),
    cost: null,
    segments: [],
    breakdowns: [],
    supervisor: 'R. Kumar',
    operators: 'Two',
    labourCount: 8,
    otherManpowerCount: 2,
    plannedStartAt: null,
    plannedEndAt: null,
    detailLoading: false,
    ...overrides,
  };
}

function open(value: ProductionRunRow | null) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <ProductionRunCard
          run={value}
          unitNoun="case"
          benchmark={75}
          onClose={() => undefined}
        />
      </MemoryRouter>
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

describe('ProductionRunCard', () => {
  it('answers "900 cases out of what" — output, rating and the gap between them', () => {
    open(row());

    expect(screen.getByText('JP Machine')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('of 400 cases expected')).toBeInTheDocument();
    expect(screen.getByText('40 cases short of the rating.')).toBeInTheDocument();
    expect(screen.getByText('bottles/hr · rated 4,000')).toBeInTheDocument();
  });

  it('says the output is still climbing while a segment is open', () => {
    open(row());

    expect(screen.getByText('cases · still climbing')).toBeInTheDocument();
  });

  it('names the missing pack size instead of showing a wrong efficiency', () => {
    open(
      row({
        metrics: metrics({
          piecesPerCase: null,
          actualSpeed: null,
          expectedCases: null,
          efficiencyPct: null,
        }),
      }),
    );

    expect(screen.getByText('bottles per case unknown')).toBeInTheDocument();
    expect(
      screen.getByText(/SAP holds no bottles-per-case for this SKU/),
    ).toBeInTheDocument();
  });

  it('splits the run’s time between running and stopped', () => {
    open(row());

    expect(screen.getByText('80% producing')).toBeInTheDocument();
    expect(screen.getByText('running 2h')).toBeInTheDocument();
    expect(screen.getByText('stopped 30m')).toBeInTheDocument();
  });

  it('says a run has not been costed rather than pricing it at zero', () => {
    open(row());

    expect(screen.getByText(/has not been costed yet/)).toBeInTheDocument();
  });

  it('states the per-case rate off the costed cases, not the day’s output', () => {
    open(
      row({
        cost: {
          id: 1,
          raw_material_cost: '400000',
          labour_cost: '0',
          machine_cost: '0',
          electricity_cost: '0',
          water_cost: '0',
          gas_cost: '0',
          compressed_air_cost: '0',
          overhead_cost: '0',
          waste_recovery_credit: '0',
          total_cost: '450000',
          net_cost: '450000',
          produced_qty: '300',
          per_unit_cost: '1500',
          calculated_at: '2026-09-17T12:00:00Z',
          lines: [],
        },
      }),
    );

    expect(screen.getByText('300 cases costed')).toBeInTheDocument();
    expect(screen.getByText('₹1,500')).toBeInTheDocument();
  });

  it('admits the figures are the run’s stored totals while the detail loads', () => {
    open(row({ detailLoading: true }));

    expect(screen.getByText(/stored totals until they arrive/)).toBeInTheDocument();
  });

  it('says so when the run has dropped off the day being shown', () => {
    open(null);

    expect(screen.getByText('This run has left the board')).toBeInTheDocument();
  });
});
