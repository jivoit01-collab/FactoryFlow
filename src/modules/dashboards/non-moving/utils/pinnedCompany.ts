import {
  COMPANY_CODE_LIST,
  COMPANY_LABELS,
  type CompanyCode,
} from '@/config/constants/company.constants';

/**
 * The company a `?company=` link asks this page to show, when it is not the
 * one the reader is signed into.
 *
 * The Amounts board links here from both plant rows. Without this the
 * Beverage row's tile would land on Oil's report for anybody signed into Oil,
 * under the same heading -- the wrong figure, looking right. The backend lets
 * staff read a group company's report (`HasBoardCompanyContext`), so pinning
 * the header is all it takes.
 *
 * Anything that is not a group company code, or IS the active one, pins
 * nothing and the page behaves exactly as it always has.
 */
export function pinnedCompany(
  param: string | null | undefined,
  activeCode: string | null | undefined,
): { code: CompanyCode; label: string } | null {
  const code = (param ?? '').trim().toUpperCase();
  const known = COMPANY_CODE_LIST.find((candidate) => candidate === code);
  if (!known || known === activeCode) return null;
  return { code: known, label: COMPANY_LABELS[known] };
}
