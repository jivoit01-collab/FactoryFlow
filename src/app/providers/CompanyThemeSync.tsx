import { useEffect } from 'react';

import { COMPANY_CODES } from '@/config/constants/company.constants';
import { useAppSelector } from '@/core/store';

/**
 * Paints the whole app in the active company's colour.
 *
 * Writes `data-company` on <html>; `src/index.css` hangs a full token palette
 * off that attribute, so every surface, button, ring and border follows the
 * unit — not just the header chip. Renders nothing.
 *
 * Only the three known codes are written. An unrecognised code (a new company
 * added on the backend before a palette exists here) clears the attribute and
 * falls back to the default theme, which is the safe outcome: a neutral app,
 * never an unstyled one.
 */
const THEMED_COMPANIES = new Set<string>(Object.values(COMPANY_CODES));

export function CompanyThemeSync() {
  const companyCode = useAppSelector((state) => state.auth.currentCompany?.company_code);

  useEffect(() => {
    const root = window.document.documentElement;

    if (companyCode && THEMED_COMPANIES.has(companyCode)) {
      root.setAttribute('data-company', companyCode);
    } else {
      root.removeAttribute('data-company');
    }
  }, [companyCode]);

  return null;
}
