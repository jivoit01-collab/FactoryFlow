/**
 * Board feed read rights — the mirror of `control_boards/feeds.py`.
 *
 * WHAT THESE ARE FOR
 * Everything else in this folder is an OPERATIONAL right: holding it opens a
 * module's screens, and — because the sidebar shows a module when the user
 * holds any permission under its app label (`hasModulePermission` in
 * `core/auth/hooks/usePermission.ts`) — holding it also puts that module in the
 * menu.
 *
 * That is the bug these exist to fix. `DASHBOARDS_PERMISSIONS` are not
 * dashboard rights at all; every one of them is an alias of a module right
 * (`VIEW_DISPATCH_PLANS` *is* `dispatch_plans.can_view_dispatch_plans`). So
 * filling a board's cards meant granting the module, and granting the module
 * revealed it. "Grant the data" and "reveal the module" were the same act.
 *
 * A right here grants exactly one composed board read on the server and nothing
 * else. It lives under the `control_boards` app label, which no nav item uses
 * as a `modulePrefix` — and none ever should, or the leak re-opens.
 *
 * HOW A BOARD USES THEM
 * A board's route and tile gates accept the feed right OR the operational
 * right it mirrors, never the feed right alone:
 *
 *     export const WAREHOUSE_CONTROL_VIEW_PERMISSIONS = [
 *       BOARD_FEED_PERMISSIONS.NON_MOVING,
 *       DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
 *     ];
 *
 * The OR is what makes this invisible to everybody who can already read the
 * board — exactly what `may_read` does on the server. Dropping the operational
 * right from one of these lists would lock out today's users.
 *
 * THESE ARE STRINGS ON BOTH SIDES OF THE STACK.
 * Each one must match its `control_boards.feeds.FEEDS` entry character for
 * character. There is no build step that checks it, so a typo here reads as a
 * permanently locked tile rather than as an error.
 */

export const BOARD_FEED_PERMISSIONS = {
  /** SAP warehouse stock, occupancy and stock-in-transit. */
  STOCK: 'control_boards.can_read_stock_feed',
  NON_MOVING: 'control_boards.can_read_non_moving_feed',
  PRODUCTION_PLAN: 'control_boards.can_read_production_plan_feed',
  /** Reconciliation, movement, daily output — and the packing material board. */
  PRODUCTION_REPORTS: 'control_boards.can_read_production_reports_feed',
  /**
   * Deliberately separate from PRODUCTION_REPORTS: cost analysis is gated on
   * its own right upstream, so a shift supervisor can read output without
   * reading what it cost.
   */
  PRODUCTION_COST: 'control_boards.can_read_production_cost_feed',
  DISPATCH_PLANS: 'control_boards.can_read_dispatch_plans_feed',
  DISPATCH_PIPELINE: 'control_boards.can_read_dispatch_pipeline_feed',
  /** Freight rates, transporter account and open bilties — one feed upstream. */
  FREIGHT: 'control_boards.can_read_freight_feed',
  /**
   * The factory's wage and power bill in total. No per-employee figure is
   * exposed anywhere; see `admin_board/permissions.py` for the disclosure the
   * business accepted knowingly.
   */
  FACTORY_EXPENSE: 'control_boards.can_read_factory_expense_feed',
  /**
   * Pallet space. Note this is the FIRST read gate the WMS collections have
   * ever had — `WmsCollectionPermission` allows every safe method, so
   * `WMS_ACCESS` is a frontend-only gate today. This closes a hole rather than
   * relaxing one.
   */
  WMS_SPACE: 'control_boards.can_read_wms_space_feed',
  LABOUR: 'control_boards.can_read_labour_feed',
  /** Head count only. Salary reads are a separate family and are not included. */
  WORKFORCE: 'control_boards.can_read_workforce_feed',
  GRPO: 'control_boards.can_read_grpo_feed',
  DOCKING_SCAN: 'control_boards.can_read_docking_scan_feed',
  PF_MOVEMENT: 'control_boards.can_read_pf_movement_feed',
  GATE: 'control_boards.can_read_gate_feed',
  DISPATCH_TRACKING: 'control_boards.can_read_dispatch_tracking_feed',
  SALES_DISPATCH_OUT: 'control_boards.can_read_sales_dispatch_out_feed',
  GOODS_RETURN: 'control_boards.can_read_goods_return_feed',
  BUDGET_APPROVALS: 'control_boards.can_read_budget_approvals_feed',
  BLOWING: 'control_boards.can_read_blowing_feed',
  SALES_PLAN_REQ: 'control_boards.can_read_sales_plan_req_feed',
} as const;

export type BoardFeedPermission =
  (typeof BOARD_FEED_PERMISSIONS)[keyof typeof BOARD_FEED_PERMISSIONS];

/**
 * The app label every feed right lives under.
 *
 * Exported so a test can assert no navigation item uses it as a `modulePrefix`.
 * That assertion is the frontend half of the whole fix: if a nav item ever keys
 * off this prefix, a dashboard-only login gets a module in its sidebar again.
 */
export const BOARD_FEED_APP_LABEL = 'control_boards';
