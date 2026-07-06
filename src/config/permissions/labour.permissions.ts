/**
 * Labour Module Permissions
 *
 * These constants map to Django permissions defined in the backend.
 * Format: 'app_label.permission_codename'
 *
 * The standalone Labour module (`/labour`) renders the labour-gate
 * contractor/department split screen, which is backed by the `labour_gate`
 * Django app. Granting only these permissions gives a user Labour-module access
 * and nothing else. The screen also loads the contractor master, so
 * `person_gatein.view_contractor` is required on the backend to populate the
 * contractor dropdown (that permission is defined under the gate module).
 *
 * Two dedicated actions, each grantable on its own:
 *   - IN  → record how many labourers a contractor brought in
 *   - OUT → mark labour leaving at the gate
 *
 * Note: the same `labour_gate` codenames are also surfaced under
 * `GATE_PERMISSIONS.LABOUR_GATE` for the in-module gate routes. This file is
 * the canonical home for the standalone Labour module.
 *
 * @see gate.permissions.ts (GATE_PERMISSIONS.LABOUR_GATE, PERSON_GATE_IN)
 */

export const LABOUR_PERMISSIONS = {
  /** View labour gate in/out entries */
  VIEW: 'labour_gate.view_labourgateentry',
  /** Record how many labourers a contractor brought in at the gate (gate person) */
  IN: 'labour_gate.can_record_labour_in',
  /** Record labour leaving at the gate (gate person) */
  OUT: 'labour_gate.can_record_labour_out',
  /** Split a contractor's gate labour across departments (HOD / Labour module) */
  ALLOCATE: 'labour_gate.can_allocate_labour_department',
} as const;

/**
 * Module prefix for sidebar filtering. The Labour module maps to a single
 * Django app, so granting anything under `labour_gate` lights up the module.
 */
export const LABOUR_MODULE_PREFIX = ['labour_gate'] as const;

/**
 * Type for Labour permission values
 */
export type LabourPermission = (typeof LABOUR_PERMISSIONS)[keyof typeof LABOUR_PERMISSIONS];
