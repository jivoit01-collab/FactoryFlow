/**
 * The entry page's actions follow the permission and the status: Edit for
 * FILL while the entry is pending or sent back; Approve / Send back for APPROVE
 * while it is pending. Sending back needs a remark; approving does not.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ProductionQCEntry, ProductionQCStatus } from '@/modules/qc/types/productionQC.types';

import ProductionQCEntryDetailPage from '../../../pages/productionQC/ProductionQCEntryDetailPage';

const state = vi.hoisted(() => ({
  perms: new Set<string>(),
  entry: null as unknown,
  approve: vi.fn(),
  sendBack: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/core/auth', () => ({
  usePermission: () => ({
    hasPermission: (p: string) => state.perms.has(p),
    hasAnyPermission: (ps: readonly string[]) => ps.some((p) => state.perms.has(p)),
  }),
}));

vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionQCEntry: () => ({
    data: state.entry,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useApproveProductionQCEntry: () => ({ mutateAsync: state.approve, isPending: false }),
  useSendBackProductionQCEntry: () => ({ mutateAsync: state.sendBack, isPending: false }),
}));

const { VIEW, FILL, APPROVE } = QC_PERMISSIONS.PRODUCTION_QC;

const LABELS: Record<ProductionQCStatus, string> = {
  PENDING: 'Pending Approval',
  SENT_BACK: 'Sent Back',
  APPROVED: 'Approved',
};

const entry = (status: ProductionQCStatus): ProductionQCEntry => ({
  id: 7,
  default_id: null,
  default_name: '',
  submission_id: 70,
  submission_entry_ids: [7],
  parameter_type: { id: 1, code: 'PET_1L', name: '1 L PET Oil' },
  checked_at: '2026-09-29T08:00:00+05:30',
  status,
  status_label: LABELS[status],
  out_of_spec_count: 1,
  submitted_by_name: 'QC Chemist',
  submitted_at: '2026-09-29T08:00:00+05:30',
  approved_by_name: status === 'APPROVED' ? 'QC Lead' : null,
  approved_at: status === 'APPROVED' ? '2026-09-29T10:00:00+05:30' : null,
  sent_back_by_name: status === 'SENT_BACK' ? 'QC Lead' : null,
  sent_back_at: status === 'SENT_BACK' ? '2026-09-29T09:00:00+05:30' : null,
  send_back_remarks: status === 'SENT_BACK' ? 'Recheck the net weight' : '',
  remarks: 'Weight low on one bottle',
  approval_remarks: '',
  results: [
    {
      id: 70,
      parameter_id: 1,
      parameter_code: 'NET_WT',
      parameter_name: 'Net Weight',
      standard_value: '910±5',
      parameter_type: 'NUMERIC',
      min_value: null,
      max_value: null,
      uom: 'g',
      sequence: 1,
      is_mandatory: true,
      result_value: '900',
      result_numeric: '900.0000',
      is_within_spec: false,
      remarks: '',
    },
    {
      id: 71,
      parameter_id: 2,
      parameter_code: 'LEAK',
      parameter_name: 'Leak Test',
      standard_value: 'Free from leak',
      parameter_type: 'BOOLEAN',
      min_value: null,
      max_value: null,
      uom: '',
      sequence: 2,
      is_mandatory: true,
      result_value: 'Pass',
      result_numeric: null,
      is_within_spec: true,
      remarks: '',
    },
  ],
});

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/qc/qa-reports/entries/7']}>
      <Routes>
        <Route path="/qc/qa-reports/entries/:entryId" element={<ProductionQCEntryDetailPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const buttons = () => ({
  edit: screen.queryByRole('button', { name: /^(Edit|Correct)$/ }),
  approve: screen.queryByRole('button', { name: 'Approve' }),
  sendBack: screen.queryByRole('button', { name: 'Send back' }),
});

beforeEach(() => {
  state.perms = new Set();
  state.entry = entry('PENDING');
  state.approve = vi.fn().mockResolvedValue({});
  state.sendBack = vi.fn().mockResolvedValue({});
});

describe('actions by permission and status', () => {
  it.each<[string, string[], ProductionQCStatus, { edit: boolean; decide: boolean }]>([
    ['FILL', [FILL], 'PENDING', { edit: true, decide: false }],
    ['FILL', [FILL], 'SENT_BACK', { edit: true, decide: false }],
    ['FILL', [FILL], 'APPROVED', { edit: false, decide: false }],
    ['APPROVE', [APPROVE], 'PENDING', { edit: false, decide: true }],
    ['APPROVE', [APPROVE], 'SENT_BACK', { edit: false, decide: false }],
    ['APPROVE', [APPROVE], 'APPROVED', { edit: false, decide: false }],
    ['FILL + APPROVE', [FILL, APPROVE], 'PENDING', { edit: true, decide: true }],
    ['VIEW', [VIEW], 'PENDING', { edit: false, decide: false }],
    ['VIEW', [VIEW], 'SENT_BACK', { edit: false, decide: false }],
  ])('%s on a %s entry', (_label, perms, status, expected) => {
    state.perms = new Set(perms);
    state.entry = entry(status);
    renderPage();

    const { edit, approve, sendBack } = buttons();
    expect(!!edit).toBe(expected.edit);
    expect(!!approve).toBe(expected.decide);
    expect(!!sendBack).toBe(expected.decide);
  });
});

describe('the entry', () => {
  it('shows the readings with their spec and verdict', () => {
    state.perms = new Set([VIEW]);
    renderPage();

    const weight = screen.getByText('Net Weight').closest('tr')!;
    expect(weight).toHaveTextContent('910±5 g');
    expect(weight).toHaveTextContent('900 g');
    expect(within(weight).getByLabelText('Out of spec')).toBeInTheDocument();
    const leak = screen.getByText('Leak Test').closest('tr')!;
    expect(within(leak).getByLabelText('Within spec')).toBeInTheDocument();
    expect(screen.getByText('Weight low on one bottle')).toBeInTheDocument();
  });

  it('shows why a sent-back entry came back, and opens the form to correct it', () => {
    state.perms = new Set([FILL]);
    state.entry = entry('SENT_BACK');
    renderPage();

    expect(screen.getByText('Recheck the net weight')).toBeInTheDocument();
    expect(screen.getByText(/Sent back by QC Lead/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Correct' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/qa-reports/entries/7/edit');
  });
});

describe('deciding', () => {
  beforeEach(() => {
    state.perms = new Set([APPROVE]);
  });

  it('approves with no remark', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(state.approve).toHaveBeenCalledWith({ id: 7, remarks: '' }));
  });

  it('will not send back without saying what to correct', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Send back' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send back' }));

    expect(within(dialog).getByText('Say what needs correcting.')).toBeInTheDocument();
    expect(state.sendBack).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/What needs correcting/), {
      target: { value: 'Recheck the net weight' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send back' }));

    await waitFor(() =>
      expect(state.sendBack).toHaveBeenCalledWith({ id: 7, remarks: 'Recheck the net weight' }),
    );
  });
});

describe('an entry sent with others', () => {
  beforeEach(() => {
    state.perms = new Set([FILL, APPROVE]);
    state.entry = { ...entry('PENDING'), submission_entry_ids: [7, 8, 9] };
  });

  it('names the entries sent with it, and decides them all', async () => {
    renderPage();

    expect(screen.getByText(/Sent with/)).toHaveTextContent('Sent with #8, #9');
    expect(screen.getByRole('link', { name: '#8' })).toHaveAttribute(
      'href',
      '/qc/qa-reports/entries/8',
    );
    expect(screen.getByRole('button', { name: /Edit all 3/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send back all 3/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Approve all 3/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading')).toHaveTextContent(
      'Approve all 3 entries (#7, #8, #9)?',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(state.approve).toHaveBeenCalledWith({ id: 7, remarks: '' }));
  });
});
