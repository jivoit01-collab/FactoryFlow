/**
 * Constants for the Raw Materials wizard flow
 */

export const WIZARD_CONFIG = {
  /** Total number of steps in the wizard (excluding review) */
  TOTAL_STEPS: 4,

  /**
   * Step numbers. Vehicle/Driver and the former Security Check step were merged
   * into a single step 1, so PO Receipt onwards shifted down by one.
   */
  STEPS: {
    VEHICLE_DRIVER: 1,
    PO_RECEIPT: 2,
    ARRIVAL_SLIP: 3,
    WEIGHMENT: 4,
  },

  /** Step titles */
  STEP_TITLES: {
    1: 'Vehicle, Driver & Security',
    2: 'PO Receipt',
    3: 'Arrival Slip',
    4: 'Weighment',
  },
} as const;

export const TABLE_CONFIG = {
  /** Minimum width for data tables */
  MIN_WIDTH: '800px',
} as const;

export const DEBOUNCE_CONFIG = {
  /** Default debounce delay in milliseconds for search inputs */
  SEARCH_DELAY: 100,
} as const;

export type StepNumber = 1 | 2 | 3 | 4;
