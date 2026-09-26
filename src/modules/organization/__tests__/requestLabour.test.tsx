import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RequestLabourPage from '../pages/RequestLabourPage';
import type { LabourRequest } from '../types';

function makeRequest(overrides: Partial<LabourRequest> = {}): LabourRequest {
  return {
    id: 1,
    company: 1,
    department: 10,
    department_name: 'Production',
    work_date: '2026-09-17',
    shift: 'DAY',
    requested_count: 12,
    note: 'Bottling line 2',
    status: 'PENDING',
    status_display: 'Pending',
    approved_count: null,
    effective_count: 12,
    decision_note: '',
    decided_at: null,
    decided_by_name: null,
    is_deleted: false,
    can_restore: false,
    created_by_name: 'Kulbir Veerji',
    updated_by_name: null,
    deleted_by_name: null,
    deleted_at: null,
    created_at: '2026-09-16T12:00:00Z',
    updated_at: '2026-09-16T12:00:00Z',
    ...overrides,
  };
}

const day = vi.hoisted(() => ({ current: [] as unknown[] }));
const rights = vi.hoisted(() => ({ raise: true, decide: true }));
const raise = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const decide = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const update = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const remove = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const reopen = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const restore = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const toastError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

vi.mock('../api/labourRequest.queries', () => ({
  useLabourRequestDay: () => ({ data: day.current, isLoading: false }),
  useLabourRequestAudit: () => ({ data: [], isLoading: false }),
  useRaiseLabourRequest: () => ({ mutateAsync: raise, isPending: false }),
  useUpdateLabourRequest: () => ({ mutateAsync: update, isPending: false }),
  useRemoveLabourRequest: () => ({ mutateAsync: remove, isPending: false }),
  useRestoreLabourRequest: () => ({ mutateAsync: restore, isPending: false }),
  useDecideLabourRequest: () => ({ mutateAsync: decide, isPending: false }),
  useReopenLabourRequest: () => ({ mutateAsync: reopen, isPending: false }),
}));

vi.mock('@/core/auth', () => ({
  useHasPermission: (permission: string) =>
    permission.endsWith('can_raise_labour_request') ? rights.raise : rights.decide,
}));

// The department picker fetches the master; the screen only needs it to hand
// back an id, so it is replaced by a plain button.
vi.mock('@/modules/gate/components/DepartmentSelect', () => ({
  DepartmentSelect: ({ onChange }: { onChange: (id: number | '', name: string) => void }) => (
    <button type="button" onClick={() => onChange(10, 'Production')}>
      pick-department
    </button>
  ),
}));

function open(
  requests: LabourRequest[],
  { raise: canRaise = true, decide: canDecide = true } = {},
) {
  day.current = requests;
  rights.raise = canRaise;
  rights.decide = canDecide;
  render(<RequestLabourPage />);
}

/** Open the accordion block for the one department on screen. */
function expandDepartment() {
  fireEvent.click(screen.getByRole('button', { name: /Production/ }));
}

beforeEach(() => {
  [raise, decide, update, remove, reopen, restore, toastError].forEach((fn) => fn.mockClear());
});

