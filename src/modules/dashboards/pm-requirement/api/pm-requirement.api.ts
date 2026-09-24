import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import type { POPrintPayload } from '@/modules/warehouse/grpo/types';

import type { PmReqPlanListResponse, PmReqResponse } from '../types';

const EP = API_ENDPOINTS.PACKING_MATERIAL;

export const pmRequirementApi = {
  /** The production plans this board can be pointed at, newest first. */
  async getPlans(): Promise<PmReqPlanListResponse> {
    const response = await apiClient.get<PmReqPlanListResponse>(EP.PLANS);
    return response.data;
  },

  /**
   * One plan exploded through its bills of material, against stock and open
   * orders. Omitting `absId` lets the API pick the plan covering today, which
   * is what the board opens on.
   */
  async getRequirement(absId?: number | null): Promise<PmReqResponse> {
    const response = await apiClient.get<PmReqResponse>(EP.REQUIREMENT, {
      params: absId ? { abs_id: absId } : undefined,
    });
    return response.data;
  },

  /**
   * One open order off the board, as SAP's own Purchase Order sheet.
   *
   * The same payload the GRPO screens print, so the buyer reads the document
   * the vendor holds rather than a second rendering of it.
   */
  async getPurchaseOrder(docEntry: number): Promise<POPrintPayload> {
    const response = await apiClient.get<POPrintPayload>(EP.PURCHASE_ORDER(docEntry));
    return response.data;
  },
};
