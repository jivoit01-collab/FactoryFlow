/**
 * The Production QC dashboard is one day at a time, with a List / Sheet toggle.
 * The day and the view live in the address.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { format, subDays } from 'date-fns';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ProductionQCEntry,
  ProductionQCEntryCounts,
  ProductionQCEntryListParams,
} from '@/modules/qc/types/productionQC.types';

const data = vi.hoisted(() => ({
  entries: [] as ProductionQCEntry[],
  counts: { pending: 0, sent_back: 0, approved: 0 } as ProductionQCEntryCounts,
  listCalls: [] as ProductionQCEntryListParams[],
  countCalls: [] as unknown[],
  sheetCalls: [] as { params: ProductionQCEntryListParams; enabled: boolean }[],
}));

vi.mock('@/core/auth', () => ({
  usePermission: () => ({ hasPermission: () => false, hasAnyPermission: () => true }),
}));
vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionQCEntries: (params: ProductionQCEntryListParams) => {
    data.listCalls.push(params);
    return {
      data: data.entries,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  useProductionQCEntryCounts: (params: unknown) => {
    data.countCalls.push(params);
    return { data: data.counts, refetch: vi.fn() };
  },
  useProductionQCSheetEntries: (params: ProductionQCEntryListParams, enabled: boolean) => {
    data.sheetCalls.push({ params, enabled });
    return { data: enabled ? data.entries : [], isLoading: false, refetch: vi.fn() };
  },
  useProductionParameterTypes: () => ({ data: [] }),
}));
vi.mock('@/modules/qc/components/qcSections', () => ({ ProductionQCTabs: () => null }));
vi.mock('@/modules/qc/pages/productionQC/NewProductionQCEntryDialog', () => ({
  NewProductionQCEntryDialog: () => null,
}));

const { default: ProductionQCDashboardPage } =
  await import('../../../pages/productionQC/ProductionQCDashboardPage');

const today = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

const entry = (id: number): ProductionQCEntry =>
  ({
    id,
    line_id: 1,
    line_name: '10 Head',
    run_id: 1,
    run_number: 1,
    item_code: 'FG0000121',
    product: 'CANOLA OIL 1 LTR 20 PCS',
    parameter_type: { id: 3, code: 'OIL_ONLINE_MONITORING', name: 'Oil Plant On-line Monitoring' },
    checked_at: `${today}T12:24:00Z`,
    status: 'APPROVED',
    status_label: 'Approved',
    out_of_spec_count: 0,
    submitted_by_name: 'Test User',
    submitted_at: null,
    approved_by_name: 'Test User',
    approved_at: null,
    sent_back_by_name: null,
    sent_back_at: null,
    send_back_remarks: '',
    remarks: '',
    approval_remarks: '',
    results: [],
  }) as unknown as ProductionQCEntry;

function Where() {
  const { search } = useLocation();
  return <div data-testid="where">{search}</div>;
}

function renderAt(url = '/qc/production') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/qc/production"
          element={
            <>
              <ProductionQCDashboardPage />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('where').textContent;

beforeEach(() => {
  data.entries = [entry(4)];
  data.counts = { pending: 0, sent_back: 0, approved: 1, waiting_elsewhere: 0 };
  data.listCalls = [];
  data.countCalls = [];
  data.sheetCalls = [];
});

describe('ProductionQCDashboardPage — one day at a time', () => {
  it('opens on today, and asks for that day only', () => {
    renderAt();
    expect(screen.getByLabelText('Day')).toHaveValue(today);
    expect(data.listCalls.at(-1)).toEqual({ date: today });
    expect(data.countCalls.at(-1)).toEqual({ date: today });
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled();
  });

  it('moves a day back and forth, keeping the day in the address', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(where()).toBe(`?date=${yesterday}`);
    expect(data.listCalls.at(-1)).toEqual({ date: yesterday });

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(where()).toBe('');
  });

  it('points at checks still waiting on other days', () => {
    data.counts = { ...data.counts, waiting_elsewhere: 2, waiting_elsewhere_first_date: yesterday };
    renderAt();
    expect(screen.getByText(/2 entries on other days are still waiting/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Open / }));
    expect(where()).toBe(`?date=${yesterday}`);
  });
});

describe('ProductionQCDashboardPage — list and sheet', () => {
  it('shows the list by default and fetches no readings for it', () => {
    renderAt();
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('table')).toHaveTextContent('CANOLA OIL 1 LTR 20 PCS');
    expect(data.sheetCalls.every((call) => !call.enabled)).toBe(true);
  });

  it('switches to the sheet, one per parameter type, and remembers it', () => {
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Sheet' }));

    expect(where()).toBe('?view=sheet');
    expect(data.sheetCalls.at(-1)).toEqual({ params: { date: today }, enabled: true });
    expect(
      screen.getByRole('region', { name: /Oil Plant On-line Monitoring record/ }),
    ).toBeInTheDocument();
    // The status chips belong to the list.
    expect(screen.queryByRole('button', { name: /Pending Approval/ })).toBeNull();
  });

  it('opens straight on the sheet from the address', () => {
    renderAt(`/qc/production?view=sheet&date=${yesterday}`);
    expect(screen.getByRole('button', { name: 'Sheet' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Day')).toHaveValue(yesterday);
  });
});
