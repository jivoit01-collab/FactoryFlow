// Re-export GRPO status config from centralized constants
export type { GRPOStatus, StatusConfigWithIcon } from '@/config/constants'
export { GRPO_STATUS, GRPO_STATUS_CONFIG } from '@/config/constants'

// Default SAP Branch ID - loaded from environment variable with fallback
export const DEFAULT_BRANCH_ID = parseInt(import.meta.env.VITE_DEFAULT_BRANCH_ID || '2', 10)
