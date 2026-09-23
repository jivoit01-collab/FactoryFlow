/**
 * Company Vehicle (fleet) permissions.
 *
 * Four strings, mapping 1:1 to the custom Django permissions on
 * `company_vehicle.FleetPermission`:
 *
 *   Fleet Viewer    -> can_view_fleet
 *   Fleet Clerk     -> can_view_fleet + can_add_fleet_expense
 *   Fleet Manager   -> the above + can_manage_fleet_vehicle
 *   Fleet Approver  -> can_approve_fleet_expense
 *
 * Entering a bill and approving it are separate rights on purpose: the whole
 * point of the approval step is that the person who files the fuel slip is not
 * the person who passes it as spend.
 */

export const FLEET_PERMISSIONS = {
  /** Read the register, the entries and the cost report. */
  VIEW: 'company_vehicle.can_view_fleet',
  /** Add and edit the vehicles themselves. */
  MANAGE_VEHICLE: 'company_vehicle.can_manage_fleet_vehicle',
  /** Record fuel and service entries. */
  ADD_EXPENSE: 'company_vehicle.can_add_fleet_expense',
  /** Pass or send back a fuel or service entry. */
  APPROVE_EXPENSE: 'company_vehicle.can_approve_fleet_expense',
} as const;

export const FLEET_MODULE_PREFIX = 'company_vehicle';

/** Anything that should reveal the module in the sidebar. */
export const FLEET_ACCESS: readonly string[] = [
  FLEET_PERMISSIONS.VIEW,
  FLEET_PERMISSIONS.MANAGE_VEHICLE,
  FLEET_PERMISSIONS.ADD_EXPENSE,
  FLEET_PERMISSIONS.APPROVE_EXPENSE,
];

export type FleetPermission = (typeof FLEET_PERMISSIONS)[keyof typeof FLEET_PERMISSIONS];
