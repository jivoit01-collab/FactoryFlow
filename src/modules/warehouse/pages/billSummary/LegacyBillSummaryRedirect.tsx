import { Navigate, useParams } from 'react-router-dom';

/**
 * Sends the pre-move `/dispatch/bill-summaries/*` paths to their home under
 * `/warehouse`, carrying the rest of the path through so a bookmarked sheet
 * still opens.
 *
 * `<Navigate>` cannot do this alone — it does not interpolate route params — so
 * the splat is read and re-appended here. Its own file because a module config
 * that exports both a component and a config object breaks fast refresh.
 */
export function LegacyBillSummaryRedirect() {
  const params = useParams();
  const rest = params['*'] ?? '';
  return <Navigate to={`/warehouse/bill-summaries${rest ? `/${rest}` : ''}`} replace />;
}
