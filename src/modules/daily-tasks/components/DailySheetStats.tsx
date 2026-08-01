import { CheckCircle2, Circle, EyeOff } from 'lucide-react';

import { ACCENTS, KpiStat } from '@/shared/components/dashboard';

import type { DailySheet } from '../types';

export interface DailySheetStatsProps {
  sheet: DailySheet;
}

/**
 * Three flat counts — deliberately no fourth tile, no percentage and no progress ring.
 * A ring reads as a grade; three counts read as a status. We have no attendance data,
 * so any ratio presented as completeness would be a number we cannot stand behind.
 */
export function DailySheetStats({ sheet }: DailySheetStatsProps) {
  const { tally, uncounted_jobs } = sheet;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiStat
        icon={CheckCircle2}
        label="Done today"
        value={`${tally.done} of ${tally.counted_jobs}`}
        sub={`${tally.records_done.toLocaleString('en-IN')} records`}
        accent={ACCENTS.emerald}
      />
      <KpiStat
        icon={Circle}
        label="Still open"
        value={tally.not_yet}
        sub={`of ${tally.counted_jobs} tracked jobs`}
        accent={ACCENTS.amber}
        delayMs={60}
      />
      <KpiStat
        icon={EyeOff}
        label="Not tracked"
        value={uncounted_jobs}
        sub="shown below, never counted"
        accent={ACCENTS.slate}
        delayMs={120}
      />
    </div>
  );
}
