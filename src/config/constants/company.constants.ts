/**
 * Company unit codes. Must match `Company.code` on the backend (the value sent
 * as the `Company-Code` header and stored on `currentCompany.company_code`).
 */
export const COMPANY_CODES = {
  JIVO_OIL: 'JIVO_OIL',
  JIVO_MART: 'JIVO_MART',
  JIVO_BEVERAGES: 'JIVO_BEVERAGES',
} as const;

export type CompanyCode = (typeof COMPANY_CODES)[keyof typeof COMPANY_CODES];

/** Display names for the company codes — for pickers and read-only columns. */
export const COMPANY_LABELS: Record<CompanyCode, string> = {
  [COMPANY_CODES.JIVO_OIL]: 'Jivo Oil',
  [COMPANY_CODES.JIVO_MART]: 'Jivo Mart',
  [COMPANY_CODES.JIVO_BEVERAGES]: 'Jivo Beverages',
};

/** Stable order for company pickers. */
export const COMPANY_CODE_LIST: CompanyCode[] = [
  COMPANY_CODES.JIVO_OIL,
  COMPANY_CODES.JIVO_BEVERAGES,
  COMPANY_CODES.JIVO_MART,
];
