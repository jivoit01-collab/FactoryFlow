import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PostToSapDialog } from '../components/PostToSapDialog';
import StockAuditPage from '../pages/StockAuditPage';
import type { AuditActions, PostingPreview, StockAuditDetail, StockAuditLine } from '../types';

const line = (over: Partial<StockAuditLine>): StockAuditLine => ({
  id: 1,
  item_code: 'PM0000010',
  item_name: 'CAPS 28MM RED',
  category: 'PM',
  item_group_name: 'PACKAGING MATERIAL',
  is_batch: false,
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
  item_group_name: 'RAW MATERIAL',
  is_batch: true,
  uom: 'KG',
  sap_qty: '1500.5',
  difference: null,
});
const SF = line({
  id: 3,
  item_code: 'SF0000001',
  item_name: 'BLENDED OIL',
  category: 'OTHER',
  item_group_name: 'SEMI FINISHED GOODS',
  counted_qty: '5',
  sap_qty: '0',
  difference: '5',
});

const ACTIONS: AuditActions = {
  count: true,
  refresh: false,
  complete: true,
  approve: false,
  post_to_sap: false,
  void_any: false,
};

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
  completed_by: '',
  completed_at: null,
  approved_by: '',
  approved_at: null,
  rejected_by: '',
  rejected_at: null,
  rejection_reason: '',
  sap_posting: '',
  sap_doc_num: '',
  sap_posted_at: null,
  sap_posting_error: '',
  actions: ACTIONS,
  summary: {
    by_group: {
      'PACKAGING MATERIAL': { lines: 1, counted: 1, different: 1, category: 'PM' },
      'RAW MATERIAL': { lines: 1, counted: 0, different: 0, category: 'RM' },
      'SEMI FINISHED GOODS': { lines: 1, counted: 1, different: 1, category: 'OTHER' },
    },
    total: { lines: 3, counted: 2, different: 2 },
  },
};

const state = vi.hoisted(() => ({
  audit: null as unknown,
  lines: [] as unknown[],
  seesSap: true,
  preview: null as unknown,
  askedLines: [] as unknown[],
}));
const calls = vi.hoisted(() => ({
  addCount: vi.fn(),
  complete: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  post: vi.fn(),
}));

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
  useAddCount: () => ({ mutateAsync: calls.addCount, isPending: false }),
  useCompleteAudit: () => ({ mutateAsync: calls.complete, isPending: false }),
  useApproveAudit: () => ({ mutateAsync: calls.approve, isPending: false }),
  useRejectAudit: () => ({ mutateAsync: calls.reject, isPending: false }),
  useRefreshFromSap: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLineCounts: () => ({ data: [], isLoading: false }),
  useVoidCount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSapItemSearch: () => ({ data: [], isLoading: false }),
  usePostingPreview: () => ({ data: state.preview, isLoading: false, isError: false }),
  usePostToSap: () => ({ mutateAsync: calls.post, isPending: false }),
}));

const dialogs = vi.hoisted(() => ({
  confirm: vi.fn().mockResolvedValue(true),
  prompt: vi.fn().mockResolvedValue('Count rack C again'),
}));
vi.mock('@/shared/components', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  confirmDialog: dialogs.confirm,
  promptDialog: dialogs.prompt,
}));

const renderAudit = () =>
  render(
    <MemoryRouter initialEntries={['/warehouse-ops/stock-audit/7']}>
      <Routes>
        <Route path="/warehouse-ops/stock-audit/:auditId" element={<StockAuditPage />} />
      </Routes>
    </MemoryRouter>,
  );

const row = (code: string) => within(screen.getByText(code).closest('tr') as HTMLElement);
const withActions = (over: Partial<AuditActions>, audit: Partial<StockAuditDetail> = {}) => {
  state.audit = { ...AUDIT, ...audit, actions: { ...ACTIONS, ...over } };
};

