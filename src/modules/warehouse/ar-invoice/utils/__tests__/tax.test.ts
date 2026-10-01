import { describe, expect, it } from 'vitest';

import { billTotals, lineInclTax, taxRate } from '../tax';

describe('taxRate', () => {
  it('reads the rate the tax code carries', () => {
    expect(taxRate('CG+SG@5')).toBe(5);
    expect(taxRate('IGST@12')).toBe(12);
    expect(taxRate('EXEMPT')).toBeNull();
    expect(taxRate('')).toBeNull();
    expect(taxRate(null)).toBeNull();
  });
});

describe('lineInclTax', () => {
  it('adds the tax, or says it cannot', () => {
    expect(lineInclTax(100, 'IGST@12')).toBeCloseTo(112);
    expect(lineInclTax(100, 'EXEMPT')).toBeNull();
  });
});

describe('billTotals', () => {
  it('gives the counter figure for two ₹160 pouches', () => {
    const totals = billTotals([{ line_total: '304.76', tax_code: 'CG+SG@5' }]);
    expect(totals.beforeTax).toBeCloseTo(304.76);
    expect(totals.tax).toBeCloseTo(15.24, 2);
    expect(totals.inclTax).toBeCloseTo(320, 2);
  });

  it('adds lines at different rates', () => {
    const totals = billTotals([
      { line_total: '100', tax_code: 'IGST@5' },
      { line_total: '200', tax_code: 'IGST@12' },
    ]);
    expect(totals.beforeTax).toBe(300);
    expect(totals.inclTax).toBeCloseTo(329);
  });

  it('keeps the pre-tax total but no estimate when a line has no rate', () => {
    const totals = billTotals([
      { line_total: '100', tax_code: 'IGST@5' },
      { line_total: '50', tax_code: '' },
    ]);
    expect(totals.beforeTax).toBe(150);
    expect(totals.tax).toBeNull();
    expect(totals.inclTax).toBeNull();
  });
});
