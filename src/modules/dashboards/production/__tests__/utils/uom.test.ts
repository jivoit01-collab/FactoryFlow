import { describe, expect, it } from 'vitest';

import { sharedUnit, unitLabel } from '@/modules/dashboards/production/utils/uom';

describe('unitLabel', () => {
  it("lower-cases SAP's own word", () => {
    expect(unitLabel('PCS')).toBe('pcs');
    expect(unitLabel('LTR')).toBe('ltr');
    expect(unitLabel('MTR')).toBe('mtr');
    expect(unitLabel('KGS')).toBe('kgs');
  });

  it('never guesses pieces for an item SAP states no UOM for', () => {
    expect(unitLabel('')).toBe('unit');
    expect(unitLabel('   ')).toBe('unit');
    expect(unitLabel(undefined)).toBe('unit');
    expect(unitLabel(null)).toBe('unit');
  });

  it('takes the caller\'s noun where the row has nothing to say', () => {
    expect(unitLabel(undefined, 'case')).toBe('case');
    // A stated UOM still wins over the fallback.
    expect(unitLabel('PCS', 'case')).toBe('pcs');
  });
});

describe('sharedUnit', () => {
  it('names the unit when the whole list is counted that way', () => {
    expect(sharedUnit([{ uom: 'PCS' }, { uom: 'PCS' }])).toBe('pcs');
  });

  it('refuses to name one when the list mixes them', () => {
    // The BOM does this every day: labels in pieces, the oil in litres.
    expect(sharedUnit([{ uom: 'PCS' }, { uom: 'LTR' }])).toBe('unit');
    expect(sharedUnit([{ uom: 'PCS' }, { uom: 'MTR' }, { uom: 'KGS' }])).toBe('unit');
  });

  it('will not vouch for a list containing a row SAP states no UOM for', () => {
    expect(sharedUnit([{ uom: 'PCS' }, { uom: '' }])).toBe('unit');
    expect(sharedUnit([{ uom: 'PCS' }, {}])).toBe('unit');
  });

  it('falls back to the caller for an empty list — FG keeps its cases', () => {
    expect(sharedUnit([], 'case')).toBe('case');
    expect(sharedUnit([{ uom: '' }], 'case')).toBe('case');
  });
});
