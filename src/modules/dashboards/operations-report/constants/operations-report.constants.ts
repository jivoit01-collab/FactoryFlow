/**
 * The Operations Report's rights, palette and tunables.
 */

import {
  BOARD_FEED_PERMISSIONS,
  DASHBOARDS_PERMISSIONS,
  EXECUTION_PERMISSIONS,
} from '@/config/permissions';

/**
 * Rights that open the report.
 *
 * It mints none of its own, like every board here: a new right would have to
 * be created on the live database and added to each group before anybody could
 * open the page.
 *
 * The factory expense pair, because the report's money is the factory's wage
 * and power bill — the disclosure those rights already carry (see
 * `admin_board/permissions.py`). And the production COST feed rather than the
 * production reports one: a cost per litre is exactly what that right was kept
 * separate to protect, so a shift supervisor who reads output does not read
 * this.
 *
 * The server (`operations_report/views.py`) opens on exactly these: the two
 * feeds and the operational rights they mirror. Each half of the report is
 * then shown only to a holder of its own right — production and wastage to the
 * run cost right, labour and power to the factory expense one.
 *
 * These must ALSO be present on the parent `/dashboards` navigation entry, or
 * the whole Dashboards menu hides from a user who holds only one of them.
 */
export const OPERATIONS_REPORT_VIEW_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
  DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
  BOARD_FEED_PERMISSIONS.FACTORY_EXPENSE,
  EXECUTION_PERMISSIONS.VIEW_RUN_COST,
  BOARD_FEED_PERMISSIONS.PRODUCTION_COST,
];

/**
 * Days of context on the day view: the fortnight ending on the day, so one
 * day's figure can be read against the run of days around it.
 */
export const DAY_VIEW_TREND_DAYS = 14;

/**
 * Series colours. One hue per measure, the same on every chart and every legend
 * chip, so "orange" means power wherever it appears.
 *
 * The three cost heads are the reference palette's first three categorical
 * slots, in its order — validated as a set for colour-blind separation in both
 * themes, because they sit side by side in the per-litre stack. Production, Goods
 * Return (the reference palette's magenta) and the per-litre total never share
 * a chart with them.
 */
export interface ReportPalette {
  production: string;
  returns: string;
  labour: string;
  power: string;
  wastage: string;
  total: string;
  grid: string;
  axis: string;
}

export const REPORT_PALETTES: Record<'light' | 'dark', ReportPalette> = {
  light: {
    production: '#4a3aa7',
    returns: '#e87ba4',
    labour: '#2a78d6',
    power: '#eb6834',
    wastage: '#1baf7a',
    total: '#334155',
    grid: '#e5e7eb',
    axis: '#6b7280',
  },
  dark: {
    production: '#9085e9',
    returns: '#d55181',
    labour: '#3987e5',
    power: '#d95926',
    wastage: '#199e70',
    total: '#cbd5e1',
    grid: '#2a2a28',
    axis: '#9ca3af',
  },
};
