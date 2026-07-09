/**
 * Returnable Items Module Permissions
 *
 * Backed by the `returnable_items` Django app. The document is owned by the
 * department but two of its four stages happen at the gate, so the gate-side
 * permissions live here too and are re-exported into GATE_PERMISSIONS.
 */

export const RETURNABLE_MODULE_PREFIX = 'returnable_items';

export const RETURNABLE_PERMISSIONS = {
  /** See the module at all */
  VIEW_MODULE: 'returnable_items.can_view_returnable_module',
  /** Read gate passes */
  VIEW_GATEPASS: 'returnable_items.can_view_returnable_gatepass',
  /** Department: create / edit / delete a draft gate pass */
  MANAGE_GATEPASS: 'returnable_items.can_manage_returnable_gatepass',
  /** Department: send the pass to the gate */
  SUBMIT_GATEPASS: 'returnable_items.can_submit_returnable_gatepass',
  /** Gate: fill vehicle details and let the material out */
  GATE_OUT: 'returnable_items.can_gate_out_returnable',
  /** Gate: check the returning items and accept them back in */
  GATE_IN: 'returnable_items.can_gate_in_returnable',
  /** Gate: bounce a mismatched pass back to the department */
  REJECT_AT_GATE: 'returnable_items.can_reject_returnable_at_gate',
  /** Department: confirm the returned material has been collected from the gate */
  ACKNOWLEDGE: 'returnable_items.can_acknowledge_returnable',
  /** Department: close a fully returned and acknowledged pass */
  CLOSE: 'returnable_items.can_close_returnable',
  /** Admin: close a pass whose items will never come back */
  SHORT_CLOSE: 'returnable_items.can_short_close_returnable',
  /** Department: cancel a pass before anything has come back */
  CANCEL: 'returnable_items.can_cancel_returnable',
  /** Register, ageing and party-wise reports */
  VIEW_REPORTS: 'returnable_items.can_view_returnable_reports',
} as const;

export type ReturnablePermission =
  (typeof RETURNABLE_PERMISSIONS)[keyof typeof RETURNABLE_PERMISSIONS];
