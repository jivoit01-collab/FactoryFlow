/**
 * Request Labour Permissions
 *
 * These map 1:1 to the custom Django permissions on `labour_request.LabourRequest`.
 *
 * Three rights, deliberately not a ladder — they belong to three different
 * people. A department head RAISES tomorrow's ask; whoever carries the labour
 * bill DECIDES it; and planning, the gate and the plant head need to READ the
 * agreed headcount without touching either side of it.
 *
 * This is the evening half of the labour story: `labour_gate` (see
 * `labour.permissions.ts`) records what actually walked in the next morning.
 *
 * @see labour.permissions.ts (the standalone Labour module — today's allocation)
 */

export const LABOUR_REQUEST_PERMISSIONS = {
  /** Open the Request Labour board */
  VIEW: 'labour_request.can_view_labour_request',
  /** Raise, revise or withdraw a department's ask */
  RAISE: 'labour_request.can_raise_labour_request',
  /** Approve, reject or reopen an ask */
  DECIDE: 'labour_request.can_decide_labour_request',
} as const;

export const LABOUR_REQUEST_MODULE_PREFIX = 'labour_request';

/**
 * Anything that should reveal the Request Labour page. Raising or deciding
 * implies being able to read the board, so all three open it — the backend
 * takes the same view.
 */
export const LABOUR_REQUEST_ACCESS: readonly string[] = [
  LABOUR_REQUEST_PERMISSIONS.VIEW,
  LABOUR_REQUEST_PERMISSIONS.RAISE,
  LABOUR_REQUEST_PERMISSIONS.DECIDE,
];

export type LabourRequestPermission =
  (typeof LABOUR_REQUEST_PERMISSIONS)[keyof typeof LABOUR_REQUEST_PERMISSIONS];