describe('Request Labour', () => {
  it('opens on tomorrow, because the page is filled the evening before', () => {
    open([]);

    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const expected = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    expect(screen.getByLabelText('Date needed')).toHaveValue(expected);
  });

  it('totals the ask and what is actually to be arranged separately', () => {
    open([
      makeRequest({ id: 1, requested_count: 12, effective_count: 12 }),
      makeRequest({
        id: 2,
        department: 11,
        department_name: 'Packing',
        requested_count: 20,
        status: 'APPROVED',
        status_display: 'Approved',
        approved_count: 14,
        effective_count: 14,
      }),
    ]);

    expect(screen.getByText('Requested').nextSibling).toHaveTextContent('32');
    expect(screen.getByText('To arrange').nextSibling).toHaveTextContent('26');
    // One of the two is still undecided.
    expect(screen.getByText('Pending').nextSibling).toHaveTextContent('1');
  });

  it('shows only the selected shift', () => {
    open([
      makeRequest({ id: 1, shift: 'DAY' }),
      makeRequest({ id: 2, shift: 'NIGHT', department: 11, department_name: 'Packing' }),
    ]);

    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.queryByText('Packing')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Night' }));

    expect(screen.getByText('Packing')).toBeInTheDocument();
    expect(screen.queryByText('Production')).not.toBeInTheDocument();
  });

  it('raises the ask for the picked department and shift', async () => {
    open([]);

    fireEvent.click(screen.getByText('pick-department'));
    fireEvent.change(screen.getByLabelText('Labourers needed'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Loading' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Request/ }));

    await waitFor(() => expect(raise).toHaveBeenCalledTimes(1));
    expect(raise.mock.calls[0][0]).toMatchObject({
      department: 10,
      shift: 'DAY',
      requested_count: 15,
      note: 'Loading',
    });
  });

  it('will not raise an ask without a reason', async () => {
    open([]);

    fireEvent.click(screen.getByText('pick-department'));
    fireEvent.change(screen.getByLabelText('Labourers needed'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Request/ }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Give a reason for this request'));
    expect(raise).not.toHaveBeenCalled();
  });

  it('asks for a reason when editing a request that was raised without one', async () => {
    open([makeRequest({ note: '' })]);
    expandDepartment();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: /Save/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Loading 3 trucks' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toMatchObject({ id: 1, note: 'Loading 3 trucks' });
  });

  it('warns that saving replaces a department’s existing ask for the shift', () => {
    open([makeRequest()]);

    fireEvent.click(screen.getByText('pick-department'));

    expect(screen.getByText(/already has a/)).toBeInTheDocument();
    // The button says what the click will actually do.
    expect(screen.getByRole('button', { name: /Revise/ })).toBeInTheDocument();
  });

  it('approves the full ask in one click', async () => {
    open([makeRequest()]);
    expandDepartment();

    fireEvent.click(screen.getByRole('button', { name: /Approve/ }));

    await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    expect(decide.mock.calls[0][0]).toMatchObject({ id: 1, decision: 'APPROVED' });
  });

  it('keeps both numbers visible on a partial approval', () => {
    open([
      makeRequest({
        status: 'APPROVED',
        status_display: 'Approved',
        approved_count: 8,
        effective_count: 8,
        decided_by_name: 'Gagan Veerji',
      }),
    ]);
    expandDepartment();

    expect(screen.getByText('12 requested')).toBeInTheDocument();
    expect(screen.getByText('· 8 approved')).toBeInTheDocument();
  });

  it('offers reopen instead of approve once a decision exists', async () => {
    open([
      makeRequest({
        status: 'REJECTED',
        status_display: 'Rejected',
        approved_count: 0,
        effective_count: 0,
        decided_by_name: 'Gagan Veerji',
        decision_note: 'No shift running',
      }),
    ]);
    expandDepartment();

    expect(screen.queryByRole('button', { name: /^Approve/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reopen/ }));

    await waitFor(() => expect(reopen).toHaveBeenCalledWith(1));
  });

  it('edits in a dialog, like History — not inline in the row', async () => {
    open([makeRequest()]);
    expandDepartment();

    // Nothing editable is on the row itself until the dialog is opened.
    expect(screen.queryByLabelText('Labourers needed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Edit labour request');
    // Seeded from the request being edited.
    expect(screen.getByLabelText('Labourers needed')).toHaveValue(12);
    expect(screen.getByLabelText('Reason')).toHaveValue('Bottling line 2');

    fireEvent.change(screen.getByLabelText('Labourers needed'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toMatchObject({
      id: 1,
      requested_count: 18,
      note: 'Bottling line 2',
    });
  });

  it('warns in the edit dialog that a new number un-approves the request', async () => {
    open([
      makeRequest({
        status: 'APPROVED',
        status_display: 'Approved',
        approved_count: 12,
        effective_count: 12,
        decided_by_name: 'Gagan Veerji',
      }),
    ]);
    expandDepartment();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByRole('dialog');

    // The reason alone leaves the decision standing, so no warning yet.
    expect(screen.queryByText(/sends it back for approval/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Labourers needed'), { target: { value: '9' } });

    expect(screen.getByText(/sends it back for approval/)).toBeInTheDocument();
  });

  it('hides the add form and every write from a read-only viewer', () => {
    open([makeRequest()], { raise: false, decide: false });

    expect(screen.queryByText('pick-department')).not.toBeInTheDocument();
    expandDepartment();
    expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument();
    // Reading the trail is still allowed.
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
  });

  it('an approver who may not raise still cannot edit the ask', () => {
    open([makeRequest()], { raise: false, decide: true });

    expect(screen.queryByText('pick-department')).not.toBeInTheDocument();
    expandDepartment();
    expect(screen.getByRole('button', { name: /Approve/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('lists withdrawn requests apart, with undo only inside the window', () => {
    open([
      makeRequest({
        id: 3,
        is_deleted: true,
        can_restore: true,
        deleted_by_name: 'Kulbir Veerji',
        deleted_at: '2026-09-16T12:30:00Z',
      }),
    ]);

    expect(screen.getByText('Withdrawn (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
    expect(restore).toHaveBeenCalledWith(3);
  });
});
