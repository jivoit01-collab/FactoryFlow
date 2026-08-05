import { describe, expect, it } from 'vitest';

import { formatLitres, litresPerCase } from '@/modules/dashboards/production/utils/litres';

describe('litresPerCase', () => {
  it('multiplies unit volume by pack size', () => {
    expect(litresPerCase('MUSTARD KACHI GHANI 1 LTR 20 PCS ROUND BOTTLE')).toBe(20);
    expect(litresPerCase('COLD PRESS 5 LTR + EXTRA LIGHT OLIVE 1 LTR 4 PCS')).toBe(20);
    expect(litresPerCase('COLD PRESS 5 LTR 4 PCS')).toBe(20);
  });

  it('treats a missing pack size as a single piece', () => {
    expect(litresPerCase('COLD PRESS SUNFLOWER 5 LTR')).toBe(5);
    expect(litresPerCase('FG0000053 - COLD PRESS SUNFLOWER 5 LTR')).toBe(5);
    expect(litresPerCase('TIN 5 LTR')).toBe(5);
  });

  it('converts ML to litres', () => {
    expect(litresPerCase('PET BOTTLE 1000 ML')).toBe(1);
    expect(litresPerCase('COLA 250 ML 24 PCS')).toBe(6);
  });

  it('returns null when the name carries no volume', () => {
    expect(litresPerCase('SOYABEAN OIL 12 KGS (B)')).toBeNull();
    expect(litresPerCase('750 GMS 12 PCS POUCH')).toBeNull();
    expect(litresPerCase('')).toBeNull();
    expect(litresPerCase(undefined, null)).toBeNull();
  });

  it('does not read a bare L out of an unrelated word', () => {
    expect(litresPerCase('2 LAYER CARTON')).toBeNull();
    expect(litresPerCase('SOYABEAN OIL 13 KGS (B)')).toBeNull();
  });

  it('falls through to the next name when the first has no volume', () => {
    expect(litresPerCase('FG0000379', 'MUSTARD KACHI GHANI 1 LTR 20 PCS')).toBe(20);
  });

  it('accepts litre spellings and a joined unit', () => {
    expect(litresPerCase('OIL 1L 12 PC')).toBe(12);
    expect(litresPerCase('OIL 2 LITRES 6 PCS')).toBe(12);
    expect(litresPerCase('OIL 2 LITERS')).toBe(2);
    expect(litresPerCase('OIL 0.5 LTR 24 PCS')).toBe(12);
  });
});

describe('formatLitres', () => {
  it('renders an em dash for unknown, never zero', () => {
    expect(formatLitres(null)).toBe('—');
    expect(formatLitres(0)).toBe('0 L');
  });

  it('groups Indian-style and keeps one decimal only when small and fractional', () => {
    expect(formatLitres(2400)).toBe('2,400 L');
    expect(formatLitres(12.5)).toBe('12.5 L');
    expect(formatLitres(1234567)).toBe('12,34,567 L');
  });
});
