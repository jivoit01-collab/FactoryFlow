/**
 * Goods Return Module Permissions
 *
 * These strings map 1:1 to the custom Django permissions declared on the
 * `goods_return.GoodsReturn` model (`goods_return.can_*`). The returns clerk
 * holds VIEW/CREATE/EDIT/SUBMIT; the gate person holds GATE_IN so the "Goods
 * Return In" gate queue + mark-in is exposed without the whole returns module.
 */

export const GOODS_RETURN_PERMISSIONS = {
  /** View / list goods returns — gates the Goods Return module */
  VIEW: 'goods_return.can_view_goods_return',
  /** Create a new goods return */
  CREATE: 'goods_return.can_create_goods_return',
  /** Edit a draft goods return (items, vehicle, attachments) */
  EDIT: 'goods_return.can_edit_goods_return',
  /** Submit a goods return (finalize → awaiting gate arrival) */
  SUBMIT: 'goods_return.can_submit_goods_return',
  /** Mark a goods-return vehicle in at the gate */
  GATE_IN: 'goods_return.can_gate_in_goods_return',
  /** Approve / reject a goods return flagged "coming on approval" (admin) */
  APPROVE: 'goods_return.can_approve_goods_return',
} as const;

export const GOODS_RETURN_MODULE_PREFIX = 'goods_return';

/** Any permission that should reveal the module (view or create). */
export const GOODS_RETURN_ACCESS: readonly string[] = [
  GOODS_RETURN_PERMISSIONS.VIEW,
  GOODS_RETURN_PERMISSIONS.CREATE,
];

export type GoodsReturnPermission =
  (typeof GOODS_RETURN_PERMISSIONS)[keyof typeof GOODS_RETURN_PERMISSIONS];
