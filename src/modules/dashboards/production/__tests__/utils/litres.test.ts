import { describe, expect, it } from 'vitest';

import {
  formatLitres,
  formatLitresSigned,
  litresNote,
  litresOf,
} from '@/modules/dashboards/production/utils/litres';

describe('litresOf', () => {
  it('multiplies cases by the litres per case the API sent', () => {
    expect(litresOf(120, 20)).toBe(2400);
    expect(litresOf(0, 20)).toBe(0);
  });

  it('returns null — never 0 — when SAP states no volume for the SKU', () => {
    expect(litresOf(120, null)).toBeNull();
    expect(litresOf(120, undefined)).toBeNull();
  });

  it('treats a missing case count as none produced', () => {
    expect(litresOf(null, 20)).toBe(0);
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

  it('signs a surplus so it cannot be read as a shortfall', () => {
    expect(formatLitresSigned(120)).toBe('+120 L');
    expect(formatLitresSigned(-120)).toBe('-120 L');
    expect(formatLitresSigned(null)).toBe('—');
  });
});

describe('litresNote', () => {
  it('names the SAP fields, not the SKU name', () => {
    expect(litresNote(0)).toContain('SalPackUn');
    expect(litresNote(0)).toContain('SalFactor2');
    expect(litresNote(0)).not.toContain('excluded');
  });

  it('counts the SKUs left out when SAP holds no volume for them', () => {
    expect(litresNote(1)).toContain('1 SKU has no volume');
    expect(litresNote(3)).toContain('3 SKUs have no volume');
  });
});
