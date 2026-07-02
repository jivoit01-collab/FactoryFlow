/**
 * Move/transfer validation engine (Step 6).
 *
 * One self-contained, pure function that decides whether moving `quantity` of an
 * item into a destination location is allowed, returning specific errors and
 * warnings. Every rule in the spec lives here so transfer, putaway, and picking
 * all share exactly the same checks. Capacity and material-rule violations are
 * errors or warnings depending on the corresponding settings flag.
 */
import type {
  InventoryRecord,
  TemperatureClass,
  ViolationMode,
  WarehouseLocation,
  WmsSettings,
} from '../types';

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface MoveItem {
  itemCode: string;
  materialType: string;
  temperatureClass: TemperatureClass | null;
  hazmatClass: string;
  lotNumber: string;
  serialNumber: string;
  expiryDate: string | null;
}

export interface MoveSource {
  location: WarehouseLocation;
  /** Available quantity of this item/lot at the source. */
  availableQuantity: number;
  /** Whether the specified lot exists at the source (true when no lot specified). */
  lotExists: boolean;
  /** Whether the specified serial exists at the source (true when none specified). */
  serialExists: boolean;
}

export interface MoveValidationInput {
  settings: WmsSettings;
  destination: WarehouseLocation;
  destinationInventory: InventoryRecord[];
  destinationPalletCount: number;
  item: MoveItem;
  quantity: number;
  /** Incremental usage the move adds toward the destination's capacity. */
  added: { pallets: number; units: number; weight: number; volume: number };
  source?: MoveSource;
  /** Reference the move is for, matched against a reserved destination. */
  moveReference?: string;
  /**
   * Whether the destination's purpose holds stock. Defaults to true; pass false
   * for non-storage cells (walkable paths, obstacles…) to reject the move.
   */
  destinationHoldsStock?: boolean;
}

