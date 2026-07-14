export const DISPATCH_MODULE_PREFIX = 'dispatch_plans';

export const DISPATCH_PERMISSIONS = {
  VIEW_PLANS: 'dispatch_plans.can_view_dispatch_plans',
  EDIT_PLANS: 'dispatch_plans.can_edit_dispatch_plans',
  LINK_VEHICLE: 'dispatch_plans.can_link_dispatch_vehicle',
  SELECT_BILLS: 'dispatch_plans.can_select_dispatch_bills',
  VIEW_OPEN_BILTIES: 'dispatch_plans.can_view_open_bilties',
  POST_BILTY_GRPO: 'dispatch_plans.can_post_bilty_service_grpo',
  VIEW_TRANSPORTER_AP_INVOICE: 'dispatch_plans.can_view_transporter_ap_invoice',
  POST_TRANSPORTER_AP_INVOICE: 'dispatch_plans.can_post_transporter_ap_invoice',
  // Inside Vehicle Manager (dispatch correction console) — one per action/button.
  INSIDE_VEHICLE_VIEW: 'dispatch_plans.can_view_inside_vehicle_manager',
  INSIDE_VEHICLE_ADD_BILL: 'dispatch_plans.can_add_bill_inside_vehicle',
  INSIDE_VEHICLE_REMOVE_BILL: 'dispatch_plans.can_remove_bill_inside_vehicle',
  INSIDE_VEHICLE_MOVE_BILL: 'dispatch_plans.can_move_bill_inside_vehicle',
  INSIDE_VEHICLE_UNLINK_ALL: 'dispatch_plans.can_unlink_bills_inside_vehicle',
  INSIDE_VEHICLE_MARK_OUT: 'dispatch_plans.can_mark_out_inside_vehicle',
} as const;

export type DispatchPermission =
  (typeof DISPATCH_PERMISSIONS)[keyof typeof DISPATCH_PERMISSIONS];
