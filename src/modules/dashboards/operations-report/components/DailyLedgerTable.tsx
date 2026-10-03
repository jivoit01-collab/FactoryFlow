import { CalendarDays, ChevronRight } from 'lucide-react';

import { ROW_CLASSES, Td, Th, THEAD_CLASSES } from '@/shared/components/page';

import type { OperationsReport, ReportTotals } from '../types';
import { perLitre, rupees, weekdayDay, whole } from '../utils';
import { ReportPanel } from './ReportPanel';

function Figures({ row }: { row: ReportTotals }) {
  return (
    <>
      <Td numeric>{whole(row.litres)}</Td>
      <Td numeric>{whole(row.cases)}</Td>
      <Td numeric>{rupees(row.wastageValue)}</Td>
      <Td numeric>{whole(row.heads)}</Td>
      <Td numeric>{rupees(row.labourCost)}</Td>
      <Td numeric>{whole(row.kwh)}</Td>
      <Td numeric>{rupees(row.powerCost)}</Td>
      <Td numeric className="font-semibold">
        {perLitre(row.perLitre.total)}
      </Td>
      <Td numeric>{rupees(row.grValue)}</Td>
    </>
  );
}

/**
 * The month as a register: a row a day, the month's total under it. It is also
 * the table view of every chart above, for anybody who wants the figure rather
 * than the bar. A row opens its day.
 */
export function DailyLedgerTable({
  report,
  onSelectDay,
}: {
  report: OperationsReport;
  onSelectDay: (date: string) => void;
}) {
  return (
    <ReportPanel
      title="Day-wise register"
      subtitle="Every day of the month. Click a row to open that day's report."
      icon={CalendarDays}
      accent="slate"
      flush
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Day</Th>
              <Th align="right">Litres</Th>
              <Th align="right">Cases</Th>
              <Th align="right">Wastage</Th>
              <Th align="right">People</Th>
              <Th align="right">Labour</Th>
              <Th align="right">kWh</Th>
              <Th align="right">Power</Th>
              <Th align="right">₹ / L</Th>
              <Th align="right" title="Goods Return">
                GR
              </Th>
              <Th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {report.daily.map((day) => (
              <tr
                key={day.date}
                className={`${ROW_CLASSES} cursor-pointer`}
                onClick={() => onSelectDay(day.date)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectDay(day.date);
                  }
                }}
                tabIndex={0}
                aria-label={`Open ${weekdayDay(day.date)}`}
              >
                <Td className="whitespace-nowrap font-medium">{weekdayDay(day.date)}</Td>
                <Figures row={day} />
                <Td className="w-8 text-muted-foreground">
                  <ChevronRight className="h-4 w-4" />
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/30 font-semibold">
            <tr>
              <Td>Month</Td>
              <Figures row={report.totals} />
              <Td />
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportPanel>
  );
}