export function validateMove(input: MoveValidationInput): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const { settings, destination, destinationInventory, item, quantity } = input;

  const fail = (code: string, message: string) => errors.push({ code, message });
  const warn = (code: string, message: string) => warnings.push({ code, message });
  const ruleViolation = (mode: ViolationMode, code: string, message: string) =>
    (mode === 'BLOCK' ? fail : warn)(code, message);

  // 1. Feature on
  if (!settings.masterEnabled) {
    fail('feature_off', 'The warehouse module is turned off.');
    return { ok: false, errors, warnings };
  }

  // 2. Quantity
  if (!(quantity > 0)) fail('quantity', 'Quantity must be greater than zero.');

  // 3. Location usable
  if (input.destinationHoldsStock === false) {
    fail('not_storage', `Location ${destination.code} is not a storage cell.`);
  }
  if (!destination.enabled) {
    fail('location_disabled', `Location ${destination.code} is disabled.`);
  } else if (destination.status === 'BLOCKED' || destination.status === 'DAMAGED') {
    fail('location_blocked', `Location ${destination.code} is blocked/damaged.`);
  } else if (destination.status === 'MAINTENANCE') {
    fail('location_maintenance', `Location ${destination.code} is under maintenance.`);
  }

  // 4. Reservation match
  if (destination.reservation.isReserved) {
    const reference = destination.reservation.reference.trim();
    if (!input.moveReference || input.moveReference.trim() !== reference) {
      fail(
        'reserved',
        `Location ${destination.code} is reserved${reference ? ` for ${reference}` : ''}.`,
      );
    }
  }

  // 5. Capacity (four dimensions)
  const currentUnits = destinationInventory.reduce((s, r) => s + (r.quantity || 0), 0);
  const currentWeight = destinationInventory.reduce((s, r) => s + (r.weight || 0), 0);
  const currentVolume = destinationInventory.reduce((s, r) => s + (r.volume || 0), 0);
  const capacity = destination.capacity;
  const checkCapacity = (max: number | null, current: number, added: number, label: string) => {
    if (max != null && current + added > max) {
      ruleViolation(
        settings.capacityViolation,
        'capacity',
        `Exceeds ${label} capacity of ${destination.code} (${current + added} > ${max}).`,
      );
    }
  };
  checkCapacity(capacity.maxPallets, input.destinationPalletCount, input.added.pallets, 'pallet');
  checkCapacity(capacity.maxUnits, currentUnits, input.added.units, 'unit');
  checkCapacity(capacity.maxWeight, currentWeight, input.added.weight, 'weight');
  checkCapacity(capacity.maxVolume, currentVolume, input.added.volume, 'volume');

  // 6. Allowed / restricted material types
  const rules = destination.materialRules;
  const type = item.materialType.trim();
  if (type) {
    if (rules.allowedMaterialTypes.length > 0 && !rules.allowedMaterialTypes.includes(type)) {
      ruleViolation(settings.materialRuleViolation, 'type_not_allowed', `${destination.code} does not allow material type ${type}.`);
    }
    if (rules.restrictedMaterialTypes.includes(type)) {
      ruleViolation(settings.materialRuleViolation, 'type_restricted', `${destination.code} restricts material type ${type}.`);
    }
  }

  // 7. Mixing different items
  if (!rules.allowMixedItems) {
    const other = destinationInventory.find((r) => r.itemCode !== item.itemCode);
    if (other) {
      ruleViolation(settings.materialRuleViolation, 'no_mixing', `${destination.code} already holds ${other.itemCode}; mixing items is not allowed.`);
    }
  }

  // 8. Single lot only
  if (rules.singleLotOnly && item.lotNumber) {
    const other = destinationInventory.find((r) => r.lotNumber && r.lotNumber !== item.lotNumber);
    if (other) {
      ruleViolation(settings.materialRuleViolation, 'single_lot', `${destination.code} is single-lot and already holds lot ${other.lotNumber}.`);
    }
  }

  // 9. Temperature
  if (rules.temperatureClass && item.temperatureClass && rules.temperatureClass !== item.temperatureClass) {
    ruleViolation(settings.materialRuleViolation, 'temperature', `${destination.code} is ${rules.temperatureClass}; item needs ${item.temperatureClass}.`);
  }

  // 10. Hazardous materials
  if (item.hazmatClass) {
    if (!rules.hazmatAllowed) {
      ruleViolation(settings.materialRuleViolation, 'hazmat_not_allowed', `${destination.code} does not allow hazardous materials.`);
    } else if (rules.hazmatClasses.length > 0 && !rules.hazmatClasses.includes(item.hazmatClass)) {
      ruleViolation(settings.materialRuleViolation, 'hazmat_class', `${destination.code} does not allow hazmat class ${item.hazmatClass}.`);
    }
  }

  // 11. Expiry order (FEFO) — a soft warning when mixing different expiries
  if (item.expiryDate) {
    const earlier = destinationInventory.find(
      (r) => r.itemCode === item.itemCode && r.expiryDate && r.expiryDate < item.expiryDate!,
    );
    if (earlier) {
      warn('expiry_order', `${destination.code} already holds earlier-expiry stock of ${item.itemCode}; FEFO picking order may be affected.`);
    }
  }

  // 12. Sufficient stock on the way out
  if (input.source) {
    if (input.source.availableQuantity < quantity) {
      if (settings.allowNegativeStock) {
        warn('negative_stock', `Source has only ${input.source.availableQuantity}; this will drive stock negative.`);
      } else {
        fail('insufficient_stock', `Source ${input.source.location.code} has only ${input.source.availableQuantity} available.`);
      }
    }
    // 13. Lot / serial existence
    if (item.lotNumber && !input.source.lotExists) {
      fail('lot_missing', `Lot ${item.lotNumber} is not present at ${input.source.location.code}.`);
    }
    if (item.serialNumber && !input.source.serialExists) {
      fail('serial_missing', `Serial ${item.serialNumber} is not present at ${input.source.location.code}.`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
