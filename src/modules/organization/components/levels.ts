/**
 * The three people columns of the chart, and how each one looks.
 *
 * The headings and the footnotes are the chart's own wording, so the page and
 * the printed sheet can be read side by side without translating between them.
 */

import type { OrgLevelKey } from '../types';

export interface OrgLevel {
  key: OrgLevelKey;
  /** Column heading, as printed on the chart. */
  label: string;
  /** The short form, used in the footnote under the table. */
  short: string;
  /** What this level means — the footnote itself. */
  legend: string;
  /** Chip colours, used only while editing. */
  chip: string;
}

export const ORG_LEVELS: readonly OrgLevel[] = [
  {
    key: 'owners',
    label: 'Leader (L1)',
    short: 'L1',
    legend: 'leader of the section',
    chip: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  },
  {
    key: 'level_1',
    label: 'Supported by (L2)',
    short: 'L2',
    legend: 'named support staff',
    chip: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  },
  {
    key: 'level_2',
    label: 'Team (L3)',
    short: 'L3',
    legend: 'wider team',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
];
