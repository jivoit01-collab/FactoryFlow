// ============================================================================
// Entry Types
// ============================================================================

export const ENTRY_TYPES = {
  RAW_MATERIAL: 'RAW_MATERIAL',
  CONSTRUCTION: 'CONSTRUCTION',
  DAILY_NEED: 'DAILY_NEED',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export type EntryType = (typeof ENTRY_TYPES)[keyof typeof ENTRY_TYPES];

/**
 * Map for entry type display labels
 */
export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  RAW_MATERIAL: 'Raw Material',
  CONSTRUCTION: 'Construction',
  DAILY_NEED: 'Daily Needs',
  MAINTENANCE: 'Maintenance',
};

// ============================================================================
// Vehicle Condition Status
// ============================================================================

export const VEHICLE_CONDITIONS = {
  LOADED: 'Loaded',
  PARTIALLY_LOADED: 'Partially Loaded',
  EMPTY: 'Empty',
} as const;

export const TYRE_CONDITIONS = {
  GOOD: 'Good',
  POOR: 'Poor',
} as const;

/**
 * Gets vehicle condition label based on boolean
 */
export function getVehicleConditionLabel(isOk: boolean): string {
  return isOk ? VEHICLE_CONDITIONS.LOADED : VEHICLE_CONDITIONS.PARTIALLY_LOADED;
}

/**
 * Gets tyre condition label based on boolean
 */
export function getTyreConditionLabel(isOk: boolean): string {
  return isOk ? TYRE_CONDITIONS.GOOD : TYRE_CONDITIONS.POOR;
}

// ============================================================================
// Wizard Step Configurations
// ============================================================================

export interface WizardStepConfig {
  totalSteps: number;
  stepLabels: string[];
}

export const WIZARD_CONFIGS: Record<EntryType, WizardStepConfig> = {
  RAW_MATERIAL: {
    totalSteps: 6,
    stepLabels: [
      'Vehicle & Driver',
      'Security Check',
      'PO Receipts',
      'Arrival Slip',
      'Weighment',
      'Review',
    ],
  },
  CONSTRUCTION: {
    totalSteps: 4,
    stepLabels: ['Vehicle & Driver', 'Security Check', 'Construction Details', 'Review'],
  },
  DAILY_NEED: {
    totalSteps: 4,
    stepLabels: ['Vehicle & Driver', 'Security Check', 'Daily Needs', 'Review'],
  },
  MAINTENANCE: {
    totalSteps: 4,
    stepLabels: ['Vehicle & Driver', 'Security Check', 'Maintenance Details', 'Review'],
  },
};

/**
 * Gets wizard configuration for an entry type
 */
export function getWizardConfig(entryType: EntryType): WizardStepConfig {
  return WIZARD_CONFIGS[entryType] || WIZARD_CONFIGS.RAW_MATERIAL;
}
