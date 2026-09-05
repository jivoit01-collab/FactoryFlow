/**
 * The three people columns of the chart, and how each one looks.
 *
 * Ownership / Level-01 / Level-02 keep the wall chart's colours (amber, sky,
 * emerald) so somebody who knows the printed version reads this one at a glance.
 */

import type { OrgLevelKey } from '../types';

export interface OrgLevel {
  key: OrgLevelKey;
  /** Column heading, as printed on the chart. */
  label: string;
  /** What this level means — the legend at the foot of the page. */
  meaning: string;
  /** Chip colours. */
  chip: string;
  /** The little uppercase column label. */
  label_tone: string;
}

export const ORG_LEVELS: readonly OrgLevel[] = [
  {
    key: 'owners',
    label: 'Ownership',
    meaning: 'Accountable owner responsible for the function.',
    chip: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    label_tone: 'text-amber-700 dark:text-amber-300/80',
  },
  {
    key: 'level_1',
    label: 'Level-01 Support',
    meaning: 'Primary support, keeping the function running day to day.',
    chip: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
    label_tone: 'text-sky-700 dark:text-sky-300/80',
  },
  {
    key: 'level_2',
    label: 'Level-02 Support',
    meaning: 'Extended support, for anything level-01 cannot absorb.',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    label_tone: 'text-emerald-700 dark:text-emerald-300/80',
  },
];
