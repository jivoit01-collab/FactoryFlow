import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NAMING_SCHEME,
  addColumn,
  addLevel,
  addRow,
  buildLocationsCsv,
  buildTemplate,
  generateLayout,
  instantiateTemplate,
  makeWarehouseLocation,
  makeZone,
  parseWarehouseCsv,
  removeColumn,
  removeLevel,
  renameLocation,
} from '../services';
import type { WarehouseBundle } from '../services';
import type { Warehouse } from '../types';
import { createWmsId, nowIso } from '../utils';

function makeBundle(columns = 3, rows = 2, levels = 1): WarehouseBundle {
  const id = createWmsId();
  const timestamp = nowIso();
  const warehouse: Warehouse = {
    id,
    code: 'WH',
    name: 'WH',
    description: '',
    enabled: true,
    columns,
    rows,
    levels,
    namingScheme: DEFAULT_NAMING_SCHEME,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const locations = generateLayout({ columns, rows, levels, naming: DEFAULT_NAMING_SCHEME }).map((cell) =>
    makeWarehouseLocation(id, cell),
  );
  return { warehouse, zones: [], purposes: [], locations };
}

describe('structural layout ops', () => {
  it('adds a column and grows the location set', () => {
    const next = addColumn(makeBundle(3, 2, 1));
    expect(next.warehouse.columns).toBe(4);
    expect(next.locations).toHaveLength(8);
    expect(new Set(next.locations.map((l) => l.code)).size).toBe(8);
  });

  it('adds a row', () => {
    const next = addRow(makeBundle(3, 2, 1));
    expect(next.warehouse.rows).toBe(3);
    expect(next.locations).toHaveLength(9);
  });

  it('adds a level and recodes existing cells to include the level segment', () => {
    const next = addLevel(makeBundle(2, 2, 1));
    expect(next.warehouse.levels).toBe(2);
    expect(next.locations).toHaveLength(8);
    // Every code now carries a level segment (two separators).
    expect(next.locations.every((l) => l.code.split('-').length === 3)).toBe(true);
  });

  it('removes a column and compacts the grid', () => {
    const next = removeColumn(makeBundle(3, 2, 1), 1);
    expect(next.warehouse.columns).toBe(2);
    expect(next.locations).toHaveLength(4);
    expect(next.locations.every((l) => l.column < 2)).toBe(true);
  });

  it('never removes the final level', () => {
    const bundle = makeBundle(2, 2, 1);
    expect(removeLevel(bundle, 0)).toBe(bundle);
  });

  it('renames a single location with a custom code', () => {
    const bundle = makeBundle(2, 1, 1);
    const target = bundle.locations[0]!;
    const next = renameLocation(bundle, target.id, 'CUSTOM-1');
    expect(next.locations.find((l) => l.id === target.id)?.code).toBe('CUSTOM-1');
  });
});

describe('CSV round-trip', () => {
  it('exports then re-imports the same grid shape', () => {
    const bundle = makeBundle(3, 2, 1);
    const zone = makeZone(bundle.warehouse.id, { name: 'Cold', type: 'BULK', temperatureClass: 'FROZEN', color: '#000' });
    bundle.zones.push(zone);
    bundle.locations[0]!.zoneId = zone.id;

    const csv = buildLocationsCsv(bundle);
    const reimported = parseWarehouseCsv(csv, { name: 'Imported' });

    expect(reimported.locations).toHaveLength(6);
    expect(reimported.warehouse.columns).toBe(3);
    expect(reimported.warehouse.rows).toBe(2);
    // The zone name survived and is linked to one location.
    expect(reimported.zones.map((z) => z.name)).toContain('Cold');
    const cold = reimported.zones.find((z) => z.name === 'Cold');
    expect(reimported.locations.filter((l) => l.zoneId === cold?.id)).toHaveLength(1);
  });

  it('rejects a CSV without column/row headers', () => {
    expect(() => parseWarehouseCsv('code,foo\nA-01,1', { name: 'x' })).toThrow(/column.*row/i);
  });
});

describe('templates', () => {
  it('snapshots a warehouse and re-instantiates it with zones', () => {
    const bundle = makeBundle(2, 2, 1);
    const zone = makeZone(bundle.warehouse.id, { name: 'Pick', type: 'PICK', temperatureClass: null, color: '#f00' });
    bundle.zones.push(zone);
    bundle.locations[0]!.zoneId = zone.id;
    bundle.locations[1]!.zoneId = zone.id;

    const template = buildTemplate('My template', bundle);
    expect(template.zones[0]?.cells).toHaveLength(2);

    const spawned = instantiateTemplate(template, { name: 'From template' });
    expect(spawned.warehouse.id).not.toBe(bundle.warehouse.id);
    expect(spawned.locations).toHaveLength(4);
    expect(spawned.zones).toHaveLength(1);
    const pickZone = spawned.zones[0]!;
    expect(spawned.locations.filter((l) => l.zoneId === pickZone.id)).toHaveLength(2);
  });
});
