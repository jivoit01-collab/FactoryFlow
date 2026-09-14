import { useAuth } from '@/core/auth';

import { type LogisticsControlScope,logisticsControlScopeForCompany } from '../constants';

/**
 * Which plant's board this browser is looking at.
 *
 * The board and its settings screen live at one address for every company, and
 * the company switcher decides which plant they report on: sign into Jivo
 * Beverages and Logistics Control is the beverages wall, sign into Oil or Mart
 * and it is the BH-BT wall it has always been. A wall screen is therefore a
 * browser left signed into the company that plant belongs to — the same way
 * every other company-scoped screen here already works — rather than a second
 * URL that shows one company's tonnage to whoever is signed into the other.
 *
 * `override` exists for the callers that must pin a scope regardless of the
 * viewer — tests, and anything rendering a named board on purpose. Passing
 * nothing is the normal path.
 */
export function useLogisticsControlScope(override?: LogisticsControlScope): LogisticsControlScope {
  const { currentCompany } = useAuth();
  return override ?? logisticsControlScopeForCompany(currentCompany?.company_code);
}
