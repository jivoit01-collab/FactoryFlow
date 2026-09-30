import { Navigate, useLocation } from 'react-router-dom';

/** Redirect to a page's new address, keeping the query (`?materialType=` and the like). */
export function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}
