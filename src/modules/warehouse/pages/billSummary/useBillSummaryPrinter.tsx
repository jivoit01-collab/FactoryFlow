/**
 * Printing an approved bill summary from anywhere a list of them is shown.
 *
 * The printed sheet is `BillSummaryPrint`, the same one the sheet's own page
 * prints. A list row carries no lines, so the sheet is fetched in full first —
 * in the sheet's own company, named on the request, because the bill-summary
 * endpoints answer for the `Company-Code` header only and a list can span
 * companies. The first print of an APPROVED sheet is recorded (it becomes
 * PRINTED); a reprint changes nothing, as the server has it.
 *
 * Used by Dispatch > Sent Bill Summaries and by the truck's Bill summaries
 * dialog on Vehicle Linking.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import { getErrorMessage } from '@/shared/utils';

import {
  BILL_SUMMARY_QUERY_KEYS,
  type BillSummary,
  type BillSummaryDetail,
  type BillSummaryStatus,
} from '../../api';
import { BILL_SUMMARY_PRINT_STYLE, BillSummaryPrint } from './BillSummaryPrint';

/** An approved sheet prints; one already printed or picked reprints. */
export const PRINTABLE_BILL_SUMMARY_STATUSES: BillSummaryStatus[] = [
  'APPROVED',
  'PRINTED',
  'PICKED',
];

/** Names the sheet's company; with none, the request falls back to the header. */
function inCompany(companyCode: string) {
  return companyCode ? { headers: { 'Company-Code': companyCode } } : {};
}

/**
 * The live sheet for each of these bills, in one company: the latest one that
 * is not cancelled. One request per bill — a truck carries a handful.
 */
export async function sheetsForBills(
  companyCode: string,
  docNums: string[],
): Promise<BillSummary[]> {
  const found = await Promise.all(
    docNums.map(async (docNum) => {
      const { data } = await apiClient.get<BillSummary[]>(API_ENDPOINTS.DISPATCH.BILL_SUMMARIES, {
        params: { sap_invoice_doc_num: docNum },
        ...inCompany(companyCode),
      });
      const live = data.filter((row) => row.status !== 'CANCELLED');
      live.sort((a, b) => (b.issued_at ?? '').localeCompare(a.issued_at ?? ''));
      return live[0] ?? null;
    }),
  );
  return found.filter((row): row is BillSummary => row !== null);
}

type PrintableRow = Pick<BillSummary, 'id' | 'company_code' | 'status' | 'entry_no'>;

export function useBillSummaryPrinter() {
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<BillSummaryDetail | null>(null);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: BILL_SUMMARY_PRINT_STYLE,
    documentTitle: sheet?.entry_no ?? 'bill-summary',
  });

  // Once per fetched sheet: a list refreshing re-renders its page, and must not
  // open the print dialog again.
  const printPending = useRef(false);
  useEffect(() => {
    if (sheet && printPending.current) {
      printPending.current = false;
      handlePrint();
    }
  }, [sheet, handlePrint]);

  /** Print `row`; resolves to the sheet as it now stands, or null on failure. */
  async function print(row: PrintableRow): Promise<BillSummaryDetail | null> {
    if (row.id === null) return null;
    setError('');
    setPrintingId(row.id);
    try {
      const { data: detail } = await apiClient.get<BillSummaryDetail>(
        API_ENDPOINTS.DISPATCH.BILL_SUMMARY_DETAIL(row.id),
        inCompany(row.company_code),
      );
      printPending.current = true;
      setSheet(detail);
      if (row.status !== 'APPROVED') return detail;
      // The first print is the one the record is for: the signed paper going
      // down to the godown.
      const { data: printed } = await apiClient.post<BillSummaryDetail>(
        API_ENDPOINTS.DISPATCH.BILL_SUMMARY_PRINTED(row.id),
        {},
        inCompany(row.company_code),
      );
      void queryClient.invalidateQueries({ queryKey: BILL_SUMMARY_QUERY_KEYS.all });
      return printed;
    } catch (err) {
      setError(getErrorMessage(err, `Could not print ${row.entry_no}.`));
      return null;
    } finally {
      setPrintingId(null);
    }
  }

  /**
   * Off-screen, rendered only so the print handler has something to take.
   * Bounded and clipped, as the sheet's own page does, so a wide sheet cannot
   * spill back into view.
   */
  const host = (
    <div
      aria-hidden
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: '-10000px',
        top: 0,
        width: '595pt',
        height: 0,
        overflow: 'hidden',
      }}
    >
      {sheet && <BillSummaryPrint ref={printRef} summary={sheet} />}
    </div>
  );

  return { print, printingId, error, host };
}
