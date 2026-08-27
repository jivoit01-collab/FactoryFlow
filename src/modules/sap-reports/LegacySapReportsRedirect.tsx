import { Navigate, useParams } from 'react-router-dom';

/**
 * Sends the pre-move `/sap-reports/*` paths to their new home under
 * `/dashboards/sap-reports`, carrying the report slug through so a link to a
 * specific report still opens it.
 *
 * `<Navigate>` cannot do this alone — it does not interpolate route params, so
 * the splat has to be read and re-appended here.
 *
 * Lives in its own file because `module.config.tsx` exports a config object, and
 * a file that exports both a component and a non-component breaks fast refresh.
 */
export function LegacySapReportsRedirect() {
  const params = useParams();
  const rest = params['*'] ?? '';
  return <Navigate to={`/dashboards/sap-reports${rest ? `/${rest}` : ''}`} replace />;
}
