/**
 * Constants for the Raw Materials wizard flow
 */

export const WIZARD_CONFIG = {
  /** Total number of steps in the wizard (excluding review) */
  TOTAL_STEPS: 5,

  /** Step numbers */
  STEPS: {
    VEHICLE_DRIVER: 1,
    SECURITY_CHECK: 2,
    PO_RECEIPT: 3,
    WEIGHMENT: 4,
    QUALITY_CONTROL: 5,
  },

  /** Step titles */
  STEP_TITLES: {
    1: 'Vehicle & Driver',
    2: 'Security Check',
    3: 'PO Receipt',
    4: 'Weighment',
    5: 'Quality Control',
  },
} as const

export const TABLE_CONFIG = {
  /** Minimum width for data tables */
  MIN_WIDTH: '800px',
} as const

export const DEBOUNCE_CONFIG = {
  /** Default debounce delay in milliseconds for search inputs */
  SEARCH_DELAY: 100,
} as const

export type StepNumber = 1 | 2 | 3 | 4 | 5
