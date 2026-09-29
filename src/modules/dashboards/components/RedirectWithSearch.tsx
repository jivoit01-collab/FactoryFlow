import { Navigate, useLocation } from 'react-router-dom';

/**
 * A board that moved to another module, forwarded with its query string.
 *
 * `Navigate` alone drops it, and the stock alert notifications open
 * `/dashboards/stock-levels?search=<item>` -- forwarding without the search
 * would land every alert on the unfiltered board.
 */
export function RedirectWithSearch({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}
