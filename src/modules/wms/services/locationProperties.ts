/**
 * Block (location) property editing model + validation (Step 4).
 *
 * The editor works on a FLAT draft so a single form can drive both single and
 * bulk edits. `applyLocationDraft` merges only the fields the user touched back
 * into a location (rebuilding the nested capacity / rules / replenishment /
 * reservation objects), so bulk edits never clobber untouched properties.
 */
import type { TemperatureClass, WarehouseLocation } from '../types';
import { nowIso } from '../utils';

export interface LocationDraft {
  // Identity
  code: string;
  barcode: string;
  type: string;
  zoneId: string | null;
  // Capacity
  maxPallets: number | null;
  maxUnits: number | null;
  maxWeight: number | null;
  maxVolume: number | null;
  dimLength: number | null;
  dimWidth: number | null;
  dimHeight: number | null;
  // Material rules
  allowedMaterialTypes: string[];
  restrictedMaterialTypes: string[];
  allowMixedItems: boolean;
  singleLotOnly: boolean;
  hazmatAllowed: boolean;
  hazmatClasses: string[];
  temperatureClass: TemperatureClass | null;
  // Replenishment
  minStock: number | null;
  maxStock: number | null;
  // Flags
  enabled: boolean;
  isReserved: boolean;
  reservationReference: string;
  notes: string;
}

export type LocationDraftField = keyof LocationDraft;

export const MATERIAL_TYPE_SUGGESTIONS = [
  'RAW',
  'FINISHED',
  'PACKAGING',
  'WIP',
  'CONSUMABLE',
  'HAZARDOUS',
];

