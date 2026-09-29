/**
 * The small rules every tank farm screen shares: how full a tank is, how a
 * volume is shown in litres or tonnes, the colour an oil is painted, and the
 * palette an oil's colour is picked from.
 *
 * Kept out of the component files so each of those exports components only.
 */
import type { OilCategory, Tank } from '../../types';
import { fmtLitres, fmtQty, LITRES_PER_KG } from '../../utils';

// --- volumes ------------------------------------------------------------------

/** The two ways the farm is read: litres as dipped, or metric tonnes. */
export type VolumeUnit = 'L' | 'MT';

/**
 * Litres as metric tonnes: a kilogram is 1.0989 litres, so litres are DIVIDED.
 * EXIM multiplied here and overstated the farm's tonnes by about a fifth.
 */
export function litresToMt(litres: number): number {
  return litres / LITRES_PER_KG / 1000;
}

/** A volume held in litres, shown in the unit chosen: `10,989` or `10.000`. */
export function fmtVolume(litres: string | number | null | undefined, unit: VolumeUnit): string {
  if (litres === null || litres === undefined || litres === '') return '—';
  const value = Number(litres);
  return unit === 'MT' ? fmtQty(litresToMt(value)) : fmtLitres(value);
}

/** The same, with its unit after it: `10,989 L` or `10.000 MT`. */
export function volumeText(litres: string | number | null | undefined, unit: VolumeUnit): string {
  const figure = fmtVolume(litres, unit);
  return figure === '—' ? figure : `${figure} ${unit}`;
}

/** What `unit` is called in a column heading: "L" or "MT". */
export const UNIT_NAME: Record<VolumeUnit, string> = { L: 'Litres', MT: 'Tonnes' };

const UNIT_KEY = 'exim.tank-farm.unit';

/** The unit last chosen on this device; litres if none, or if storage is shut. */
export function readSavedUnit(): VolumeUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === 'MT' ? 'MT' : 'L';
  } catch {
    return 'L';
  }
}

export function saveUnit(unit: VolumeUnit): void {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {
    // A private window: the choice lasts as long as the page.
  }
}

// --- tanks ----------------------------------------------------------------------

/** At or above this share of its capacity a tank is called out as near full. */
export const NEAR_FULL_PCT = 90;
/** Under this share, and not empty, a tank is called out as low. */
export const LOW_PCT = 10;

/** How full a tank is, 0-100, against its OWN capacity. */
export function fillPct(tank: Pick<Tank, 'capacity_l' | 'level_l' | 'used_pct'>): number {
  const pct =
    tank.used_pct ??
    (Number(tank.capacity_l) > 0 ? (Number(tank.level_l) / Number(tank.capacity_l)) * 100 : 0);
  return Math.min(Math.max(pct, 0), 100);
}

/** Tanks in the order the farm numbers them: TNK2 before TNK10. */
export function byCode(a: { code: string }, b: { code: string }): number {
  return a.code.localeCompare(b.code, undefined, { numeric: true });
}

export function isTote(tank: Pick<Tank, 'kind'>): boolean {
  return tank.kind === 'TOTES';
}

/** A tank that holds nothing: no oil, or no level. */
export function isEmptyTank(tank: Pick<Tank, 'item' | 'level_l'>): boolean {
  return !tank.item || !(Number(tank.level_l) > 0);
}

/**
 * The server's rules for a tank's contents, checked before sending so the
 * reason shows at the field. The server checks them again, in the same words.
 */
export function checkLevel(
  capacity: string,
  level: string,
  hasOil: boolean,
): { field: 'capacity' | 'level' | 'oil'; message: string } | null {
  const cap = Number(capacity);
  const lvl = Number(level || 0);
  if (!(cap > 0)) return { field: 'capacity', message: 'How many litres does it hold?' };
  if (Number.isNaN(lvl) || lvl < 0)
    return { field: 'level', message: 'A level cannot be below nothing.' };
  if (lvl > cap)
    return {
      field: 'level',
      message: `The level cannot be more than the tank holds (${fmtLitres(cap)} L).`,
    };
  if (hasOil && lvl === 0)
    return { field: 'level', message: 'A tank with an oil in it needs a level above nothing.' };
  if (!hasOil && lvl > 0) return { field: 'oil', message: 'Say which oil is in the tank.' };
  return null;
}

/** EXIM's bands for grouping the farm by how full it is, fullest first. */
export const LEVEL_BANDS = [
  { key: 'near-full', label: `Near full (over ${NEAR_FULL_PCT}%)` },
  { key: 'high', label: `Over half (50–${NEAR_FULL_PCT}%)` },
  { key: 'part', label: `Under half (${LOW_PCT}–50%)` },
  { key: 'low', label: `Low (under ${LOW_PCT}%)` },
  { key: 'empty', label: 'Empty' },
] as const;

