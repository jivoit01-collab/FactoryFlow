import { describe, expect, it } from 'vitest';

import { findDefaultMaterialGroup, isRmOrPmGroup } from './itemGroupDefaults';

/** Every item group SAP carries, as read live from the three company schemas. */
const SAP_GROUPS = [
  'CONSUMABLES',
  'CONSUMABLES WITH INVENTORY',
  'FA CONSUMABLES',
  'FINISHED',
  'FIXED ASSETS',
  'FLAV/PRESTV/INGRDNT',
  'LAB INVENTORY',
  'LABORATORY APPARATUS',
  'PACKAGING MATERIAL',
  'RAW MATERIAL',
  'SALES BOM',
  'SEMI FINISHED GOODS',
  'TRADING ITEMS',
];

describe('isRmOrPmGroup', () => {
  it('keeps raw and packing material, and drops every other SAP group', () => {
    expect(SAP_GROUPS.filter(isRmOrPmGroup)).toEqual(['PACKAGING MATERIAL', 'RAW MATERIAL']);
  });

  it('is not fooled by case or padding', () => {
    expect(isRmOrPmGroup('  Raw Material ')).toBe(true);
    expect(isRmOrPmGroup('packing materials')).toBe(true);
  });

  it('does not mistake semi-finished goods for a material group', () => {
    expect(isRmOrPmGroup('SEMI FINISHED GOODS')).toBe(false);
  });
});

describe('findDefaultMaterialGroup', () => {
  it('opens on packing material when the list holds both', () => {
    const groups = ['RAW MATERIAL', 'PACKAGING MATERIAL'];

    expect(findDefaultMaterialGroup(groups, (g) => g)).toBe('PACKAGING MATERIAL');
  });

  it('falls back to the first group when there is no packing material', () => {
    expect(findDefaultMaterialGroup(['RAW MATERIAL'], (g) => g)).toBe('RAW MATERIAL');
  });
});
