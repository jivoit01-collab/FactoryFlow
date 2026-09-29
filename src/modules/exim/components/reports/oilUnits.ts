/**
 * Units and small shared bits for the oil read-outs: Oil Stock, a stage's
 * breakdown, and the Director Inventory.
 *
 * Lots are weighed in kilograms and tanks are dipped in litres. EXIM showed
 * either in kilograms, litres or tonnes, as the reader chose, at 1.0989 litres
 * to the kilogram. Everything here converts from what the API sent into the
 * unit on screen, so a row that mixes a tank and a lot adds like with like.
 */
import {
  Anchor,
  BadgeCheck,
  Cylinder,
  Factory,
  Forklift,
  Handshake,
  Hourglass,
  Loader,
  type LucideIcon,
  MapPin,
  PackageCheck,
  Route,
  Ship,
  Truck,
  Warehouse,
} from 'lucide-react';

import type { LotStatus } from '../../types';
import { LITRES_PER_KG } from '../../utils';

export type OilUnit = 'KG' | 'L' | 'MT';

export const OIL_UNITS: OilUnit[] = ['KG', 'L', 'MT'];

/** On the switch. */
export const UNIT_SHORT: Record<OilUnit, string> = { KG: 'KG', L: 'L', MT: 'MT' };

/** In a sentence: "figures in litres". */
export const UNIT_WORD: Record<OilUnit, string> = { KG: 'kg', L: 'litres', MT: 'MT' };

export function fromKg(kg: number, unit: OilUnit): number {
  if (unit === 'MT') return kg / 1000;
  if (unit === 'L') return kg * LITRES_PER_KG;
  return kg;
}

export function fromLitres(litres: number, unit: OilUnit): number {
  if (unit === 'L') return litres;
  const kg = litres / LITRES_PER_KG;
  return unit === 'MT' ? kg / 1000 : kg;
}

/** EXIM's rounding: whole numbers when it is on, up to three places when it is off. */
export function roundTo(value: number, rounded: boolean): number {
  return rounded ? Math.round(value) : Math.round(value * 1000) / 1000;
}

export function fmtAmount(value: number, rounded: boolean): string {
  return roundTo(value, rounded).toLocaleString('en-IN', {
    maximumFractionDigits: rounded ? 0 : 3,
  });
}

/** Where the Oil Stock pages live. One place, so a moved route moves every link. */
export const OIL_STOCK_PATH = '/exim/oil-stock';

export function stagePath(status: LotStatus): string {
  return `${OIL_STOCK_PATH}/${status}`;
}

/** The stages a lot moves through, as the breakdown page offers them. */
export const STAGE_SEQUENCE: LotStatus[] = [
  'IN_CONTRACT',
  'UNDER_LOADING',
  'ON_THE_SEA',
  'MUNDRA_PORT',
  'KANDLA_STORAGE',
  'OTW_TO_REFINERY',
  'AT_REFINERY',
  'ON_THE_WAY',
  'OUT_SIDE_FACTORY',
  'IN_TANK',
];

/** A quiet picture of each stage, in place of EXIM's animated scenes. */
export const STAGE_ICON: Record<LotStatus, LucideIcon> = {
  IN_CONTRACT: Handshake,
  UNDER_LOADING: Forklift,
  ON_THE_SEA: Ship,
  MUNDRA_PORT: Anchor,
  KANDLA_STORAGE: Warehouse,
  OTW_TO_REFINERY: Route,
  AT_REFINERY: Factory,
  ON_THE_WAY: Truck,
  OUT_SIDE_FACTORY: MapPin,
  IN_TANK: Cylinder,
  IN_WAREHOUSE: Warehouse,
  COMPLETED: BadgeCheck,
  DELIVERED: PackageCheck,
  IN_TRANSIT: Truck,
  PENDING: Hourglass,
  PROCESSING: Loader,
};

export const STAGE_BLURB: Record<LotStatus, string> = {
  IN_CONTRACT: 'Oil bought on contract and not loaded yet.',
  UNDER_LOADING: 'Oil being loaded at the seller, before it leaves.',
  ON_THE_SEA: 'Oil at sea, on its way to port.',
  MUNDRA_PORT: 'Oil landed at Mundra port.',
  KANDLA_STORAGE: 'Oil held in storage at Kandla.',
  OTW_TO_REFINERY: 'Oil on its way from the port to a refinery.',
  AT_REFINERY: 'Oil at a refinery, before it leaves for the factory.',
  ON_THE_WAY: 'Oil on the road to the factory.',
  OUT_SIDE_FACTORY: 'Tankers at the factory, not emptied into the tanks yet.',
  IN_TANK: "Oil in the factory's tanks: by oil, and by the lots that filled them.",
  IN_WAREHOUSE: 'Oil taken into a warehouse instead of the tanks.',
  COMPLETED: 'Lots used up and closed.',
  DELIVERED: 'Lots still carrying an old EXIM status.',
  IN_TRANSIT: 'Lots still carrying an old EXIM status.',
  PENDING: 'Lots still carrying an old EXIM status.',
  PROCESSING: 'Lots still carrying an old EXIM status.',
};

/** EXIM's printed code: RM0CDRO is CDRO, RM00C01 is C01. */
export function shortCode(code: string): string {
  return code.replace(/^RM0{0,3}/, '');
}

/**
 * A figure from the API as a number. A lot's own fields arrive as decimal
 * strings; a missing field reads as 0 rather than NaN, so one gap cannot turn
 * a whole column of totals into "NaN".
 */
export function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
