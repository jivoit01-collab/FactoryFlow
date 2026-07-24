// Raw material (RM) vs packaging material (PM) is read off the visible item-code
// prefix ("RM…"), mirroring the backend rule in
// gate_core/services/weighment_rules.py. Weighment is mandatory only when a
// raw-material vehicle is carrying an all-RM load; any PM (or other) line makes
// it a mixed load and weighment stays optional, so PM/mixed vehicles are never
// blocked on a weighbridge pass the operator can't explain.

export const RM_ITEM_CODE_PREFIX = 'RM';

export function isRmItemCode(code: string | null | undefined): boolean {
  return typeof code === 'string' && code.trim().toUpperCase().startsWith(RM_ITEM_CODE_PREFIX);
}

/** True when there is at least one item and every item code is an RM code. */
export function isAllRmLoad(itemCodes: Array<string | null | undefined>): boolean {
  const codes = itemCodes.filter(
    (code): code is string => typeof code === 'string' && code.trim() !== '',
  );
  return codes.length > 0 && codes.every(isRmItemCode);
}
