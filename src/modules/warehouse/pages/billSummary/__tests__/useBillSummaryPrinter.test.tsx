import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sheetsForBills, useBillSummaryPrinter } from '../useBillSummaryPrinter';

const get = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
const handlePrint = vi.hoisted(() => vi.fn());

vi.mock('@/core/api', () => ({ apiClient: { get, post } }));
vi.mock('react-to-print', () => ({ useReactToPrint: () => handlePrint }));
vi.mock('../BillSummaryPrint', () => ({
  BILL_SUMMARY_PRINT_STYLE: '',
  BillSummaryPrint: () => <div data-testid="sheet" />,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useBillSummaryPrinter', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    handlePrint.mockReset();
    get.mockResolvedValue({ data: { id: 7, entry_no: 'BS-7', status: 'APPROVED', lines: [] } });
    post.mockResolvedValue({ data: { id: 7, entry_no: 'BS-7', status: 'PRINTED', lines: [] } });
  });

  it('fetches the sheet in its own company, prints it once, and records the first print', async () => {
    const { result } = renderHook(() => useBillSummaryPrinter(), { wrapper });

    let printed: unknown;
    await act(async () => {
      printed = await result.current.print({
        id: 7,
        company_code: 'JIVO_MART',
        status: 'APPROVED',
        entry_no: 'BS-7',
      });
    });

    expect(get.mock.calls[0][1]).toEqual({ headers: { 'Company-Code': 'JIVO_MART' } });
    expect(post.mock.calls[0][2]).toEqual({ headers: { 'Company-Code': 'JIVO_MART' } });
    expect(printed).toEqual(expect.objectContaining({ status: 'PRINTED' }));
    await waitFor(() => expect(handlePrint).toHaveBeenCalledTimes(1));
  });

  it('reprints without recording it again', async () => {
    const { result } = renderHook(() => useBillSummaryPrinter(), { wrapper });
    await act(async () => {
      await result.current.print({
        id: 7,
        company_code: 'JIVO_OIL',
        status: 'PRINTED',
        entry_no: 'BS-7',
      });
    });

    expect(get).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
    await waitFor(() => expect(handlePrint).toHaveBeenCalledTimes(1));
  });
});

describe('sheetsForBills', () => {
  it('takes the latest live sheet per bill, never a cancelled one', async () => {
    get.mockReset();
    get.mockImplementation(
      async (_url: string, config: { params: { sap_invoice_doc_num: string } }) => ({
        data:
          config.params.sap_invoice_doc_num === '626090101'
            ? [
                { id: 1, status: 'CANCELLED', issued_at: '2026-09-30T10:00:00' },
                { id: 2, status: 'APPROVED', issued_at: '2026-09-30T09:00:00' },
              ]
            : [],
      }),
    );

    const sheets = await sheetsForBills('JIVO_OIL', ['626090101', '626090999']);

    expect(sheets.map((row) => row.id)).toEqual([2]);
    expect(get.mock.calls[0][1].headers).toEqual({ 'Company-Code': 'JIVO_OIL' });
  });
});
