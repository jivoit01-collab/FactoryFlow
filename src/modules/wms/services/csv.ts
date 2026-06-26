/**
 * Spreadsheet (CSV) import / export for warehouse layouts (Step 3).
 *
 * Export writes one row per location. Import reads a sheet of locations and
 * reconstructs a warehouse bundle: grid dimensions are inferred from the
 * column/row/level values, and distinct zone names become zones. A minimal
 * RFC-4180-ish parser handles quoted fields and embedded commas/newlines.
 */
import type { LocationStatus, Warehouse, WarehouseLocation, Zone } from '../types';
import { DEFAULT_NAMING_SCHEME } from './layout';
import { ZONE_COLOR_PRESETS, makeWarehouseLocation, makeZone } from './factories';
import type { WarehouseBundle } from './warehouseIO';
import { createWmsId, nowIso } from '../utils';

const HEADERS = ['code', 'column', 'row', 'level', 'zone', 'type', 'enabled', 'status', 'notes'] as const;

function escapeCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialise a warehouse's locations to a CSV string (zones resolved to names). */
export function buildLocationsCsv(bundle: WarehouseBundle): string {
  const zoneName = new Map(bundle.zones.map((zone) => [zone.id, zone.name]));
  const lines = [HEADERS.join(',')];
  for (const location of bundle.locations) {
    const cells = [
      location.code,
      String(location.column + 1),
      String(location.row + 1),
      String(location.level + 1),
      location.zoneId ? zoneName.get(location.zoneId) ?? '' : '',
      location.type,
      location.enabled ? 'yes' : 'no',
      location.status,
      location.notes,
    ];
    lines.push(cells.map((cell) => escapeCsv(cell)).join(','));
  }
  return lines.join('\n');
}

/** Parse CSV text into a matrix of string cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

const STATUSES: LocationStatus[] = ['ACTIVE', 'BLOCKED', 'DAMAGED', 'MAINTENANCE', 'RESERVED'];

/**
 * Build a warehouse bundle from CSV text. Requires `column` and `row` columns;
 * `level` defaults to 1. Values are normalised to a 0-based contiguous grid.
 */
export function parseWarehouseCsv(text: string, opts: { name: string; code?: string }): WarehouseBundle {
  const matrix = parseCsv(text);
  if (matrix.length < 2) throw new Error('The CSV has no data rows.');

  const header = matrix[0]!.map((cell) => cell.trim().toLowerCase());
  const indexOf = (name: string) => header.indexOf(name);
  const colIdx = indexOf('column');
  const rowIdx = indexOf('row');
  if (colIdx === -1 || rowIdx === -1) {
    throw new Error('The CSV needs at least "column" and "row" headers.');
  }
  const levelIdx = indexOf('level');
  const codeIdx = indexOf('code');
  const zoneIdx = indexOf('zone');
  const typeIdx = indexOf('type');
  const enabledIdx = indexOf('enabled');
  const statusIdx = indexOf('status');
  const notesIdx = indexOf('notes');

  interface RawRow {
    code: string;
    column: number;
    row: number;
    level: number;
    zone: string;
    type: string;
    enabled: boolean;
    status: LocationStatus;
    notes: string;
  }

  const num = (cells: string[], index: number, fallback: number) => {
    if (index === -1) return fallback;
    const parsed = Number(cells[index]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const raw: RawRow[] = matrix.slice(1).map((cells) => {
    const statusValue = (statusIdx === -1 ? '' : cells[statusIdx]?.trim().toUpperCase()) as LocationStatus;
    const enabledRaw = enabledIdx === -1 ? 'yes' : (cells[enabledIdx]?.trim().toLowerCase() ?? 'yes');
    return {
      code: codeIdx === -1 ? '' : cells[codeIdx]?.trim() ?? '',
      column: num(cells, colIdx, 1),
      row: num(cells, rowIdx, 1),
      level: num(cells, levelIdx, 1),
      zone: zoneIdx === -1 ? '' : cells[zoneIdx]?.trim() ?? '',
      type: typeIdx === -1 ? 'RACK' : cells[typeIdx]?.trim() || 'RACK',
      enabled: !['no', 'false', '0', 'n'].includes(enabledRaw),
      status: STATUSES.includes(statusValue) ? statusValue : 'ACTIVE',
      notes: notesIdx === -1 ? '' : cells[notesIdx]?.trim() ?? '',
    };
  });

  // Normalise each axis to a 0-based contiguous index.
  const minColumn = Math.min(...raw.map((r) => r.column));
  const minRow = Math.min(...raw.map((r) => r.row));
  const minLevel = Math.min(...raw.map((r) => r.level));
  for (const r of raw) {
    r.column -= minColumn;
    r.row -= minRow;
    r.level -= minLevel;
  }

  const warehouseId = createWmsId();
  const timestamp = nowIso();

  // Distinct zone names → zone records (colours cycle through the presets).
  const zoneByName = new Map<string, Zone>();
  for (const r of raw) {
    if (!r.zone || zoneByName.has(r.zone)) continue;
    const color = ZONE_COLOR_PRESETS[zoneByName.size % ZONE_COLOR_PRESETS.length]!;
    zoneByName.set(r.zone, makeZone(warehouseId, { name: r.zone, type: 'STORAGE', temperatureClass: null, color }));
  }

  const locations: WarehouseLocation[] = raw.map((r) => {
    const base = makeWarehouseLocation(
      warehouseId,
      { code: r.code, barcode: r.code, column: r.column, row: r.row, level: r.level },
      r.zone ? zoneByName.get(r.zone)!.id : null,
    );
    return { ...base, type: r.type, enabled: r.enabled, status: r.status, notes: r.notes };
  });

  const warehouse: Warehouse = {
    id: warehouseId,
    code: opts.code?.trim() || opts.name.trim().toUpperCase().replace(/\s+/g, '-'),
    name: opts.name.trim(),
    description: '',
    enabled: true,
    columns: Math.max(...raw.map((r) => r.column)) + 1,
    rows: Math.max(...raw.map((r) => r.row)) + 1,
    levels: Math.max(...raw.map((r) => r.level)) + 1,
    namingScheme: DEFAULT_NAMING_SCHEME,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return { warehouse, zones: [...zoneByName.values()], locations };
}
