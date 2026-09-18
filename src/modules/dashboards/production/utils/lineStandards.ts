/**
 * What each line is set up to do, from the line/SKU configuration master.
 *
 * Every line on this plant has its presets filled in — rated speed, bottles per
 * case, the crew it takes — and that master is the only place those figures
 * exist for a line that is not running. It is also the fallback for a run that
 * was opened without a preset: a run entered by hand on the floor carries no
 * rated speed, and a board that read only the run would show the plant's
 * best-configured line as unrated.
 *
 * The run's own snapshot still wins wherever it has one. It is what that run
 * was actually set up against, and a configuration edited since would rewrite
 * yesterday's efficiency if it were allowed to take over.
 */

import type { LineSkuConfig } from '@/modules/production/execution/types';
import type { LineStandard } from '@/modules/production/execution/utils';

const num = (value: string | number | null | undefined): number | null => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/** The configurations of one line, in the order they were returned. */
export type LineConfigIndex = Map<number, LineSkuConfig[]>;

/** Active configurations, grouped by line. Inactive presets are left out — a
 *  line is not still rated at a speed somebody switched off. */
export function indexLineConfigs(configs: readonly LineSkuConfig[]): LineConfigIndex {
  const byLine: LineConfigIndex = new Map();
  for (const config of configs) {
    if (!config.is_active) continue;
    const existing = byLine.get(config.line);
    if (existing) existing.push(config);
    else byLine.set(config.line, [config]);
  }
  return byLine;
}

/**
 * The preset a run should be judged against.
 *
 * Matched on the SKU first, because a line's presets differ per SKU and the
 * 1 L preset says nothing about a 5 L run. Where the line holds exactly one
 * preset it is used whatever the SKU — a single-product line's one preset IS
 * the line's rating, and refusing to use it would leave the common case blank.
 * Where several presets exist and none matches the SKU, nothing is returned:
 * picking one of them would be inventing a rating.
 */
export function configForRun(
  configs: LineConfigIndex,
  lineId: number,
  itemCode: string | null | undefined,
): LineSkuConfig | null {
  const lineConfigs = configs.get(lineId);
  if (!lineConfigs || lineConfigs.length === 0) return null;

  const code = (itemCode ?? '').trim().toUpperCase();
  const exact = code ? lineConfigs.find((c) => (c.sku_code ?? '').trim().toUpperCase() === code) : undefined;
  if (exact) return exact;

  return lineConfigs.length === 1 ? lineConfigs[0] : null;
}

/** A preset as the metrics helper reads it. */
export function standardOf(config: LineSkuConfig | null): LineStandard | undefined {
  if (!config) return undefined;
  return {
    ratedSpeed: num(config.rated_speed),
    piecesPerCase: num(config.pieces_per_case),
  };
}

/**
 * What to say a line is rated at when nothing is running on it.
 *
 * One preset, or several that agree, give a figure. Several that disagree give
 * null and the tile says "varies by SKU" — an idle line whose 1 L preset runs
 * at 4,000 and 5 L preset at 900 has no single speed, and showing either one
 * would be the board picking a favourite.
 */
export function standingSpeed(configs: LineConfigIndex, lineId: number): number | null {
  const lineConfigs = configs.get(lineId) ?? [];
  const speeds = new Set<number>();
  for (const config of lineConfigs) {
    const speed = num(config.rated_speed);
    if (speed != null) speeds.add(speed);
  }
  return speeds.size === 1 ? [...speeds][0] : null;
}
