// Re-export GRPO status config from centralized constants
export type { AttachmentStatusType, GRPOStatus, StatusConfigWithIcon } from '@/config/constants';
export {
  ATTACHMENT_STATUS,
  ATTACHMENT_STATUS_CONFIG,
  GRPO_STATUS,
  GRPO_STATUS_CONFIG,
} from '@/config/constants';

// Default SAP Branch ID - fallback when preview data does not provide branch_id
export const DEFAULT_BRANCH_ID = parseInt(import.meta.env.VITE_DEFAULT_BRANCH_ID || '2', 10);

// The packing-material godown. PM items received into any other warehouse
// trigger an explicit "continue anyway?" confirmation on the Material GRPO form.
export const PM_WAREHOUSE_CODE = import.meta.env.VITE_PM_WAREHOUSE_CODE || 'BH-PM';

// Default G/L account for service (freight) GRPO — "FREIGHT AND CARTAGE
// OUTWARD-INDIRECT EXP" (5670001). Pre-selected on the Service GRPO form when it
// exists in the company's G/L options; the operator can still change it.
export const DEFAULT_SERVICE_GRPO_GL_ACCOUNT =
  import.meta.env.VITE_DEFAULT_SERVICE_GRPO_GL_ACCOUNT || '5670001';