describe('Stock audit — counting', () => {
  beforeEach(() => {
    state.audit = AUDIT;
    state.lines = [CAPS, OIL, SF];
    state.seesSap = true;
    state.askedLines.length = 0;
    Object.values(calls).forEach((fn) => fn.mockReset());
    dialogs.confirm.mockClear();
    dialogs.prompt.mockClear();
  });

  it('adds what was found to on hand', async () => {
    calls.addCount.mockResolvedValue({ ...CAPS, counted_qty: '30' });
    renderAudit();
    fireEvent.change(row('PM0000010').getByLabelText('Quantity for PM0000010'), {
      target: { value: '20' },
    });
    fireEvent.click(row('PM0000010').getByLabelText('Add to PM0000010'));
    await waitFor(() => expect(calls.addCount).toHaveBeenCalledWith({ lineId: 1, qty: '20' }));
  });

  it('removes what was counted by mistake', async () => {
    calls.addCount.mockResolvedValue({ ...CAPS, counted_qty: '7' });
    renderAudit();
    fireEvent.change(row('PM0000010').getByLabelText('Quantity for PM0000010'), {
      target: { value: '3' },
    });
    fireEvent.click(row('PM0000010').getByLabelText('Remove from PM0000010'));
    await waitFor(() => expect(calls.addCount).toHaveBeenCalledWith({ lineId: 1, qty: '-3' }));
  });

  it('will not remove more than is on hand', () => {
    renderAudit();
    fireEvent.change(row('PM0000010').getByLabelText('Quantity for PM0000010'), {
      target: { value: '11' },
    });
    fireEvent.click(row('PM0000010').getByLabelText('Remove from PM0000010'));
    expect(calls.addCount).not.toHaveBeenCalled();
  });

  it('records "none found" as 0 with one press', async () => {
    calls.addCount.mockResolvedValue({ ...OIL, counted_qty: '0' });
    renderAudit();
    fireEvent.click(row('RM0000001').getByLabelText('None of RM0000001 found'));
    await waitFor(() => expect(calls.addCount).toHaveBeenCalledWith({ lineId: 2, qty: '0' }));
    // Only offered while the item is uncounted.
    expect(row('PM0000010').queryByLabelText('None of PM0000010 found')).not.toBeInTheDocument();
  });

  it('has a tab for every SAP item group, SF and SC included', () => {
    renderAudit();
    expect(row('SF0000001').getByText('Semi Finished Goods')).toBeInTheDocument();
    // The tile, not the Group cell of the canola row.
    fireEvent.click(screen.getAllByText('Raw Material')[0]);
    expect(state.askedLines.at(-1)).toMatchObject({ group: 'RAW MATERIAL' });
  });

  it('shows SAP and the difference to those who may see them', () => {
    renderAudit();
    expect(row('PM0000010').getByText('32')).toBeInTheDocument();
    expect(row('PM0000010').getByText('-22')).toBeInTheDocument();
    expect(row('SF0000001').getByText('+5')).toBeInTheDocument();
  });

  it('hides SAP from a counter without the right', () => {
    state.seesSap = false;
    state.lines = [line({ id: 1, counted_qty: '10' })];
    renderAudit();
    expect(screen.queryByText('SAP', { selector: 'th' })).not.toBeInTheDocument();
    expect(screen.queryByText('Difference', { selector: 'th' })).not.toBeInTheDocument();
  });
});

