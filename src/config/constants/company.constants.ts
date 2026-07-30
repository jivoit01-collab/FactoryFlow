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
