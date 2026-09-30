import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StockAuditPage from '../pages/StockAuditPage';
import type { StockAuditDetail, StockAuditLine } from '../types';

const line = (over: Partial<StockAuditLine>): StockAuditLine => ({
  id: 1,
  item_code: 'PM0000010',
  item_name: 'CAPS 28MM RED',
  category: 'PM',
  uom: 'PCS',
  in_sap: true,
  counted_qty: null,
  count_entries: 0,
  ...over,
});

const CAPS = line({ id: 1, counted_qty: '10', count_entries: 1, sap_qty: '32', difference: '-22' });
const OIL = line({
  id: 2,
  item_code: 'RM0000001',
  item_name: 'CANOLA OIL',
  category: 'RM',
  uom: 'KG',
  sap_qty: '1500.5',
  difference: null,
});
const FOUND = line({
  id: 3,
  item_code: 'PM0000099',
  item_name: 'CAPS 38MM',
  in_sap: false,
  counted_qty: '5',
  count_entries: 1,
  sap_qty: '0',
  difference: '5',
});
const MATCH = line({
  id: 4,
  item_code: 'FG0000100',
  category: 'FG',
  counted_qty: '400',
  count_entries: 2,
  sap_qty: '400',
  difference: '0',
});

const AUDIT: StockAuditDetail = {
  id: 7,
  warehouse_code: 'BH-PM',
  warehouse_name: 'PM Store',
  status: 'OPEN',
  notes: '',
  snapshot_at: '2026-09-30T04:00:00Z',
  started_by: 'manager',
  started_at: '2026-09-30T04:00:00Z',
  closed_by: '',
  closed_at: null,
  can_refresh: false,
  summary: {
    by_category: {
      PM: { lines: 2, counted: 2, different: 2 },
      RM: { lines: 1, counted: 0, different: 0 },
      FG: { lines: 1, counted: 1, different: 0 },
    },
    total: { lines: 4, counted: 3, different: 2 },
  },
};

const state = vi.hoisted(() => ({
  audit: null as unknown,
  lines: [] as unknown[],
  seesSap: true,
  perms: [] as string[],
  askedLines: [] as unknown[],
}));
const addCount = vi.hoisted(() => vi.fn());
const closeAudit = vi.hoisted(() => vi.fn());

vi.mock('../api', () => ({
  stockAuditApi: { exportCsv: vi.fn() },
  useStockAudit: () => ({ data: state.audit, isLoading: false }),
  useStockAuditLines: (_id: number, filters: unknown) => {
    state.askedLines.push(filters);
    return {
      data: {
        count: state.lines.length,
        page: 1,
        page_size: 50,
        sees_sap: state.seesSap,
        results: state.lines,
      },
      isLoading: false,
    };
  },
  useAddCount: () => ({ mutateAsync: addCount, isPending: false }),
  useCloseAudit: () => ({ mutateAsync: closeAudit, isPending: false }),
  useRefreshFromSap: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLineCounts: () => ({ data: [], isLoading: false }),
  useVoidCount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSapItemSearch: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/core/auth', () => ({
  usePermission: () => ({
    hasPermission: (p: string) => state.perms.includes(p),
    hasAnyPermission: (ps: string[]) => ps.some((p) => state.perms.includes(p)),
  }),
}));

const confirm = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock('@/shared/components', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  confirmDialog: confirm,
}));

const COUNT = 'stock_audit.can_count_stock_audit';
const MANAGE = 'stock_audit.can_manage_stock_audit';

const renderAudit = () =>
  render(
    <MemoryRouter initialEntries={['/warehouse-ops/stock-audit/7']}>
      <Routes>
        <Route path="/warehouse-ops/stock-audit/:auditId" element={<StockAuditPage />} />
      </Routes>
    </MemoryRouter>,
  );

const row = (code: string) => within(screen.getByText(code).closest('tr') as HTMLElement);

