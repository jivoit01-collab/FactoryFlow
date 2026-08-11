/**
 * Order Processing permissions.
 *
 * Read is separated from the three actions because each action is a live read of
 * someone else's system — a sync hits OMS, a stock check hits SAP — and those
 * should not fire because a page was opened.
 */
export const ORDER_PROCESSING_PERMISSIONS = {
  VIEW: 'order_processing.can_view_orders',
  SYNC: 'order_processing.can_sync_orders',
  ALLOCATE: 'order_processing.can_allocate_stock',
  PLAN_PRODUCTION: 'order_processing.can_plan_production',
  PLAN_PROCUREMENT: 'order_processing.can_plan_procurement',
} as const;

export type OrderProcessingPermission =
  (typeof ORDER_PROCESSING_PERMISSIONS)[keyof typeof ORDER_PROCESSING_PERMISSIONS];

export const ORDER_PROCESSING_ACCESS: string[] = Object.values(ORDER_PROCESSING_PERMISSIONS);

/** No trailing dot — `hasModulePermission` appends one itself. */
export const ORDER_PROCESSING_MODULE_PREFIX = 'order_processing';