describe('Stock audit — complete, approve, post', () => {
  beforeEach(() => {
    state.audit = AUDIT;
    state.lines = [CAPS, OIL, SF];
    state.seesSap = true;
    Object.values(calls).forEach((fn) => fn.mockReset());
    dialogs.confirm.mockClear();
    dialogs.prompt.mockClear();
  });

  it('lets the auditor complete it, saying what is uncounted', async () => {
    calls.complete.mockResolvedValue({});
    renderAudit();
    expect(screen.queryByRole('button', { name: /Close/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Complete/ }));
    await waitFor(() => expect(calls.complete).toHaveBeenCalled());
    expect(dialogs.confirm.mock.calls[0][0].description).toBe('1 items are not counted.');
  });

  it('shows an approver Approve and Reject, and asks a reason to reject', async () => {
    withActions({ complete: false, approve: true }, { status: 'SUBMITTED' });
    calls.reject.mockResolvedValue({});
    renderAudit();
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reject/ }));
    await waitFor(() => expect(calls.reject).toHaveBeenCalledWith('Count rack C again'));
  });

  it('lets an approver still correct counts while approving', () => {
    withActions({ complete: false, approve: true }, { status: 'SUBMITTED' });
    renderAudit();
    expect(row('PM0000010').getByLabelText('Quantity for PM0000010')).toBeInTheDocument();
  });

  it('shows the auditors why it came back', () => {
    withActions({}, { rejection_reason: 'Count rack C again', rejected_by: 'approver' });
    renderAudit();
    expect(screen.getByText('Rejected by approver: Count rack C again')).toBeInTheDocument();
    expect(screen.getByText('Open · rejected')).toBeInTheDocument();
  });

  it('takes no counts once approved, and offers Post to SAP to whoever may', () => {
    withActions({ count: false, complete: false, post_to_sap: true }, { status: 'APPROVED' });
    renderAudit();
    expect(screen.queryByLabelText('Quantity for PM0000010')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Post to SAP/ })).toBeInTheDocument();
  });

  it('shows the SAP document once posted', () => {
    withActions(
      { count: false, complete: false },
      { status: 'APPROVED', sap_posting: 'DONE', sap_doc_num: '1234' },
    );
    renderAudit();
    expect(screen.getByText('Posted to SAP · 1234')).toBeInTheDocument();
  });
});

describe('Post to SAP', () => {
  const PREVIEW: PostingPreview = {
    lines: [
      {
        line_id: 1,
        item_code: 'PM0000010',
        item_name: 'CAPS 28MM RED',
        category: 'PM',
        uom: 'PCS',
        sap_qty: '32',
        counted_qty: '30',
        difference: '-2',
        batches: [],
      },
      {
        line_id: 2,
        item_code: 'RM0000001',
        item_name: 'CANOLA OIL',
        category: 'RM',
        uom: 'KG',
        sap_qty: '1500.5',
        counted_qty: '1400',
        difference: '-100.5',
        batches: [{ batch: 'OLD', sap_qty: '1000', counted_qty: '899.5' }],
      },
    ],
    blocked: [],
  };
  const approved = { ...AUDIT, status: 'APPROVED' as const };
  const open = (audit: StockAuditDetail = approved) =>
    render(<PostToSapDialog audit={audit} open onClose={vi.fn()} />);

  beforeEach(() => {
    state.preview = PREVIEW;
    calls.post.mockReset();
  });

  it('shows each change, batches included, before posting', async () => {
    calls.post.mockResolvedValue({ sap_doc_num: '1234' });
    open();
    expect(screen.getByText('-2 PCS')).toBeInTheDocument();
    expect(screen.getByText('Batch OLD')).toBeInTheDocument();
    expect(screen.getByText('899.5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Post 2 items to SAP' }));
    await waitFor(() => expect(calls.post).toHaveBeenCalledWith(false));
  });

  it('will not post while a line cannot be placed', () => {
    state.preview = {
      ...PREVIEW,
      blocked: [{ ...PREVIEW.lines[1], reason: 'SAP holds no batch of it here' }],
    };
    open();
    expect(screen.getByText(/SAP holds no batch of it here/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Post 2 items/ })).toBeDisabled();
  });

  it('after no answer from SAP, asks that SAP was checked first', async () => {
    calls.post.mockResolvedValue({ sap_doc_num: '1234' });
    open({ ...approved, sap_posting: 'UNKNOWN' });
    const post = screen.getByRole('button', { name: /Post 2 items/ });
    expect(post).toBeDisabled();
    fireEvent.click(screen.getByLabelText('I checked SAP'));
    fireEvent.click(post);
    await waitFor(() => expect(calls.post).toHaveBeenCalledWith(true));
  });
});