describe('Stock audit', () => {
  beforeEach(() => {
    state.audit = AUDIT;
    state.lines = [CAPS, OIL, FOUND, MATCH];
    state.seesSap = true;
    state.perms = [COUNT];
    state.askedLines.length = 0;
    addCount.mockReset();
    closeAudit.mockReset();
    confirm.mockClear();
  });

  it('adds what was found to on hand', async () => {
    addCount.mockResolvedValue({ ...CAPS, counted_qty: '30', count_entries: 2 });
    renderAudit();

    fireEvent.change(row('PM0000010').getByLabelText('Quantity for PM0000010'), {
      target: { value: '20' },
    });
    fireEvent.click(row('PM0000010').getByLabelText('Add to PM0000010'));

    await waitFor(() => expect(addCount).toHaveBeenCalledWith({ lineId: 1, qty: '20' }));
  });

  it('removes what was counted by mistake from on hand', async () => {
    addCount.mockResolvedValue({ ...CAPS, counted_qty: '7', count_entries: 2 });
    renderAudit();

    fireEvent.change(row('PM0000010').getByLabelText('Quantity for PM0000010'), {
      target: { value: '3' },
    });
    fireEvent.click(row('PM0000010').getByLabelText('Remove from PM0000010'));

    await waitFor(() => expect(addCount).toHaveBeenCalledWith({ lineId: 1, qty: '-3' }));
  });

  it('will not remove more than is on hand', () => {
    renderAudit();
    fireEvent.change(row('PM0000010').getByLabelText('Quantity for PM0000010'), {
      target: { value: '11' },
    });
    fireEvent.click(row('PM0000010').getByLabelText('Remove from PM0000010'));
    expect(addCount).not.toHaveBeenCalled();
  });

  it('has nothing to remove from before anything is on hand', () => {
    renderAudit();
    fireEvent.change(row('RM0000001').getByLabelText('Quantity for RM0000001'), {
      target: { value: '1' },
    });
    expect(row('RM0000001').getByLabelText('Remove from RM0000001')).toBeDisabled();
  });

  it('reads SAP, then on hand, then the difference', () => {
    renderAudit();
    const heads = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(heads).toEqual(['Item', 'Type', 'SAP', 'On Hand', 'Add / Remove', 'Difference']);
  });

  it('shows SAP and the difference in words to those who may see them', () => {
    renderAudit();
    expect(row('PM0000010').getByText('32')).toBeInTheDocument();
    expect(row('PM0000010').getByText('-22')).toBeInTheDocument();
    expect(row('PM0000099').getByText('+5')).toBeInTheDocument();
    expect(row('FG0000100').getByText('0', { selector: 'td' })).toBeInTheDocument();
    expect(row('PM0000099').getByText('New')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Differences' })).toBeInTheDocument();
  });

  it('hides SAP from a counter without the right', () => {
    state.seesSap = false;
    state.lines = [line({ id: 1, counted_qty: '10', count_entries: 1 })];
    renderAudit();
    expect(screen.queryByText('SAP', { selector: 'th' })).not.toBeInTheDocument();
    expect(screen.queryByText('Difference', { selector: 'th' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Differences' })).not.toBeInTheDocument();
  });

  it('searches and filters the lines', async () => {
    renderAudit();
    fireEvent.change(screen.getByLabelText('Search items'), { target: { value: 'caps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Not counted' }));
    await waitFor(() =>
      expect(state.askedLines.at(-1)).toEqual({
        search: 'caps',
        category: '',
        state: 'uncounted',
        page: 1,
      }),
    );
    fireEvent.click(screen.getByText('Packing Material'));
    expect(state.askedLines.at(-1)).toMatchObject({ category: 'PM' });
  });

  it('shows progress by type', () => {
    renderAudit();
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('lets only a manager close it', async () => {
    renderAudit();
    expect(screen.queryByRole('button', { name: /^Close$/ })).not.toBeInTheDocument();
  });

  it('asks before closing with items still uncounted', async () => {
    state.perms = [COUNT, MANAGE];
    closeAudit.mockResolvedValue({});
    renderAudit();
    fireEvent.click(screen.getByRole('button', { name: /^Close$/ }));
    await waitFor(() => expect(closeAudit).toHaveBeenCalled());
    expect(confirm.mock.calls[0][0].description).toMatch(/1 items are still not counted/);
  });

  it('takes no counts once closed', () => {
    state.audit = { ...AUDIT, status: 'CLOSED', closed_at: '2026-09-30T09:00:00Z', closed_by: 'm' };
    renderAudit();
    expect(screen.queryByLabelText('Quantity for PM0000010')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add item/ })).not.toBeInTheDocument();
  });

  it('offers no counting to someone who may only look', () => {
    state.perms = ['stock_audit.can_view_stock_audit'];
    renderAudit();
    expect(screen.queryByLabelText('Quantity for PM0000010')).not.toBeInTheDocument();
  });
});
