import { Navigate, useLocation } from 'react-router-dom';

/**
 * Legacy redirect: this page was called Transfer Requests and lived under
 * `/warehouse/transfer-requests`. It is the Inventory Transfer page now — the
 * document side of a branch move, as against BST's physical side.
 *
 * Carries the path tail and query across, so an old bookmark or deep link to
 * one request still lands on that request. No permissions here; the destination
 * route does the gating.
 */
export function LegacyTransferRequestRedirect() {
  const { pathname, search } = useLocation();
  const tail = pathname.replace(/^\/warehouse\/transfer-requests/, '');

  return <Navigate to={`/warehouse/inventory-transfer${tail}${search}`} replace />;
}
