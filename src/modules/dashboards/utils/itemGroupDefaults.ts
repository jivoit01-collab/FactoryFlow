export const ALL_MATERIAL_TYPES_VALUE = '';
export const DEFAULT_MATERIAL_TYPE_NAME = 'Packing Material';

export function isPackingMaterialGroup(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.includes('material') &&
    (normalized.includes('packing') || normalized.includes('packaging'))
  );
}

/**
 * SAP calls it `RAW MATERIAL` (code 106) in all three company schemas, but the
 * name is matched rather than the code for the same reason
 * `isPackingMaterialGroup` matches names: a renumbered group must not quietly
 * empty a board.
 */
export function isRawMaterialGroup(name: string): boolean {
  return name.trim().toLowerCase().includes('raw material');
}

/** The two groups the non-moving board covers, and nothing else. */
export function isRmOrPmGroup(name: string): boolean {
  return isPackingMaterialGroup(name) || isRawMaterialGroup(name);
}

export function findDefaultMaterialGroup<T>(
  itemGroups: T[],
  getName: (itemGroup: T) => string,
): T | undefined {
  return itemGroups.find((group) => isPackingMaterialGroup(getName(group))) ?? itemGroups[0];
}
