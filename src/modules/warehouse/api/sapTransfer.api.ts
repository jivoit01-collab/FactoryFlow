import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { SAPStockTransfer } from '../types';

const EP = API_ENDPOINTS.WAREHOUSE;

/**
 * Posted SAP inventory transfers (OWTR), read for the Inventory Transfer page's
 * print.
 *
 * Deliberately separate from the BST picker's copy of these calls: BST is the
 * physical move and addresses the same reader under its own path. A transfer
 * keyed straight into the SAP client belongs to neither app record, which is
 * why the document page reads SAP rather than its own tables.
 */
export const sapTransferApi = {
  /** Search posted transfers by SAP document number. */
  async search(search: string, limit = 20): Promise<SAPStockTransfer[]> {
    const res = await apiClient.get<SAPStockTransfer[]>(EP.SAP_TRANSFERS, {
      params: {
        search,
        document_type: 'STOCK_TRANSFER',
        limit,
        // A cancelled transfer is still a document somebody may need a copy
        // of. The BST picker deliberately does NOT ask for these — it builds a
        // physical movement, and a cancelled document moved nothing.
        include_cancelled: true,
      },
    });
    return res.data;
  },

  /** One transfer with its lines — everything the printed document needs. */
  async get(docEntry: number): Promise<SAPStockTransfer> {
    const res = await apiClient.get<SAPStockTransfer>(EP.SAP_TRANSFER_DETAIL(docEntry), {
      params: { document_type: 'STOCK_TRANSFER' },
    });
    return res.data;
  },
};
