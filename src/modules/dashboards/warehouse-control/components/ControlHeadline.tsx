import { AlertTriangle, CalendarClock, FileText, Layers, PackageX, Truck } from 'lucide-react';

import type { ReportSummary } from '@/modules/dashboards/non-moving/types';

import { OCCUPANCY_BANDS, SECTION_ACCENT } from '../constants/warehouse-control.theme';
import type { ControlLinkingBoard, ControlScheduledQueue, PalletSpaceSummary } from '../types';
import { formatCompactCurrency, formatCount, formatPercent } from '../utils/format';
import { ControlStat } from './ControlStat';

export interface ControlHeadlineProps {
  palletSpace: { summary: PalletSpaceSummary; loading: boolean; available: boolean };
  nonMoving: { summary?: ReportSummary; loading: boolean; available: boolean };
  linking: { board: ControlLinkingBoard; loading: boolean; available: boolean };
  scheduled: { queue: ControlScheduledQueue; loading: boolean; available: boolean };
}

/** A tile with nothing behind it reads as a dash, never as a zero. */
const NO_VALUE = '—';

/**
 * The six numbers the board exists to show, above everything else.
 *
 * A panel is where somebody investigates; this strip is where they decide
 * whether they need to. Each tile carries its section's hue, so a number that
 * looks wrong here points straight at the panel to scroll to. Tiles for feeds
 * the user cannot read, or that failed, show a dash rather than a misleading
 * zero — an empty warehouse and an unreadable one must not look the same.
 */
export function ControlHeadline({
  palletSpace,
  nonMoving,
  linking,
  scheduled,
}: ControlHeadlineProps) {
  const space = palletSpace.summary;
  const hasSpace = palletSpace.available && space.totalSpace > 0;
  const packed = space.utilisationPct >= OCCUPANCY_BANDS.full;

  const nonMovingSummary = nonMoving.summary;
  const linkCounts = linking.board.counts;
  const scheduledCounts = scheduled.queue.counts;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
      <ControlStat
        label="Pallet Space"
        value={hasSpace ? formatPercent(space.utilisationPct) : NO_VALUE}
        hint={
          hasSpace
            ? `${formatCount(space.usedSpace)} of ${formatCount(space.totalSpace)} slots`
            : 'no layout measured'
        }
        icon={Layers}
        accent={SECTION_ACCENT.palletSpace}
        emphasise={packed}
        loading={palletSpace.loading}
      />
      <ControlStat
        label="Free Slots"
        value={hasSpace ? formatCount(space.freeSpace) : NO_VALUE}
        hint={hasSpace ? `across ${formatCount(space.warehouses.length)} warehouses` : undefined}
        icon={Layers}
        accent={hasSpace && space.freeSpace === 0 ? 'rose' : 'emerald'}
        emphasise={hasSpace && space.freeSpace === 0}
        loading={palletSpace.loading}
      />
      <ControlStat
        label="Non-Moving"
        value={nonMovingSummary ? formatCompactCurrency(nonMovingSummary.total_value) : NO_VALUE}
        hint={
          nonMovingSummary ? `${formatCount(nonMovingSummary.total_items)} items stuck` : undefined
        }
        icon={PackageX}
        accent={SECTION_ACCENT.nonMoving}
        emphasise={Boolean(nonMovingSummary && nonMovingSummary.total_items > 0)}
        loading={nonMoving.loading}
      />
      <ControlStat
        label="Bills Linked"
        value={linking.available ? formatCount(linkCounts.linkedBillsToday) : NO_VALUE}
        hint={
          linking.available
            ? `${formatCompactCurrency(linking.board.totals.amount)} today`
            : undefined
        }
        icon={FileText}
        accent={SECTION_ACCENT.bills}
        loading={linking.loading}
      />
      <ControlStat
        label="Trucks Today"
        value={linking.available ? formatCount(linkCounts.trucksToday) : NO_VALUE}
        hint={
          linking.available
            ? linkCounts.dispatchedTrucksToday > 0
              ? `${formatCount(linkCounts.dispatchedTrucksToday)} already dispatched`
              : `${formatCount(linkCounts.unlinkedToday)} bills still unlinked`
            : undefined
        }
        icon={Truck}
        accent={SECTION_ACCENT.linking}
        loading={linking.loading}
      />
      {scheduledCounts.overdue > 0 ? (
        <ControlStat
          label="Overdue"
          value={formatCount(scheduledCounts.overdue)}
          hint={`of ${formatCount(scheduledCounts.total)} awaiting a truck`}
          icon={AlertTriangle}
          accent={SECTION_ACCENT.pending}
          emphasise
          loading={scheduled.loading}
        />
      ) : (
        <ControlStat
          label="Awaiting Link"
          value={scheduled.available ? formatCount(scheduledCounts.total) : NO_VALUE}
          hint={scheduled.available ? `${formatCount(scheduledCounts.today)} due today` : undefined}
          icon={CalendarClock}
          accent={SECTION_ACCENT.pending}
          loading={scheduled.loading}
        />
      )}
    </div>
  );
}
