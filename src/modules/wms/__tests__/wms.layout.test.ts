import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NAMING_SCHEME,
  axisLabel,
  buildLocationCode,
  countLocations,
  generateLayout,
  validateLayoutParams,
} from '../services/layout';
import { rekeyWarehouseBundle } from '../services/warehouseIO';
import { makeCellPurpose, makeWarehouseLocation, makeZone } from '../services/factories';
import type { WarehouseNamingScheme } from '../types';

describe('axisLabel', () => {
  it('produces bijective base-26 letters', () => {
    expect(axisLabel('LETTERS', 0, 30)).toBe('A');
    expect(axisLabel('LETTERS', 25, 30)).toBe('Z');
    expect(axisLabel('LETTERS', 26, 30)).toBe('AA');
    expect(axisLabel('LETTERS', 27, 30)).toBe('AB');
  });

  it('zero-pads numbers to the axis width', () => {
    expect(axisLabel('NUMBERS', 0, 9)).toBe('01');
    expect(axisLabel('NUMBERS', 9, 150)).toBe('010');
  });
});

describe('generateLayout', () => {
  it('creates columns × rows × levels locations', () => {
    const params = { columns: 4, rows: 3, levels: 2, naming: DEFAULT_NAMING_SCHEME };
    const layout = generateLayout(params);
    expect(layout).toHaveLength(countLocations(params));
    expect(layout).toHaveLength(24);
  });

  it('omits the level segment for single-level warehouses', () => {
    const single = generateLayout({ columns: 2, rows: 2, levels: 1, naming: DEFAULT_NAMING_SCHEME });
    expect(single[0]?.code).toBe('A-01');

    const multi = generateLayout({ columns: 2, rows: 2, levels: 2, naming: DEFAULT_NAMING_SCHEME });
    // First cell of level 2 (index 4) carries a zero-padded level segment.
    expect(multi[4]?.code).toBe('A-01-02');
  });

  it('honours prefix and separator', () => {
    const naming: WarehouseNamingScheme = { ...DEFAULT_NAMING_SCHEME, prefix: 'WH', separator: '.' };
    const layout = generateLayout({ columns: 1, rows: 1, levels: 1, naming });
    expect(layout[0]?.code).toBe('WH.A.01');
    expect(buildLocationCode({ columns: 1, rows: 1, levels: 1, naming }, 0, 0, 0)).toBe('WH.A.01');
  });

  it('produces unique codes', () => {
    const layout = generateLayout({ columns: 10, rows: 10, levels: 3, naming: DEFAULT_NAMING_SCHEME });
    expect(new Set(layout.map((cell) => cell.code)).size).toBe(layout.length);
  });
});

describe('validateLayoutParams', () => {
  it('rejects empty and oversized grids', () => {
    expect(validateLayoutParams({ columns: 0, rows: 5, levels: 1 })).toMatch(/Columns/);
    expect(validateLayoutParams({ columns: 100, rows: 100, levels: 2 })).toMatch(/over 5000/);
    expect(validateLayoutParams({ columns: 5, rows: 5, levels: 1 })).toBeNull();
  });
});

describe('rekeyWarehouseBundle', () => {
  it('re-ids the warehouse and re-links zone + purpose references', () => {
    const zone = makeZone('wh-1', { name: 'Cold', type: 'BULK', temperatureClass: 'FROZEN', color: '#000' });
    const purpose = makeCellPurpose('wh-1', { name: 'Walkway', color: '#64748b', holdsStock: false });
    const location = makeWarehouseLocation('wh-1', { code: 'A-01', barcode: 'A-01', column: 0, row: 0, level: 0 }, zone.id);
    location.purposeId = purpose.id;
    const warehouse = {
      id: 'wh-1',
      code: 'WH1',
      name: 'Main',
      description: '',
      enabled: true,
      columns: 1,
      rows: 1,
      levels: 1,
      namingScheme: DEFAULT_NAMING_SCHEME,
      createdAt: 'x',
      updatedAt: 'x',
    };

    const rekeyed = rekeyWarehouseBundle(
      { warehouse, zones: [zone], purposes: [purpose], locations: [location] },
      { name: 'Copy', code: 'COPY' },
    );

    expect(rekeyed.warehouse.id).not.toBe('wh-1');
    expect(rekeyed.warehouse.name).toBe('Copy');
    expect(rekeyed.zones[0]?.id).not.toBe(zone.id);
    expect(rekeyed.purposes[0]?.id).not.toBe(purpose.id);
    // The location's zoneId/purposeId now point at the NEW ids, not the old ones.
    expect(rekeyed.locations[0]?.zoneId).toBe(rekeyed.zones[0]?.id);
    expect(rekeyed.locations[0]?.purposeId).toBe(rekeyed.purposes[0]?.id);
    expect(rekeyed.locations[0]?.warehouseId).toBe(rekeyed.warehouse.id);
  });
});
