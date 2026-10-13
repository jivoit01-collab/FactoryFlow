/**
 * Where the Fixed Asset GRPO screens live.
 *
 * The backend builds its links from the same prefix
 * (`fixed_asset_grpo/constants.py` FRONTEND_BASE): a queue row or notification
 * for a draft points at `/preview/<vehicle_entry_id>?draft=<id>`, a posted one
 * at `/history/<posting_id>`. Change one side, change the other.
 */
export const FA_GRPO_BASE_PATH = '/warehouse/grpo/fixed-asset';

export const FA_GRPO_ROUTES = {
  LIST: FA_GRPO_BASE_PATH,
  PREVIEW: `${FA_GRPO_BASE_PATH}/preview/:vehicleEntryId`,
  HISTORY_DETAIL: `${FA_GRPO_BASE_PATH}/history/:postingId`,
} as const;

export const faGrpoPaths = {
  list: (tab?: string) => (tab ? `${FA_GRPO_BASE_PATH}?tab=${tab}` : FA_GRPO_BASE_PATH),
  preview: (vehicleEntryId: number) => `${FA_GRPO_BASE_PATH}/preview/${vehicleEntryId}`,
  historyDetail: (postingId: number) => `${FA_GRPO_BASE_PATH}/history/${postingId}`,
};
