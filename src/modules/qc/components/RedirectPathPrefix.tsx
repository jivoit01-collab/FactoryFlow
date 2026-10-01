import { Navigate, useLocation } from 'react-router-dom';

/**
 * Redirect an old address to its new one by swapping the start of its path,
 * keeping the rest and the query: `/qc/production/entries/7` with
 * `from="/qc/production"` and `to="/qc/qa-reports"` opens `/qc/qa-reports/entries/7`.
 */
export function RedirectPathPrefix({ from, to }: { from: string; to: string }) {
  const { pathname, search } = useLocation();
  const rest = pathname.startsWith(from) ? pathname.slice(from.length) : '';
  return <Navigate to={`${to}${rest}${search}`} replace />;
}
