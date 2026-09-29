/**
 * How a person likes the oil read-outs: the unit, rounding, whether the matrix
 * splits each stage by vendor, and where they break the oils into groups.
 *
 * EXIM kept these in the browser; so does this, but under the person's own key,
 * so two people sharing a desk each get their own. Storage can be missing or
 * refuse a write (a private window, blocked site data): every read and write is
 * guarded, and the page falls back to EXIM's defaults for the visit.
 *
 * Group breaks are per company as well: they name oils by code, and each
 * company has its own oils.
 */
import { useState } from 'react';

import { useAppSelector } from '@/core/store';

import { OIL_UNITS, type OilUnit } from './oilUnits';

/** EXIM's own two breaks: under the seed oils, and under the olive oils. */
export const DEFAULT_BREAKS = ['RMSESMT', 'RMSOLIVE'];

interface StoredPrefs {
  unit: OilUnit;
  rounded: boolean;
  byVendor: boolean;
  /** Company id → the oil codes a break sits under. */
  breaks: Record<string, string[]>;
}

/** EXIM opened in tonnes, rounded, split by vendor. */
const DEFAULTS: StoredPrefs = { unit: 'MT', rounded: true, byVendor: true, breaks: {} };

function read(key: string): StoredPrefs {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULTS;
    const stored = parsed as Partial<StoredPrefs>;
    const breaks: Record<string, string[]> = {};
    if (stored.breaks && typeof stored.breaks === 'object') {
      for (const [company, codes] of Object.entries(stored.breaks)) {
        if (Array.isArray(codes)) {
          breaks[company] = codes.filter((code): code is string => typeof code === 'string');
        }
      }
    }
    return {
      unit: OIL_UNITS.includes(stored.unit as OilUnit) ? (stored.unit as OilUnit) : DEFAULTS.unit,
      rounded: typeof stored.rounded === 'boolean' ? stored.rounded : DEFAULTS.rounded,
      byVendor: typeof stored.byVendor === 'boolean' ? stored.byVendor : DEFAULTS.byVendor,
      breaks,
    };
  } catch {
    return DEFAULTS;
  }
}

function write(key: string, prefs: StoredPrefs) {
  try {
    window.localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // Storage refused: the choice holds for this visit only.
  }
}

export function useOilStockPrefs() {
  const userId = useAppSelector((state) => state.auth.user?.id ?? 'anonymous');
  const companyId = useAppSelector((state) => state.auth.currentCompany?.company_id ?? 0);
  const key = `exim.oil-stock.${userId}`;
  const [prefs, setPrefs] = useState<StoredPrefs>(() => read(key));

  // From the latest value, not this render's: a save that lands after an
  // await must not put back a unit changed while it was in flight.
  function update(patch: (current: StoredPrefs) => Partial<StoredPrefs>) {
    setPrefs((current) => {
      const next = { ...current, ...patch(current) };
      write(key, next);
      return next;
    });
  }

  return {
    unit: prefs.unit,
    rounded: prefs.rounded,
    byVendor: prefs.byVendor,
    breaks: prefs.breaks[String(companyId)] ?? DEFAULT_BREAKS,
    setUnit: (unit: OilUnit) => update(() => ({ unit })),
    setRounded: (rounded: boolean) => update(() => ({ rounded })),
    setByVendor: (byVendor: boolean) => update(() => ({ byVendor })),
    setBreaks: (codes: string[]) =>
      update((current) => ({ breaks: { ...current.breaks, [String(companyId)]: codes } })),
  };
}