export type LevelBand = (typeof LEVEL_BANDS)[number]['key'];

export function levelBand(tank: Tank): LevelBand {
  const pct = fillPct(tank);
  if (isEmptyTank(tank) || pct === 0) return 'empty';
  if (pct < LOW_PCT) return 'low';
  if (pct <= 50) return 'part';
  if (pct <= NEAR_FULL_PCT) return 'high';
  return 'near-full';
}

// --- colours --------------------------------------------------------------------

/** What a tank with no oil in it, or an oil with no colour, is drawn in. */
export const NO_OIL_COLOR = '#94a3b8';

/** EXIM's palette, by name, in the groups its picker showed them in. */
export const COLOR_PALETTE: { group: string; colors: { name: string; hex: string }[] }[] = [
  {
    group: 'Reds and pinks',
    colors: [
      { name: 'Crimson', hex: '#db3344' },
      { name: 'Dark Red', hex: '#b01d03' },
      { name: 'Salmon', hex: '#e98b8b' },
      { name: 'Maroon', hex: '#653439' },
      { name: 'Magenta', hex: '#db33ae' },
      { name: 'Peach', hex: '#e8a27d' },
    ],
  },
  {
    group: 'Oranges and yellows',
    colors: [
      { name: 'Burnt Orange', hex: '#d95c26' },
      { name: 'Tangerine', hex: '#db7633' },
      { name: 'Gold', hex: '#f8b90d' },
    ],
  },
  {
    group: 'Greens',
    colors: [
      { name: 'Mint', hex: '#59f37f' },
      { name: 'Green', hex: '#17ee30' },
      { name: 'Lime', hex: '#68f50a' },
      { name: 'Forest Green', hex: '#228b22' },
      { name: 'Yellow Green', hex: '#8e980b' },
      { name: 'Olive', hex: '#6c730d' },
    ],
  },
  {
    group: 'Blues',
    colors: [
      { name: 'Sky Blue', hex: '#56b6f5' },
      { name: 'Dodger Blue', hex: '#2198e8' },
      { name: 'Steel Blue', hex: '#3498db' },
      { name: 'Navy', hex: '#014f84' },
      { name: 'Midnight', hex: '#020969' },
      { name: 'Indigo', hex: '#3e33db' },
    ],
  },
  {
    group: 'Teals and cyans',
    colors: [
      { name: 'Turquoise', hex: '#19d7f0' },
      { name: 'Aquamarine', hex: '#10e0c8' },
      { name: 'Teal', hex: '#0a8999' },
    ],
  },
  {
    group: 'Neutrals',
    colors: [
      { name: 'Snow', hex: '#f9fafa' },
      { name: 'Grey', hex: '#9e9e9e' },
    ],
  },
];

const PALETTE = COLOR_PALETTE.flatMap((g) => g.colors);
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * An oil's colour as something paintable. EXIM stored a hex or, for older
 * oils, a palette name; anything else is drawn in the no-oil grey.
 */
export function resolveColor(color?: string | null): string {
  if (!color) return NO_OIL_COLOR;
  if (HEX.test(color)) return color.toLowerCase();
  const named = PALETTE.find((c) => c.name.toLowerCase() === color.toLowerCase());
  return named?.hex ?? NO_OIL_COLOR;
}

/** The palette name for a colour, or the hex itself for one picked by hand. */
export function colorName(color?: string | null): string {
  if (!color) return 'No colour';
  const hex = resolveColor(color);
  return PALETTE.find((c) => c.hex === hex)?.name ?? color.toLowerCase();
}

/** Whether dark or light text reads better on a fill of `hex`. */
export function inkOn(hex: string): 'dark' | 'light' {
  const value = resolveColor(hex);
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  // Perceived brightness (ITU-R BT.601), 0-255.
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? 'dark' : 'light';
}

// --- oils -------------------------------------------------------------------------

/** EXIM's categories, in its order, with how they read in a list. */
export const OIL_CATEGORIES: { value: OilCategory; label: string }[] = [
  { value: 'SOYABEAN', label: 'Soyabean' },
  { value: 'OLIVE', label: 'Olive' },
  { value: 'CANOLA', label: 'Canola' },
  { value: 'MUSTARD', label: 'Mustard' },
  { value: 'GROUNDNUT', label: 'Groundnut' },
  { value: 'GHEE', label: 'Ghee' },
  { value: 'SUNFLOWER', label: 'Sunflower' },
  { value: 'RICE BRAN', label: 'Rice bran' },
  { value: 'COCONUT', label: 'Coconut' },
  { value: 'SESAME', label: 'Sesame' },
  { value: 'EXTRA VIRGIN', label: 'Extra virgin' },
  { value: 'COTTON SEED', label: 'Cotton seed' },
  { value: 'BLENDED', label: 'Blended' },
];
