/**
 * Planning & Purchase permissions.
 *
 * Four, and the last three are deliberately separate. Raising a purchase order,
 * approving it, and committing it to SAP are three different acts of authority:
 * a buyer who can do all three alone can commit the company's money without
 * anyone else seeing the number. The backend enforces the same split, and also
 * refuses to let one person approve their own order.
 */
export const PLANNING_PURCHASE_PERMISSIONS = {
  /** Read the plan, its buckets, and the material requirement it implies. */
  VIEW: 'planning_purchase.can_view_production_plan',
  /** Raise a draft purchase order from the requirement, and edit it while draft. */
  CREATE_PO: 'planning_purchase.can_create_purchase_order',
  /** Approve a draft so it becomes postable. */
  APPROVE_PO: 'planning_purchase.can_approve_purchase_order',
  /** Create the real document in SAP. */
  POST_PO: 'planning_purchase.can_post_purchase_order_to_sap',
} as const;

export type PlanningPurchasePermission =
  (typeof PLANNING_PURCHASE_PERMISSIONS)[keyof typeof PLANNING_PURCHASE_PERMISSIONS];

/** Anyone holding any of these belongs in the module. */
export const PLANNING_PURCHASE_ACCESS: string[] = [
  PLANNING_PURCHASE_PERMISSIONS.VIEW,
  PLANNING_PURCHASE_PERMISSIONS.CREATE_PO,
  PLANNING_PURCHASE_PERMISSIONS.APPROVE_PO,
  PLANNING_PURCHASE_PERMISSIONS.POST_PO,
];

/**
 * Hides the whole sidebar entry from users with no `planning_purchase.*`
 * permission. This is the sidebar gate: `hasModulePermission` returns true only
 * if the user holds at least one permission starting with this prefix.
 *
 * No trailing dot — `hasModulePermission` appends one itself, so a prefix
 * written as `planning_purchase.` becomes `planning_purchase..` and matches
 * nothing; the entry would then stay hidden even from users who DO hold it.
 *
 * NOT `production_planning`. That app label still exists in the live database
 * from a deleted predecessor — four tables, four recorded migrations and real
 * data. Reusing it meant Django saw this module's `0001_initial` as already
 * applied, so its tables and permissions were never created and the sidebar
 * entry could never appear.
 */
export const PLANNING_PURCHASE_MODULE_PREFIX = 'planning_purchase';
