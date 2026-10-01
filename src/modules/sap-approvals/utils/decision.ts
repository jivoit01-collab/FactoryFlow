import type { SapApprovalRequest } from '../types';

/**
 * The action that changes the reader's own decision on a request, when the
 * server allows one (`can_change_decision`): reject what they approved, approve
 * what they rejected. Null for anything else, posted or withdrawn included.
 */
export function changeMode(request: SapApprovalRequest): 'approve' | 'reject' | null {
  if (!request.can_change_decision) return null;
  if (request.status === 'APPROVED') return 'reject';
  if (request.status === 'REJECTED') return 'approve';
  return null;
}
