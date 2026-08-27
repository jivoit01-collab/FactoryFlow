import { Navigate, useParams } from 'react-router-dom';

/**
 * Sends the pre-move `/goods-return/*` paths to their new home under
 * `/returns/customer`, carrying the rest of the path through so a link to a
 * specific return or wizard step still lands where it used to.
 *
 * `<Navigate>` on its own cannot do this — it does not interpolate route params,
 * so the splat has to be read and re-appended here.
 *
 * Lives in its own file because `module.config.tsx` exports a config object, and
 * a file that exports both a component and a non-component breaks fast refresh.
 */
export function LegacyGoodsReturnRedirect() {
  const params = useParams();
  const rest = params['*'] ?? '';
  return <Navigate to={`/returns/customer${rest ? `/${rest}` : ''}`} replace />;
}
