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