export const HAZMAT_CLASS_SUGGESTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function locationToDraft(location: WarehouseLocation): LocationDraft {
  return {
    code: location.code,
    barcode: location.barcode,
    type: location.type,
    zoneId: location.zoneId,
    maxPallets: location.capacity.maxPallets,
    maxUnits: location.capacity.maxUnits,
    maxWeight: location.capacity.maxWeight,
    maxVolume: location.capacity.maxVolume,
    dimLength: location.dimensions.length,
    dimWidth: location.dimensions.width,
    dimHeight: location.dimensions.height,
    allowedMaterialTypes: [...location.materialRules.allowedMaterialTypes],
    restrictedMaterialTypes: [...location.materialRules.restrictedMaterialTypes],
    allowMixedItems: location.materialRules.allowMixedItems,
    singleLotOnly: location.materialRules.singleLotOnly,
    hazmatAllowed: location.materialRules.hazmatAllowed,
    hazmatClasses: [...location.materialRules.hazmatClasses],
    temperatureClass: location.materialRules.temperatureClass,
    minStock: location.replenishment.minStock,
    maxStock: location.replenishment.maxStock,
    enabled: location.enabled,
    isReserved: location.reservation.isReserved,
    reservationReference: location.reservation.reference,
    notes: location.notes,
  };
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

const NEUTRAL_DRAFT: LocationDraft = {
  code: '',
  barcode: '',
  type: '',
  zoneId: null,
  maxPallets: null,
  maxUnits: null,
  maxWeight: null,
  maxVolume: null,
  dimLength: null,
  dimWidth: null,
  dimHeight: null,
  allowedMaterialTypes: [],
  restrictedMaterialTypes: [],
  allowMixedItems: false,
  singleLotOnly: false,
  hazmatAllowed: false,
  hazmatClasses: [],
  temperatureClass: null,
  minStock: null,
  maxStock: null,
  enabled: false,
  isReserved: false,
  reservationReference: '',
  notes: '',
};

/**
 * Build the initial draft for one or many locations. For a bulk selection each
 * field shows the shared value where all agree, otherwise a neutral default that
 * stays untouched (and therefore unapplied) until the user edits it.
 */
export function draftFromLocations(locations: WarehouseLocation[]): LocationDraft {
  if (locations.length === 1) return locationToDraft(locations[0]!);
  const drafts = locations.map(locationToDraft);
  const result = { ...NEUTRAL_DRAFT };
  (Object.keys(NEUTRAL_DRAFT) as LocationDraftField[]).forEach((field) => {
    const first = drafts[0]?.[field];
    const allEqual = drafts.every((draft) => sameValue(draft[field], first));
    if (allEqual && first !== undefined) {
      // @ts-expect-error indexed assignment across the union is safe here.
      result[field] = first;
    }
  });
  return result;
}

/** Merge only the touched draft fields back into a location. */
export function applyLocationDraft(
  location: WarehouseLocation,
  draft: LocationDraft,
  touched: ReadonlySet<LocationDraftField>,
): WarehouseLocation {
  const has = (field: LocationDraftField) => touched.has(field);
  const next: WarehouseLocation = { ...location, updatedAt: nowIso() };

  if (has('code')) next.code = draft.code.trim() || location.code;
  if (has('barcode')) next.barcode = draft.barcode.trim();
  if (has('type')) next.type = draft.type.trim() || location.type;
  if (has('zoneId')) next.zoneId = draft.zoneId;

  if (['maxPallets', 'maxUnits', 'maxWeight', 'maxVolume'].some((f) => has(f as LocationDraftField))) {
    next.capacity = {
      maxPallets: has('maxPallets') ? draft.maxPallets : location.capacity.maxPallets,
      maxUnits: has('maxUnits') ? draft.maxUnits : location.capacity.maxUnits,
      maxWeight: has('maxWeight') ? draft.maxWeight : location.capacity.maxWeight,
      maxVolume: has('maxVolume') ? draft.maxVolume : location.capacity.maxVolume,
    };
  }

  if (['dimLength', 'dimWidth', 'dimHeight'].some((f) => has(f as LocationDraftField))) {
    next.dimensions = {
      length: has('dimLength') ? draft.dimLength : location.dimensions.length,
      width: has('dimWidth') ? draft.dimWidth : location.dimensions.width,
      height: has('dimHeight') ? draft.dimHeight : location.dimensions.height,
    };
  }

  const ruleFields: LocationDraftField[] = [
    'allowedMaterialTypes',
    'restrictedMaterialTypes',
    'allowMixedItems',
    'singleLotOnly',
    'hazmatAllowed',
    'hazmatClasses',
    'temperatureClass',
  ];
  if (ruleFields.some(has)) {
    next.materialRules = {
      allowedMaterialTypes: has('allowedMaterialTypes')
        ? draft.allowedMaterialTypes
        : location.materialRules.allowedMaterialTypes,
      restrictedMaterialTypes: has('restrictedMaterialTypes')
        ? draft.restrictedMaterialTypes
        : location.materialRules.restrictedMaterialTypes,
      allowMixedItems: has('allowMixedItems') ? draft.allowMixedItems : location.materialRules.allowMixedItems,
      singleLotOnly: has('singleLotOnly') ? draft.singleLotOnly : location.materialRules.singleLotOnly,
      hazmatAllowed: has('hazmatAllowed') ? draft.hazmatAllowed : location.materialRules.hazmatAllowed,
      hazmatClasses: has('hazmatClasses') ? draft.hazmatClasses : location.materialRules.hazmatClasses,
      temperatureClass: has('temperatureClass') ? draft.temperatureClass : location.materialRules.temperatureClass,
    };
  }

  if (['minStock', 'maxStock'].some((f) => has(f as LocationDraftField))) {
    next.replenishment = {
      minStock: has('minStock') ? draft.minStock : location.replenishment.minStock,
      maxStock: has('maxStock') ? draft.maxStock : location.replenishment.maxStock,
    };
  }

  if (has('enabled')) next.enabled = draft.enabled;
  if (has('isReserved') || has('reservationReference')) {
    next.reservation = {
      isReserved: has('isReserved') ? draft.isReserved : location.reservation.isReserved,
      reference: has('reservationReference') ? draft.reservationReference : location.reservation.reference,
    };
  }
  if (has('notes')) next.notes = draft.notes;

  return next;
}

export type LocationDraftErrors = Partial<Record<LocationDraftField, string>>;

/** Validate a draft: non-negative capacities, max ≥ min, no allowed/restricted overlap. */
export function validateLocationDraft(draft: LocationDraft): LocationDraftErrors {
  const errors: LocationDraftErrors = {};

  const nonNegative: LocationDraftField[] = [
    'maxPallets',
    'maxUnits',
    'maxWeight',
    'maxVolume',
    'dimLength',
    'dimWidth',
    'dimHeight',
    'minStock',
    'maxStock',
  ];
  for (const field of nonNegative) {
    const value = draft[field] as number | null;
    if (value != null && value < 0) errors[field] = 'Cannot be negative.';
  }

  if (draft.minStock != null && draft.maxStock != null && draft.maxStock < draft.minStock) {
    errors.maxStock = 'Max must be ≥ min.';
  }

  const overlap = draft.allowedMaterialTypes.filter((type) =>
    draft.restrictedMaterialTypes.includes(type),
  );
  if (overlap.length) {
    const message = `Cannot be both allowed and restricted: ${overlap.join(', ')}`;
    errors.allowedMaterialTypes = message;
    errors.restrictedMaterialTypes = message;
  }

  return errors;
}
