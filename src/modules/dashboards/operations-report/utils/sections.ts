import type { ReportMeta, ReportSection } from '../types';

/**
 * Why a section has no figures, in the words a reader can act on — or null when
 * it was read. "Not shown to you" sends somebody to an administrator; "could
 * not be read" sends them to whoever runs the server. The two must not be
 * confused, which is why the server keeps them in separate lists.
 */
export function sectionGap(meta: ReportMeta, section: ReportSection): string | null {
  if (meta.withheld.includes(section)) return 'Not shown to you';
  if (meta.degraded.includes(section)) return 'Could not be read';
  return null;
}

export const SECTION_LABEL: Record<ReportSection, string> = {
  production: 'Production',
  wastage: 'Wastage',
  labour: 'Labour',
  salary: 'Salary',
  power: 'Electricity',
  returns: 'Goods Return (GR)',
};
