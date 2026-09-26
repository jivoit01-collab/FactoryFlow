/**
 * The production total on the Production Execution board.
 *
 * It sums the runs the filters leave on the board, so it follows the chosen
 * dates. A line still filling counts what its segments logged — its
 * `total_production` is only entered at completion — and a draft counts nothing.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';

import ExecutionDashboardPage from '../pages/ExecutionDashboardPage';
import type { ProductionRun } from '../types';

const run = (fields: Partial<ProductionRun>) =>
  ({
    sap_doc_entry: null,
    line: 1,
    line_name: 'L1 Clear Pack',
    item_code: '',
    date: '2026-09-25',
    created_at: '2026-09-25T02:30:00Z',
    total_production: '0.0',
    pieces_per_case: 20,
    litres_per_piece: '1.0000',
    status: 'COMPLETED',
    live_status: 'COMPLETED',
    ...fields,
  }) as ProductionRun;

const RUNS = [
  run({
    id: 1,
    run_number: 1,
    product: 'COLD PRESS 1 LTR 20 PCS',
    total_production: '1766.0',
    produced_cases: '1766.0',
  }),
  run({
    id: 2,
    run_number: 2,
    product: 'COLD PRESS SUNFLOWER 5 LTR 4 PCS',
    pieces_per_case: 4,
    litres_per_piece: '5.0000',
    produced_cases: '905.0',
    status: 'IN_PROGRESS',
    live_status: 'RUNNING',
  }),
  run({
    id: 3,
    run_number: 3,
    product: 'JIVO GOLD 1 LTR 20 PCS',
    produced_cases: '0.0',
    status: 'DRAFT',
    live_status: 'DRAFT',
  }),
  run({
    id: 4,
    run_number: 4,
    product: 'TEST SAMPLE',
    litres_per_piece: null,
    total_production: '100.0',
    produced_cases: '100.0',
  }),
];

const api = vi.hoisted(() => ({ runs: [] as ProductionRun[], filters: [] as unknown[] }));

vi.mock('../api', () => ({
  useLines: () => ({ data: [{ id: 1, name: 'L1 Clear Pack' }] }),
  useRuns: (filters: unknown) => {
    api.filters.push(filters);
    return { data: api.runs, isLoading: false };
  },
  useDeleteRun: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const writeFile = vi.hoisted(() => vi.fn());

vi.mock('xlsx', async (importOriginal) => ({
  ...(await importOriginal<typeof import('xlsx')>()),
  writeFile,
}));

vi.mock('@/core/store', () => ({
  useAppSelector: (select: (state: unknown) => unknown) =>
    select({ auth: { currentCompany: { company_code: 'JIVO_OIL', company_name: 'Jivo Oil' } } }),
}));

const renderBoard = (runs: ProductionRun[]) => {
  api.runs = runs;
  api.filters = [];
  return render(
    <MemoryRouter>
      <ExecutionDashboardPage />
    </MemoryRouter>,
  );
};

const totals = () => within(screen.getByRole('region', { name: 'Production totals' }));

afterEach(() => {
  vi.useRealTimers();
});

describe('Production Execution board totals', () => {
  it('adds completed runs and a running line’s cases so far, and leaves drafts out', () => {
    renderBoard(RUNS);

    const strip = totals();
    expect(strip.getByText('Production, all dates')).toBeInTheDocument();
    expect(strip.getByText('2,771 cases')).toBeInTheDocument();
    expect(strip.getByText('3 runs')).toBeInTheDocument();
    // 1766 x 20 x 1 L + 905 x 4 x 5 L; the sample has no litre size.
    expect(strip.getByText('53,420 L')).toBeInTheDocument();
    expect(strip.getByText('1 run without a litre size left out')).toBeInTheDocument();
    expect(strip.getByText('1,866 cases')).toBeInTheDocument();
    expect(strip.getByText('2 runs')).toBeInTheDocument();
    expect(strip.getByText('905 cases so far')).toBeInTheDocument();
    expect(strip.getByText('1 run')).toBeInTheDocument();
  });

  it('shows a running line’s cases so far in its own row too', () => {
    renderBoard(RUNS);

    const row = (n: number) => within(screen.getByText(`Run #${n}`).closest('tr') as HTMLElement);
    expect(row(1).getByText('1,766 cases')).toBeInTheDocument();
    expect(row(2).getByText('905 cases so far')).toBeInTheDocument();
    expect(row(3).getByText('No production yet')).toBeInTheDocument();
  });

  it('asks for the 1st of the month to today on “This month”, and says so', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 26, 15, 0));
    renderBoard(RUNS);

    fireEvent.click(screen.getByRole('button', { name: 'This month' }));

    expect(api.filters.at(-1)).toMatchObject({ date_from: '2026-09-01', date_to: '2026-09-26' });
    expect(totals().getByText('Production, 01-09-2026 to 26-09-2026')).toBeInTheDocument();
  });

  it('says when a line or status is narrowing the total as well', () => {
    renderBoard(RUNS);

    fireEvent.change(screen.getByPlaceholderText(/Search run #/), { target: { value: 'cold' } });

    expect(screen.getByText('Production, all dates · matching the filters')).toBeInTheDocument();
  });

  it('falls back to the entered total on a server that does not send cases so far', () => {
    renderBoard([run({ id: 9, run_number: 9, total_production: '250.5' })]);

    // The headline and the completed figure, both from the entered total.
    expect(totals().getAllByText('250.5 cases')).toHaveLength(2);
  });

  it('exports the runs on the board and their totals, named for the dates', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 26, 15, 0));
    writeFile.mockClear();
    renderBoard(RUNS);

    fireEvent.click(screen.getByRole('button', { name: 'This month' }));
    fireEvent.click(screen.getByRole('button', { name: /Export Excel/ }));

    expect(writeFile).toHaveBeenCalledTimes(1);
    const [workbook, fileName] = writeFile.mock.calls[0] as [XLSX.WorkBook, string];
    expect(fileName).toBe('production_jivo_oil_2026-09-01_to_2026-09-26.xlsx');
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Runs)).toHaveLength(RUNS.length);
    const totalsRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Totals, { header: 1 });
    expect(totalsRows).toContainEqual(['Company', 'Jivo Oil']);
    expect(totalsRows).toContainEqual(['Total', 2771, 3, 53420]);
  });

  it('has nothing to export on an empty board', () => {
    renderBoard([]);

    expect(screen.getByRole('button', { name: /Export Excel/ })).toBeDisabled();
  });
});
