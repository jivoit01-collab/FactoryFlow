/**
 * The A/P invoice draft from a GRPO's own page: the form opened on that GRPO,
 * and the badge saying where its A/P invoice stands. Query hooks are mocked.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const openGRPO = vi.fn();
const mutate = vi.fn();
vi.mock('../api', () => ({
  useCreateAPInvoiceDraft: () => ({ mutate, reset: vi.fn(), isPending: false, error: null }),
  useOpenGRPO: (...args: unknown[]) => openGRPO(...args),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

import { APInvoiceStatusBadge } from '../components/APInvoiceStatusBadge';
import { NewAPInvoiceDraftDialog } from '../components/NewAPInvoiceDraftDialog';
import type { GRPOAPStatus, OpenGRPO } from '../types';

const GRPO: OpenGRPO = {
  doc_entry: 27634,
  doc_num: '2026106540',
  doc_date: '2026-10-09',
  reference: '902/27502815',
  vendor_code: 'VENDA000100',
  vendor_name: 'AG POLY PACKS',
  total: '410357.00',
  comments: '',
  warehouses: ['BH-PM'],
  sap_draft_entries: [],
  entry_no: '',
};

function renderDialog(onCreated?: (entry: unknown) => void) {
  return render(
    <MemoryRouter>
      <NewAPInvoiceDraftDialog
        open
        onOpenChange={vi.fn()}
        grpoDocEntry={27634}
        onCreated={onCreated}
      />
    </MemoryRouter>,
  );
}

describe('the form opened on a GRPO', () => {
  it('shows that GRPO instead of the picker and leaves the bill to upload', () => {
    openGRPO.mockReturnValue({ data: GRPO, isLoading: false, isError: false });
    renderDialog();
    expect(openGRPO).toHaveBeenCalledWith(27634, true);
    expect(screen.getByText('2026106540')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search GRPO no/)).not.toBeInTheDocument();
    expect((screen.getByLabelText(/Vendor's bill/) as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeEnabled();
  });

  it('hands the new entry back to the GRPO page instead of leaving it', () => {
    openGRPO.mockReturnValue({ data: GRPO, isLoading: false, isError: false });
    const entry = { id: 9, entry_no: 'APD-20261009-0003', sap_status: 'CREATED' };
    mutate.mockImplementation((_payload, options) => options.onSuccess(entry));
    const onCreated = vi.fn();
    renderDialog(onCreated);
    const bill = new File(['%PDF'], 'bill.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Vendor's bill/), { target: { files: [bill] } });
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(mutate.mock.calls[0][0]).toEqual({ grpo_doc_entry: 27634, invoice_file: bill });
    expect(onCreated).toHaveBeenCalledWith(entry);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('says so when SAP no longer has the GRPO open', () => {
    openGRPO.mockReturnValue({ data: null, isLoading: false, isError: false });
    renderDialog();
    expect(screen.getByRole('alert')).toHaveTextContent('already invoiced or closed');
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
  });
});

describe('APInvoiceStatusBadge', () => {
  const status = (over: Partial<GRPOAPStatus>): GRPOAPStatus => ({
    status: 'NONE',
    invoices: [],
    sap_draft_entries: [],
    entry: null,
    ...over,
  });

  it('names the posted invoice', () => {
    render(
      <APInvoiceStatusBadge
        status={status({
          status: 'POSTED',
          invoices: [{ doc_entry: 52342, doc_num: '626094326', doc_date: '2026-10-06' }],
        })}
      />,
    );
    expect(screen.getByText('A/P invoice 626094326')).toBeInTheDocument();
  });

  it('tells a draft and nothing apart, and shows nothing while unknown', () => {
    const { rerender, container } = render(
      <APInvoiceStatusBadge status={status({ status: 'DRAFT', sap_draft_entries: [58620] })} />,
    );
    expect(screen.getByText('A/P draft in SAP')).toBeInTheDocument();
    rerender(<APInvoiceStatusBadge status={status({})} />);
    expect(screen.getByText('No A/P invoice')).toBeInTheDocument();
    rerender(<APInvoiceStatusBadge status={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
