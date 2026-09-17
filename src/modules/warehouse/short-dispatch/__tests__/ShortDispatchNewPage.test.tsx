import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ShortDispatchDetail, ShortDispatchInvoiceLookup } from '../api';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

// The form posts to SAP behind a confirmation. Auto-confirmed here so the tests
// are about what gets sent, not about the dialog.
vi.mock('@/shared/components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/components')>()),
  confirmSapPost: vi.fn().mockResolvedValue(true),
}));

const lookupInvoice = vi.fn();
const create = vi.fn();
const listWarehouses = vi.fn();
vi.mock('../api/short-dispatch.api', () => ({
  shortDispatchApi: {
    lookupInvoice: (n: string) => lookupInvoice(n) as Promise<ShortDispatchInvoiceLookup>,
    create: (p: unknown) => create(p) as Promise<ShortDispatchDetail>,
    listWarehouses: () => listWarehouses(),
    list: vi.fn(),
    get: vi.fn(),
    getPrint: vi.fn(),
  },
}));

const { default: ShortDispatchNewPage } = await import('../pages/ShortDispatchNewPage');

const INVOICE: ShortDispatchInvoiceLookup = {
  doc_entry: 5001,
  doc_num: '1500',
  doc_date: '2026-09-14',
  card_code: 'CUST001',
  card_name: 'Sharma Traders',
  default_warehouse_code: 'BH-PC',
  lines: [
    {
      line_num: 0,
      item_code: 'FG0000151',
      item_name: 'Olive Oil 1 LTR',
      uom: 'PCS',
      quantity: 100,
      rate: 250,
      tax_code: 'CG+SG@5',
      warehouse_code: 'BH-PC',
      original_batch_number: '2609A',
      already_short: 0,
      remaining_quantity: 100,
    },
    {
      line_num: 1,
      item_code: 'FG0000329',
      item_name: 'Mustard Oil 5 LTR',
      uom: 'PCS',
      quantity: 40,
      rate: 600,
      tax_code: 'CG+SG@5',
      warehouse_code: 'BH-BT',
      original_batch_number: '',
      // 30 of this line already came back on an earlier short dispatch.
      already_short: 30,
      remaining_quantity: 10,
    },
  ],
  existing_entries: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

async function findBill() {
  fireEvent.change(screen.getByPlaceholderText('Enter the SAP invoice number'), {
    target: { value: '1500' },
  });
  fireEvent.click(screen.getByRole('button', { name: /find bill/i }));
  await screen.findByText(/Sharma Traders/);
}

/** Type a short quantity into the nth line's box. */
function enterShortQty(index: number, value: string) {
  fireEvent.change(shortQtyInput(index), { target: { value } });
}

function post() {
  fireEvent.click(screen.getByRole('button', { name: /post return note/i }));
}

/** The "Short qty" box for the nth line, in the order the bill lists them. */
function shortQtyInput(index: number) {
  return screen.getAllByRole('spinbutton')[index];
}

beforeEach(() => {
  navigate.mockReset();
  lookupInvoice.mockReset().mockResolvedValue(INVOICE);
  create.mockReset();
  listWarehouses.mockReset().mockResolvedValue([
    { warehouse_code: 'BH-PC', warehouse_name: 'Panchkula FG' },
    { warehouse_code: 'BH-BT', warehouse_name: 'Barotiwala FG' },
  ]);
});

describe('ShortDispatchNewPage', () => {
  it('sends only the lines that are short, and only what the server decides from', async () => {
    create.mockResolvedValue({
      id: 12,
      entry_no: 'SD-20260914-0001',
      sap_return_doc_num: '170001',
    });
    render(<ShortDispatchNewPage />, { wrapper });

    await findBill();
    enterShortQty(0, '6');

    post();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toEqual({
      invoice_number: '1500',
      warehouse_code: 'BH-PC',
      remarks: '',
      lines: [{ source_line_num: 0, short_quantity: 6, reason: 'SHORT', remarks: '' }],
    });
    expect(navigate).toHaveBeenCalledWith('/warehouse/short-dispatch/12');
  });

  it('preselects the warehouse most of the bill was picked from', async () => {
    render(<ShortDispatchNewPage />, { wrapper });
    await findBill();

    const select = screen.getByRole('combobox', { name: '' }) as HTMLSelectElement;
    expect(select.value).toBe('BH-PC');
  });

  it('refuses more than an earlier short dispatch left on the line', async () => {
    render(<ShortDispatchNewPage />, { wrapper });
    await findBill();

    // Line 2 was billed for 40 but 30 has already come back.
    enterShortQty(1, '15');
    post();

    expect(
      await screen.findByText(/only 10 PCS is left to return against this bill/i),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('shows what an earlier short dispatch already returned', async () => {
    render(<ShortDispatchNewPage />, { wrapper });
    await findBill();

    expect(screen.getByText(/30 already returned, 10 left/)).toBeInTheDocument();
  });

  it('warns when the stock is going back onto a different floor from the one billed', async () => {
    render(<ShortDispatchNewPage />, { wrapper });
    await findBill();

    // Line 2 was billed out of BH-BT; the return is posting into BH-PC.
    enterShortQty(1, '5');

    // The warning interpolates the codes, so it is several text nodes — matched
    // against the rendered text as a whole rather than one element.
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/billed out of\s*BH-BT,\s*not\s*BH-PC/i),
    );
  });

  it('says so when the bill has already been short once', async () => {
    lookupInvoice.mockResolvedValue({
      ...INVOICE,
      existing_entries: [
        {
          id: 4,
          entry_no: 'SD-20260901-0002',
          sap_return_doc_num: '169980',
          created_at: '2026-09-01T10:00:00Z',
        },
      ],
    });
    render(<ShortDispatchNewPage />, { wrapper });
    await findBill();

    expect(screen.getByText(/already been short once/i)).toBeInTheDocument();
    expect(screen.getByText(/SD-20260901-0002 \(SAP Return 169980\)/)).toBeInTheDocument();
  });

  it('surfaces SAP refusing the document, and does not navigate away', async () => {
    create.mockRejectedValue({
      response: { data: { detail: 'SAP rejected the return note: 160021 no cost' } },
    });
    render(<ShortDispatchNewPage />, { wrapper });

    await findBill();
    enterShortQty(0, '6');
    post();

    expect(await screen.findByText(/160021 no cost/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cannot post before a bill is found', async () => {
    render(<ShortDispatchNewPage />, { wrapper });
    expect(screen.queryByRole('button', { name: /post return note/i })).not.toBeInTheDocument();
  });
});
