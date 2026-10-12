/**
 * The screen that edits a GRPO already in SAP. Query hooks are mocked; the
 * rules of what may change live in the backend and in utils/sapEdit.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sapGRPO = vi.fn();
const findSapGRPO = vi.fn();
const mutateAsync = vi.fn();
vi.mock('../../api', () => ({
  useSapGRPO: (...args: unknown[]) => sapGRPO(...args),
  useFindSapGRPO: (...args: unknown[]) => findSapGRPO(...args),
  useSaveSapGRPOEdit: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('@/shared/components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/components')>()),
  confirmSapPost: vi.fn(() => Promise.resolve(true)),
}));

const granted = new Set<string>();
vi.mock('@/core/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/auth')>()),
  useHasPermission: (permission: string) => granted.has(permission),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

import GRPOSapEditPage from '../../pages/GRPOSapEditPage';
import { serviceGRPO } from '../fixtures.sapEdit';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/warehouse/grpo/sap-edit" element={<GRPOSapEditPage scope="material" />} />
        <Route path="/warehouse/grpo/sap-edit/:docEntry" element={<GRPOSapEditPage scope="material" />} />
        <Route path="/dispatch/bilty-grpo/sap-edit" element={<GRPOSapEditPage scope="service" />} />
        <Route path="/dispatch/bilty-grpo/sap-edit/:docEntry" element={<GRPOSapEditPage scope="service" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sapGRPO.mockReset();
  findSapGRPO.mockReset();
  mutateAsync.mockReset();
  navigate.mockReset();
  granted.clear();
});

describe('editing a GRPO in SAP', () => {
  it('starts from what SAP holds and saves only what changed', async () => {
    sapGRPO.mockReturnValue({ data: serviceGRPO(), isLoading: false, error: null, dataUpdatedAt: 1 });
    mutateAsync.mockResolvedValue({ outcome: 'POSTED', message: 'GRPO 2026106504 updated in SAP.' });
    renderAt('/dispatch/bilty-grpo/sap-edit/501');

    expect(sapGRPO).toHaveBeenCalledWith(501);
    expect(screen.getByText('GRPO 2026106504')).toBeInTheDocument();
    expect(screen.getByText('Closed by A/P invoice 52410.')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: /Save to SAP/ });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Vendor Ref. No.'), { target: { value: '7320A' } });
    fireEvent.change(screen.getByLabelText('Amount, line 1'), { target: { value: '3100' } });
    expect(screen.getByText('In SAP now: 7320')).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount, line 2')).not.toBeInTheDocument();
    expect(save).toBeEnabled();

    fireEvent.click(save);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toEqual({
      data: {
        header: { vendor_ref: { before: '7320', after: '7320A' } },
        lines: [{ line_num: 0, field: 'amount', before: '2769.00', after: '3100' }],
      },
      attachments: [],
    });
  });

  it('shows SAP refusing beside the form', async () => {
    sapGRPO.mockReturnValue({ data: serviceGRPO(), isLoading: false, error: null, dataUpdatedAt: 1 });
    mutateAsync.mockRejectedValue({
      message: 'SAP refused the change: (2011) Back Date Entry not allowed',
      response: { data: { detail: 'SAP refused the change: (2011) Back Date Entry not allowed' } },
    });
    renderAt('/dispatch/bilty-grpo/sap-edit/501');
    fireEvent.change(screen.getByLabelText('Vendor Ref. No.'), { target: { value: '7320A' } });
    fireEvent.click(screen.getByRole('button', { name: /Save to SAP/ }));
    expect(await screen.findByText(/Back Date Entry not allowed/)).toBeInTheDocument();
  });

  it('is read-only without the right for this GRPO type, and warns about back-dating', () => {
    sapGRPO.mockReturnValue({
      data: serviceGRPO({
        can_edit: false,
        permission_message: 'You can view this GRPO but not change it.',
        back_date: { floor: '2026-09-01', message: 'SAP refuses the app’s changes to GRPOs posted before 01 Sep 2026.' },
      }),
      isLoading: false,
      error: null,
      dataUpdatedAt: 1,
    });
    renderAt('/dispatch/bilty-grpo/sap-edit/501');
    expect(screen.getByText('You can view this GRPO but not change it.')).toBeInTheDocument();
    expect(screen.getByText(/posted before 01 Sep 2026/)).toBeInTheDocument();
    expect(screen.getByLabelText('Vendor Ref. No.')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save to SAP/ })).not.toBeInTheDocument();
  });

  it('holds further edits while an earlier one waits for SAP', () => {
    sapGRPO.mockReturnValue({
      data: serviceGRPO({
        edits: [{
          id: 3, status: 'WAITING', status_label: 'Waiting for SAP', message: '', summary: 'Vendor Ref. No.',
          changes: {}, attachments: [], requested_by: 'Edit User', created_at: null, posted_at: null,
        }],
      }),
      isLoading: false,
      error: null,
      dataUpdatedAt: 1,
    });
    renderAt('/dispatch/bilty-grpo/sap-edit/501');
    expect(screen.getByText(/is waiting for SAP and goes through by itself/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save to SAP/ })).not.toBeInTheDocument();
  });
});

describe('attachments', () => {
  const withFiles = (overrides = {}) =>
    serviceGRPO({
      attachments: [
        { line: 1, filename: 'bill.pdf', date: '2026-10-10' },
        { line: 2, filename: 'wrong.pdf', date: '2026-10-10' },
      ],
      ...overrides,
    });

  it('removes a file on save, and can be undone before', async () => {
    sapGRPO.mockReturnValue({ data: withFiles(), isLoading: false, error: null, dataUpdatedAt: 1 });
    mutateAsync.mockResolvedValue({ outcome: 'POSTED', message: 'GRPO 2026106504 updated in SAP.' });
    renderAt('/dispatch/bilty-grpo/sap-edit/501');
    fireEvent.click(screen.getByRole('button', { name: 'Remove wrong.pdf' }));
    expect(screen.getByText('To remove')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep wrong.pdf' }));
    expect(screen.queryByText('To remove')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove wrong.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: /Save to SAP/ }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0].data.remove_attachments).toEqual([{ filename: 'wrong.pdf' }]);
  });

  it('will not save a GRPO left with no attachment', () => {
    sapGRPO.mockReturnValue({ data: withFiles(), isLoading: false, error: null, dataUpdatedAt: 1 });
    renderAt('/dispatch/bilty-grpo/sap-edit/501');
    fireEvent.click(screen.getByRole('button', { name: 'Remove bill.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove wrong.pdf' }));
    expect(screen.getByText(/must keep at least one attachment/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save to SAP/ })).toBeDisabled();
  });

  it('offers no removal when the files are shared with another document', () => {
    sapGRPO.mockReturnValue({
      data: withFiles({ attachments_shared_message: 'This GRPO’s attachments are shared with cancelled GRPO 2026096650.' }),
      isLoading: false,
      error: null,
      dataUpdatedAt: 1,
    });
    renderAt('/dispatch/bilty-grpo/sap-edit/501');
    expect(screen.getByText(/shared with cancelled GRPO 2026096650/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove bill.pdf' })).not.toBeInTheDocument();
  });
});

describe('the screen for the other type', () => {
  it('sends a service GRPO opened under Warehouse to Dispatch', () => {
    sapGRPO.mockReturnValue({ data: serviceGRPO(), isLoading: false, error: null, dataUpdatedAt: 1 });
    granted.add('grpo.can_edit_service_grpo_in_sap');
    renderAt('/warehouse/grpo/sap-edit/501');
    expect(screen.getByText(/is a service GRPO/)).toBeInTheDocument();
    expect(screen.getByText(/Dispatch → Edit Service GRPO in SAP/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open it there' })).toHaveAttribute(
      'href',
      '/dispatch/bilty-grpo/sap-edit/501',
    );
    expect(screen.queryByLabelText('Vendor Ref. No.')).not.toBeInTheDocument();
  });

  it('only says where, without a link, to someone who cannot edit that type', () => {
    sapGRPO.mockReturnValue({
      data: serviceGRPO({ doc_type: 'I', doc_type_label: 'Material' }),
      isLoading: false,
      error: null,
      dataUpdatedAt: 1,
    });
    renderAt('/dispatch/bilty-grpo/sap-edit/501');
    expect(screen.getByText(/is a material GRPO/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open it there' })).not.toBeInTheDocument();
  });
});

const SERVICE_MATCH = {
  doc_entry: 501, doc_num: 2026106504, doc_type: 'S', doc_type_label: 'Service',
  doc_date: '2026-10-10', card_name: 'ARNAV', cancelled: false,
};

describe('finding a GRPO by its SAP number', () => {
  it('looks up only its own type and opens the only match straight away', async () => {
    findSapGRPO.mockImplementation((docNum: string) =>
      docNum
        ? { data: { results: [SERVICE_MATCH], other_type: [] }, isFetching: false, error: null }
        : { data: undefined, isFetching: false, error: null },
    );
    renderAt('/dispatch/bilty-grpo/sap-edit');
    expect(screen.getByText('Edit a service GRPO in SAP')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('GRPO number in SAP'), { target: { value: '2026106504x' } });
    fireEvent.click(screen.getByRole('button', { name: /Open/ }));
    expect(findSapGRPO).toHaveBeenLastCalledWith('2026106504', 'S');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dispatch/bilty-grpo/sap-edit/501'));
  });

  it('says where a GRPO of the other type is edited', () => {
    findSapGRPO.mockImplementation((docNum: string) =>
      docNum
        ? {
            data: { results: [], other_type: [{ doc_entry: 501, doc_type: 'S', doc_type_label: 'Service' }] },
            isFetching: false,
            error: null,
          }
        : { data: undefined, isFetching: false, error: null },
    );
    renderAt('/warehouse/grpo/sap-edit');
    fireEvent.change(screen.getByLabelText('GRPO number in SAP'), { target: { value: '2026106504' } });
    fireEvent.click(screen.getByRole('button', { name: /Open/ }));
    expect(findSapGRPO).toHaveBeenLastCalledWith('2026106504', 'I');
    expect(screen.getByText(/GRPO 2026106504 is a service GRPO/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
