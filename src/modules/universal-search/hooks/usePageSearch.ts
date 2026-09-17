import { useMemo } from 'react';

import { useAuth } from '@/core/auth';
import { usePermission } from '@/core/auth/hooks/usePermission';

import type { PageHit } from '../utils/pageSearch';
import { searchPages } from '../utils/pageSearch';

/**
 * Screens matching what the user typed, filtered to the ones they can open.
 *
 * Local and synchronous. The registry is in memory already, so this answers on
 * the keystroke rather than on the debounce — which is the point: by the time
 * SAP has been asked about a number, the user looking for a page has already
 * found it.
 */
export function usePageSearch(query: string): PageHit[] {
  const { hasAnyPermission, hasModulePermission, permissionsLoaded } = usePermission();
  const { currentCompany } = useAuth();
  const companyCode = currentCompany?.company_code;

  return useMemo(() => {
    // Before permissions land, everything would look forbidden. Better to
    // show nothing for a moment than to tell the user a page does not exist.
    if (!permissionsLoaded) return [];
    return searchPages(query, { hasAnyPermission, hasModulePermission, companyCode });
  }, [query, permissionsLoaded, hasAnyPermission, hasModulePermission, companyCode]);
}
