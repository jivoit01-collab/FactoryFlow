import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SapReportDetail, SapReportParameter } from '../../api';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/core/auth/hooks/usePermission', () => ({ useHasPermission: () => false }));

const runMutate = vi.fn();
let report: SapReportDetail;

// The page's own data hooks, so the suite is about the filter row alone.
vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const idle = { mutate: vi.fn(), isPending: false, isSuccess: false, isError: false };
  return {
    ...actual,
    useSapReport: () => ({ data: report, isLoading: false, isError: false }),
    useRunSapReport: () => ({ ...idle, mutate: runMutate }),
    useExportSapReport: () => idle,
    useSapReportRuns: () => ({ data: undefined, isLoading: false }),
  };
});

import SapReportPage from '../../pages/SapReportPage';

function parameter(
  position: number,
  label: string,
  kind: SapReportParameter['kind'],
  default_value = '',
): SapReportParameter {
  return {
    position,
    label,
    kind,
    is_required: kind === 'DATE',
    default_value,
    help_text: '',
    has_lookup: false,
    occurrences: 1,
    is_customised: false,
  };
}

function reportWith(parameters: SapReportParameter[]): SapReportDetail {
  return {
    slug: 'inventory-audit-report',
    title: 'Inventory Audit Report',
    sap_name: 'Inventory Audit Report',
    display_name: '',
    description: '',
    sap_category_name: 'Factory App',
    statement_kind: 'SELECT',
    parameter_count: parameters.length,
    is_enabled: true,
    is_runnable: true,
    not_runnable_reason: '',
    is_missing_in_sap: false,
    sort_order: 0,
    last_run_at: null,
    last_synced_at: null,
    parameters,
    row_limit: null,
    effective_row_limit: 5000,
    sap_changed_at: null,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboards/sap-reports/inventory-audit-report']}>
        <Routes>
          <Route path="/dashboards/sap-reports/:slug" element={<SapReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SapReportPage — Today button', () => {
  afterEach(() => {
    vi.useRealTimers();
    runMutate.mockClear();
  });

  it('sets every date filter to today and leaves the others alone', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 29, 10, 39));
    report = reportWith([
      parameter(0, 'From date', 'DATE', '2026-09-01'),
      parameter(1, 'To date', 'DATE'),
      parameter(2, 'Item', 'TEXT', 'FG0000004'),
    ]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /today/i }));

    expect(screen.getByLabelText(/from date/i)).toHaveValue('2026-09-29');
    expect(screen.getByLabelText(/to date/i)).toHaveValue('2026-09-29');
    expect(screen.getByLabelText(/item/i)).toHaveValue('FG0000004');
    // Choosing the date is not running the report.
    expect(runMutate).not.toHaveBeenCalled();
  });

  it('uses the local date, not the UTC one, just after midnight', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // 00:15 local on 29 Sep is still 28 Sep in UTC for anyone east of Greenwich.
    vi.setSystemTime(new Date(2026, 8, 29, 0, 15));
    report = reportWith([parameter(0, 'From date', 'DATE')]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /today/i }));

    expect(screen.getByLabelText(/from date/i)).toHaveValue('2026-09-29');
  });

  it('is not offered on a report without date filters', () => {
    report = reportWith([parameter(0, 'Item', 'TEXT')]);
    renderPage();

    expect(screen.queryByRole('button', { name: /today/i })).not.toBeInTheDocument();
  });
});
