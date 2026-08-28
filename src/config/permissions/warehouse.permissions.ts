/**
 * Warehouse Module Permissions
 *
 * These constants map to dedicated `warehouse` Django permissions on the
 * BOMRequest / FinishedGoodsReceipt models. VIEW/APPROVE/ISSUE/RECEIVE are the
 * warehouse-store side (the "BOM & FG Store" group); CREATE_BOM_REQUEST and the
 * FG create/view perms are held by production so run-screen submit/receive keep
 * working without exposing the whole Warehouse module.
 */

export const WAREHOUSE_PERMISSIONS = {
  /** View BOM requests (warehouse store) — gates the Warehouse module */
  VIEW_BOM_REQUEST: 'warehouse.can_view_bom_request',
  /** Create / submit BOM requests (production side) */
  CREATE_BOM_REQUEST: 'warehouse.can_create_bom_request',
  /** Approve or reject BOM requests (warehouse store) */
  APPROVE_BOM_REQUEST: 'warehouse.can_approve_bom_request',
  /** Issue materials to SAP (warehouse store) */
  ISSUE_MATERIALS: 'warehouse.can_issue_materials',
  /** View finished goods receipts */
  VIEW_FG_RECEIPT: 'warehouse.can_view_fg_receipt',
  /** Receive finished goods (warehouse store) */
  RECEIVE_FG: 'warehouse.can_receive_fg',

  // Branch Stock Transfer (BST) — dedicated Django permissions on the warehouse
  // BSTTransfer model, so a "BST Operator" group can be granted just these
  // without exposing the rest of the warehouse/production modules.
  /** View / list branch stock transfers */
  VIEW_BST: 'warehouse.view_bsttransfer',
  /** Create a branch stock transfer + scan boxes onto it */
  CREATE_BST: 'warehouse.can_create_bst',
  /** Receive an incoming branch stock transfer */
  MANAGE_BST: 'warehouse.can_receive_bst',
  /** Raise a partial-transfer approval (seal a BST short of the bill) */
  REQUEST_BST_PARTIAL: 'warehouse.can_request_bst_partial_transfer',
  /** Review (approve/reject) BST partial-transfer requests */
  APPROVE_BST_PARTIAL: 'warehouse.can_approve_bst_partial_transfer',

  // Warehouse Transfer Requests — the two-party ask that becomes a SAP transfer.
  // Raising and approving are separate permissions on purpose: the point of the
  // flow is that the *receiving* warehouse decides, so one warehouse must never
  // hold both for its own requests.
  /** View transfer requests */
  VIEW_TRANSFER_REQUEST: 'warehouse.can_view_transfer_request',
  /** Raise a transfer request (source warehouse) */
  CREATE_TRANSFER_REQUEST: 'warehouse.can_create_transfer_request',
  /** Approve or reject a transfer request (receiving warehouse) */
  APPROVE_TRANSFER_REQUEST: 'warehouse.can_approve_transfer_request',
  /** Post an approved transfer to SAP, and post the second leg on receipt */
  POST_TRANSFER_TO_SAP: 'warehouse.can_post_transfer_to_sap',

  // Deciding WHO runs a warehouse is an administrator's job, kept apart from
  // the movement permissions so a warehouse manager cannot widen their own
  // scope.
  /** Assign users as managers of warehouses */
  MANAGE_USER_WAREHOUSES: 'warehouse.can_manage_user_warehouses',
} as const;

export const WAREHOUSE_MODULE_PREFIX = 'warehouse';

export type WarehousePermission =
  (typeof WAREHOUSE_PERMISSIONS)[keyof typeof WAREHOUSE_PERMISSIONS];
