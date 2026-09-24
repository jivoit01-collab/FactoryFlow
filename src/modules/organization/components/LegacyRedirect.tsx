import { Navigate, useLocation } from 'react-router-dom';

/**
 * Sends a pre-move URL to where the page lives now, keeping its query string
 * and hash — a bookmarked `?month=` or a push notification's deep link should
 * land on the same view, not on the page's default.
 */
export function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}
