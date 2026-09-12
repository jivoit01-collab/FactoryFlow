import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

const EP = API_ENDPOINTS.WAREHOUSE;

/**
 * What one receive scan did.
 *
 * `status` carries the business outcome and a refusal still arrives as HTTP 200,
 * because the receiver is working through a trolley and the next scan has to
 * keep working — the screen shows the reason inline instead of erroring out.
 *
 * - `ACCEPTED`       — the label is now stock.
 * - `NEEDS_COUNT`    — a pallet was scanned; ask how many boxes are on it.
 * - `NEEDS_BOX_SCAN` — the count came up short, so this pallet must be scanned
 *                      box by box. Nothing was activated.
 * - `REJECTED`       — refused; `code` says why.
 */
export type ReceiveScanStatus = 'ACCEPTED' | 'NEEDS_COUNT' | 'NEEDS_BOX_SCAN' | 'REJECTED';

export interface ReceiveScanPallet {
  id: number;
  pallet_id: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  status: string;
  box_count: number;
}

export interface ReceiveScanActivatedBox {
  id: number;
  box_barcode: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  uom: string;
  current_warehouse: string;
  pallet_code?: string;
}

export interface ReceiveScanResult {
  status: ReceiveScanStatus;
  code: string;
  detail: string;
  entity_type: string;
  barcode: string;
  warehouse: string;
  activated_count: number;
  pending_box_count: number;
  verify_request_id: number | null;
  pallet: ReceiveScanPallet | null;
  activated_boxes: ReceiveScanActivatedBox[];
}

export interface ReceiveScanPayload {
  warehouse: string;
  barcode: string;
  /** Only sent for the second pass of a pallet scan, answering NEEDS_COUNT. */
  confirmed_box_count?: number | null;
  device_info?: string;
}

export interface ReceiveSession {
  warehouse: string;
  since: string;
  scans_accepted: number;
  scans_rejected: number;
  boxes_activated: number;
}

export const receiveApi = {
  async scan(payload: ReceiveScanPayload): Promise<ReceiveScanResult> {
    const { data } = await apiClient.post<ReceiveScanResult>(EP.RECEIVE_SCAN, payload);
    return data;
  },

  async session(warehouse: string): Promise<ReceiveSession> {
    const { data } = await apiClient.get<ReceiveSession>(EP.RECEIVE_SESSION, {
      params: { warehouse },
    });
    return data;
  },
};
