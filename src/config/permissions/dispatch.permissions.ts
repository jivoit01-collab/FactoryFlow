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
  // Bill summary (the picking sheet). Raising, approving and picking are three
  // permissions because they are three desks: dispatch fills the sheet in, the
  // warehouse gives it a dispatch date — which is the moment SAP is written to —
  // and the floor confirms what came off it. One person holding all three can
  // date and pick a dispatch nobody checked.
  VIEW_BILL_SUMMARY: 'dispatch_plans.can_view_bill_summary',
  CREATE_BILL_SUMMARY: 'dispatch_plans.can_create_bill_summary',
  APPROVE_BILL_SUMMARY: 'dispatch_plans.can_approve_bill_summary',
  PICK_BILL_SUMMARY: 'dispatch_plans.can_pick_bill_summary',
  CANCEL_BILL_SUMMARY: 'dispatch_plans.can_cancel_bill_summary',
  // The Dispatch Sheet — the outward register, read-only. Anyone who can see
  // the plans sees it too; the right of its own is for the office staff who
  // keep the register and have no business editing a plan.
  VIEW_SHEET: 'dispatch_plans.can_view_dispatch_sheet',
  // Freight Benchmarks — what a truckload should cost to each destination, by
  // vehicle size. Editing is its own right: vehicle linking holds a truck's
  // actual freight against these, so whoever moves a benchmark moves the line.
  VIEW_FREIGHT_BENCHMARKS: 'dispatch_plans.can_view_freight_benchmarks',
  MANAGE_FREIGHT_BENCHMARKS: 'dispatch_plans.can_manage_freight_benchmarks',
  // Admin > Freight Approvals — a truck linked at a freight over its benchmark.
  // Entering the freight rides on LINK_VEHICLE; seeing and deciding are these.
  VIEW_FREIGHT_APPROVALS: 'dispatch_plans.can_view_freight_approvals',
  APPROVE_FREIGHT_APPROVALS: 'dispatch_plans.can_approve_freight_approvals',
  // Dispatch Tracking (post-dispatch truck status log).
  DISPATCH_TRACKING_VIEW: 'gate_core.can_view_dispatch_tracking',
  DISPATCH_TRACKING_UPDATE: 'gate_core.can_update_dispatch_tracking',
} as const;

export type DispatchPermission =
  (typeof DISPATCH_PERMISSIONS)[keyof typeof DISPATCH_PERMISSIONS];
