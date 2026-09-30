import { Navigate } from 'react-router-dom';

import { usePermission } from '@/core/auth';

import type { QCSectionTab } from '../components/QCSectionTabs';
import { firstAllowedPath } from '../constants/qcSections';

/**
 * A section's bare path (`/qc`, `/qc/master`) has no page of its own: it opens
 * the first page in the section the user may see. The route is gated on the
 * union of those pages' permissions, so there is always one to land on.
 */
export default function QCSectionRedirect({
  candidates,
}: {
  candidates: readonly Pick<QCSectionTab, 'path' | 'permissions'>[];
}) {
  const { hasAnyPermission } = usePermission();
  const to = firstAllowedPath(candidates, hasAnyPermission) ?? '/unauthorized';
  return <Navigate to={to} replace />;
}
