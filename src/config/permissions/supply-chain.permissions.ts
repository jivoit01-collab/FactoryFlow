/**
 * Smart Supply Chain permissions.
 *
 * Two only, on purpose. Everyone who works the loop needs to read it and record a
 * verdict — the buyer who made the phone call is the one who knows what happened,
 * so verdict entry sits behind VIEW rather than MANAGE. MANAGE covers the things
 * that change what everyone else sees: uploading reference data, tuning the
 * parameters, and publishing a run to the whole factory.
 */
export const SUPPLY_CHAIN_PERMISSIONS = {
  VIEW: 'supply_chain.can_view_supply_chain',
  MANAGE_REFERENCE: 'supply_chain.can_manage_supply_chain_reference',
} as const;

export type SupplyChainPermission =
  (typeof SUPPLY_CHAIN_PERMISSIONS)[keyof typeof SUPPLY_CHAIN_PERMISSIONS];

/** Anyone with either permission belongs in the module. */
export const SUPPLY_CHAIN_ACCESS: string[] = [
  SUPPLY_CHAIN_PERMISSIONS.VIEW,
  SUPPLY_CHAIN_PERMISSIONS.MANAGE_REFERENCE,
];

/**
 * Hides the whole sidebar entry from users with no `supply_chain.*` permission.
 *
 * No trailing dot: `hasModulePermission` appends one itself, so a prefix written
 * as `supply_chain.` becomes `supply_chain..` and matches nothing — the entry
 * then stays hidden even from users who DO hold the permission.
 */
export const SUPPLY_CHAIN_MODULE_PREFIX = 'supply_chain';
