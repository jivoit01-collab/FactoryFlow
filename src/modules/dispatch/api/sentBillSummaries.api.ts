/**
 * The bill summaries the dispatch desk has sent to the warehouse, across every
 * company the user belongs to.
 *
 * The bill-summary endpoints answer for one company at a time — the one named
 * by the `Company-Code` header — and the dispatch desk sends sheets for Oil,
 * Mart and Beverages alike, so this asks each company and merges the answers.
 * Printing one is `useBillSummaryPrinter`, which names the sheet's own company
 * the same way.
 */
import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import { BILL_SUMMARY_QUERY_KEYS, type BillSummary } from '@/modules/warehouse/api';

function inCompany(companyCode: string) {
  return { headers: { 'Company-Code': companyCode } };
}

export const sentBillSummariesApi = {
  async list(
    companyCode: string,
    params: { date_from: string; date_to: string },
  ): Promise<BillSummary[]> {
    const { data } = await apiClient.get<BillSummary[]>(API_ENDPOINTS.DISPATCH.BILL_SUMMARIES, {
      params,
      ...inCompany(companyCode),
    });
    return data;
  },
};

export interface SentBillSummaries {
  rows: BillSummary[];
  /** Companies whose sheets could not be read, so the page can say so. */
  failed: string[];
}

/**
 * Every company's sheets for the window, newest sent first.
 *
 * Keyed under the bill-summary keys, so an approval, a print or a pick made
 * anywhere else in the app refreshes this list too. A company that does not
 * answer is reported rather than dropped: a list quietly missing Mart reads as
 * Mart having sent nothing.
 */
export function useSentBillSummaries(
  companyCodes: string[],
  window: { date_from: string; date_to: string },
) {
  return useQuery({
    queryKey: [...BILL_SUMMARY_QUERY_KEYS.all, 'sent', companyCodes, window] as const,
    enabled: companyCodes.length > 0,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<SentBillSummaries> => {
      const answers = await Promise.allSettled(
        companyCodes.map((code) => sentBillSummariesApi.list(code, window)),
      );
      const rows: BillSummary[] = [];
      const failed: string[] = [];
      answers.forEach((answer, index) => {
        if (answer.status === 'fulfilled') rows.push(...answer.value);
        else failed.push(companyCodes[index]);
      });
      rows.sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''));
      return { rows, failed };
    },
  });
}
