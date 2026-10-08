import { AlertTriangle, EyeOff, Info } from 'lucide-react';

import type { OperationsReport, ReportMeta, ReportTotals } from '../types';
import { measureOf, SECTION_LABEL, spanLabel } from '../utils';

const days = (count: number) => `${count} day${count === 1 ? '' : 's'}`;

/** The right that would show each hidden section, named once each. */
function rightsFor(sections: ReportMeta['withheld']): string {
  const rights = new Set(
    sections.map((section) =>
      section === 'returns'
        ? 'goods return'
        : section === 'labour' || section === 'salary' || section === 'power'
          ? 'factory expense'
          : 'production cost',
    ),
  );
  const list = [...rights];
  return `${list.join(' or ')} right${list.length > 1 ? 's' : ''}`;
}

/** What a span is missing, in the order a reader would chase it. */
function gapsOf(totals: ReportTotals): string[] {
  return [
    totals.powerUnreadDays > 0 && `no meter readings on ${days(totals.powerUnreadDays)}`,
    totals.labourUncostedDays > 0 && `no labour rate on ${days(totals.labourUncostedDays)}`,
    totals.salaryUncostedDays > 0 && `no salary rate on ${days(totals.salaryUncostedDays)}`,
    totals.litresUnknownDays > 0 && `a run with no pack size on ${days(totals.litresUnknownDays)}`,
  ].filter((gap): gap is string => Boolean(gap));
}

/**
 * What the report could not show, and the caveats on what it did.
 *
 * Kept apart because each sends the reader somewhere different: a section
 * hidden from them (an administrator), a section the server could not read
 * (whoever runs it), a gap in the period shown (the register's owner), and a
 * gap only in the period it is compared with — which is why that change is
 * missing, and nothing more.
 *
 * The gaps are counted here, from the days of each period, rather than taken
 * from the server: it reads the shown period and its comparison in one go, so
 * a sentence of its own could only describe both at once — and under a
 * September heading, "28 days unread" about August reads as September's.
 *
 * A band of the page, not a toast: a warning somebody can dismiss is one the
 * next reader never sees.
 */
export function ReportNotices({ report }: { report: OperationsReport }) {
  const { meta, totals, previous, previousLabel } = report;
  const shown = gapsOf(totals);
  const compared = gapsOf(previous);
  const span = report.from === report.to ? 'this day' : spanLabel(report.from, report.to);

  if (
    !meta.withheld.length &&
    !meta.degraded.length &&
    !meta.warnings.length &&
    !shown.length &&
    !compared.length &&
    !totals.grUnpriced
  ) {
    return null;
  }

  const names = (sections: ReportMeta['withheld']) =>
    sections.map((section) => SECTION_LABEL[section]).join(', ');

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 text-sm shadow-sm">
      {meta.degraded.length > 0 && (
        <p className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{names(meta.degraded)}</b> could not be read just now, so{' '}
            {meta.degraded.length === 1 ? 'it is' : 'they are'} left blank rather than shown as
            zero.
          </span>
        </p>
      )}
      {meta.withheld.length > 0 && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{names(meta.withheld)}</b> {meta.withheld.length === 1 ? 'is' : 'are'} not shown to
            you
            {meta.withheld.some((section) => section !== 'returns')
              ? `, so the cost per ${measureOf(report).noun} cannot be worked out`
              : ''}
            . Ask an administrator for the {rightsFor(meta.withheld)}.
          </span>
        </p>
      )}
      {shown.length > 0 && (
        <p className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{span}</b> has {shown.join(', ')}. Those figures are left blank rather than counted
            as zero.
          </span>
        </p>
      )}
      {totals.grUnpriced > 0 && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {totals.grUnpriced} Goods Return line{totals.grUnpriced === 1 ? '' : 's'} in{' '}
            <b>{span}</b> {totals.grUnpriced === 1 ? 'has' : 'have'} no invoice price (returned
            against a debit note or letter pad, or invoiced at nil), so the pieces are counted and
            their value is not.
          </span>
        </p>
      )}
      {meta.warnings.map((warning) => (
        <p key={warning} className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </p>
      ))}
      {compared.length > 0 && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {previousLabel}, which this is compared with, has {compared.join(', ')} — so some
            changes against it are not shown.
          </span>
        </p>
      )}
    </div>
  );
}
