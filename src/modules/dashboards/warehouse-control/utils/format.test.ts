import { describe, expect, it } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';

import { formatCompanyChip } from './format';

describe('formatCompanyChip', () => {
  it('shortens each company to something that fits beside a bill number', () => {
    expect(formatCompanyChip(COMPANY_CODES.JIVO_OIL)).toBe('Oil');
    expect(formatCompanyChip(COMPANY_CODES.JIVO_MART)).toBe('Mart');
    expect(formatCompanyChip(COMPANY_CODES.JIVO_BEVERAGES)).toBe('Bev');
  });

  it('shows an unrecognised code as it came', () => {
    // A row belonging to a company nobody named is exactly the thing worth
    // seeing — hiding it would read as "no company", which is different.
    expect(formatCompanyChip('JIVO_SOMETHING_NEW')).toBe('JIVO_SOMETHING_NEW');
  });

  it('is empty when the feed carried no company', () => {
    // A single-company read leaves `company_code` null; the chip then renders
    // nothing rather than a placeholder dash.
    expect(formatCompanyChip(null)).toBe('');
    expect(formatCompanyChip(undefined)).toBe('');
    expect(formatCompanyChip('  ')).toBe('');
  });
});
