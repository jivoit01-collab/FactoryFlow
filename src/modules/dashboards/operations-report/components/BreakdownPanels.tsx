import { Factory, Trash2, Undo2, Users, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import { Td, Th } from '@/shared/components/page';

import type { ReportPalette } from '../constants';
import type {
  LabourEntry,
  LineOutput,
  OperationsReport,
  PowerEntry,
  ReturnEntry,
  WastageEntry,
} from '../types';
import { perLitre, quantity, rupees, sectionGap, whole } from '../utils';
import { ReportPanel } from './ReportPanel';

interface Column<T> {
  header: string;
  numeric?: boolean;
  cell: (row: T) => ReactNode;
  /** The footer cell; omitted columns leave theirs empty. */
  total?: ReactNode;
}

/**
 * A thin bar of the row's share of the panel's total. A bar rather than a
 * percentage column because the job is "which one is big" at a glance — the
 * exact figure is already in the row.
 */
function ShareBar({ share, hue }: { share: number; hue: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%`, backgroundColor: hue }}
        />
      </span>
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
        {(share * 100).toFixed(0)}%
      </span>
    </span>
  );
}

function BreakdownTable<T>({
  rows,
  rowKey,
  columns,
  empty,
  gap,
}: {
  rows: T[] | null;
  rowKey: (row: T) => string;
  columns: Column<T>[];
  empty: string;
  /** Why there are no rows at all, when the section was not read. */
  gap?: string | null;
}) {
  if (rows === null) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">{gap ?? 'Not read'}</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            {columns.map((column) => (
              <Th key={column.header} align={column.numeric ? 'right' : 'left'}>
                {column.header}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b last:border-0">
                {columns.map((column) => (
                  <Td
                    key={column.header}
                    numeric={column.numeric}
                    className={column.numeric ? 'whitespace-nowrap py-2' : 'py-2'}
                  >
                    {column.cell(row)}
                  </Td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="border-t bg-muted/20 font-semibold">
            <tr>
              {columns.map((column, index) => (
                <Td
                  key={column.header}
                  numeric={column.numeric}
                  className={column.numeric ? 'whitespace-nowrap py-2' : 'py-2'}
                >
                  {index === 0 ? 'Total' : column.total}
                </Td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/**
 * The four registers behind the headline figures: which line filled what,
 * what was lost, who came through the gate, and where the power went.
 */
export function BreakdownPanels({
  report,
  palette,
}: {
  report: OperationsReport;
  palette: ReportPalette;
}) {
  const { breakdown, totals, view, meta } = report;
  const month = view === 'month';
  const share = (part: number, whole_: number | null) =>
    whole_ !== null && whole_ > 0 ? part / whole_ : 0;

  const lines: Column<LineOutput>[] = [
    { header: 'Line', cell: (row) => <span className="font-medium">{row.line}</span> },
    { header: 'Runs', numeric: true, cell: (row) => whole(row.runs), total: whole(totals.runs) },
    { header: 'Cases', numeric: true, cell: (row) => whole(row.cases), total: whole(totals.cases) },
    {
      header: 'Litres',
      numeric: true,
      cell: (row) => whole(row.litres),
      total: whole(totals.litres),
    },
    {
      header: 'Share',
      cell: (row) => (
        <ShareBar share={share(row.litres ?? 0, totals.litres)} hue={palette.production} />
      ),
    },
  ];

  const wastage: Column<WastageEntry>[] = [
    {
      header: 'Material',
      cell: (row) => (
        <span className="font-medium">
          {row.item}
          {row.unpriced > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {row.unpriced} unpriced
            </span>
          )}
        </span>
      ),
    },
    {
      header: 'Quantity',
      numeric: true,
      cell: (row) => `${quantity(row.quantity)} ${row.unit}`,
    },
    {
      header: 'Value',
      numeric: true,
      cell: (row) => rupees(row.value),
      total: rupees(totals.wastageValue),
    },
    {
      header: 'Per litre',
      numeric: true,
      cell: (row) =>
        perLitre(totals.litres !== null && totals.litres > 0 ? row.value / totals.litres : null),
      total: perLitre(totals.perLitre.wastage),
    },
    {
      header: 'Share',
      cell: (row) => (
        <ShareBar share={share(row.value, totals.wastageValue)} hue={palette.wastage} />
      ),
    },
  ];

  const labour: Column<LabourEntry>[] = [
    { header: 'Contractor', cell: (row) => <span className="font-medium">{row.group}</span> },
    {
      header: month ? 'People a day' : 'People',
      numeric: true,
      cell: (row) => whole(row.heads),
      total: whole(totals.heads),
    },
    {
      header: 'Day shift',
      numeric: true,
      cell: (row) => whole(row.day_shift),
    },
    {
      header: 'Night shift',
      numeric: true,
      cell: (row) => whole(row.night_shift),
    },
    {
      header: 'Cost',
      numeric: true,
      cell: (row) => rupees(row.cost),
      total: rupees(totals.labourCost),
    },
  ];

  const power: Column<PowerEntry>[] = [
    { header: 'Meter', cell: (row) => <span className="font-medium">{row.area}</span> },
    { header: 'kWh', numeric: true, cell: (row) => whole(row.kwh), total: whole(totals.kwh) },
    {
      header: 'Cost',
      numeric: true,
      cell: (row) => rupees(row.cost),
      total: rupees(totals.powerCost),
    },
    {
      header: 'Share',
      cell: (row) => <ShareBar share={share(row.kwh, totals.kwh)} hue={palette.power} />,
    },
  ];

  const returns: Column<ReturnEntry>[] = [
    {
      header: 'Condition',
      cell: (row) => (
        <span className="font-medium">
          {row.label}
          {row.unpriced > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {row.unpriced} unpriced
            </span>
          )}
        </span>
      ),
    },
    {
      header: 'Returns',
      numeric: true,
      cell: (row) => whole(row.entries.length),
      total: whole(totals.grReturns),
    },
    {
      header: 'GR numbers',
      cell: (row) => (
        <span className="text-xs text-muted-foreground" title={row.entries.join(', ')}>
          {row.entries.slice(0, 4).join(', ')}
          {row.entries.length > 4 ? ` +${row.entries.length - 4} more` : ''}
        </span>
      ),
    },
    {
      header: 'Quantity',
      numeric: true,
      cell: (row) => `${quantity(row.quantity)} pcs`,
      total: totals.grQuantity === null ? undefined : `${quantity(totals.grQuantity)} pcs`,
    },
    {
      header: 'Value',
      numeric: true,
      cell: (row) => rupees(row.value),
      total: rupees(totals.grValue),
    },
    {
      header: 'Share',
      cell: (row) => (
        <ShareBar share={share(row.quantity, totals.grQuantity)} hue={palette.returns} />
      ),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ReportPanel
        title="Production by line"
        subtitle="Cases off each line's runs, in litres where the run knows its pack size"
        icon={Factory}
        accent="violet"
        flush
      >
        <BreakdownTable
          rows={breakdown.lines}
          rowKey={(row) => row.line}
          columns={lines}
          empty="No line ran."
          gap={sectionGap(meta, 'production')}
        />
      </ReportPanel>

      <ReportPanel
        title="Wastage"
        subtitle="Packing material booked as waste, dated by its run and valued at that run's SAP price"
        icon={Trash2}
        accent="teal"
        flush
      >
        <BreakdownTable
          rows={breakdown.wastage}
          rowKey={(row) => `${row.item}|${row.unit}`}
          columns={wastage}
          empty="Nothing was booked as wasted."
          gap={sectionGap(meta, 'wastage')}
        />
      </ReportPanel>

      <ReportPanel
        title="Labour"
        subtitle={
          month
            ? 'Contract labour through the gate, averaged per day; cost at the Cost Master rate'
            : 'Contract labour through the gate, by contractor and shift; cost at the Cost Master rate'
        }
        icon={Users}
        accent="blue"
        flush
      >
        <BreakdownTable
          rows={breakdown.labour}
          rowKey={(row) => row.group}
          columns={labour}
          empty="Nobody came through the labour gate."
          gap={sectionGap(meta, 'labour')}
        />
      </ReportPanel>

      <ReportPanel
        title="Electricity"
        subtitle="This company's share of each meter's own units (reading less sub-meters)"
        icon={Zap}
        accent="orange"
        flush
      >
        <BreakdownTable
          rows={breakdown.power}
          rowKey={(row) => row.area}
          columns={power}
          empty="No units on any meter."
          gap={sectionGap(meta, 'power') ?? 'No meter readings were entered for these days.'}
        />
      </ReportPanel>

      <ReportPanel
        title="Goods Return (GR)"
        subtitle="Customer returns by the day the truck arrived (or was booked, if it has not), valued at the invoice price; not part of the cost per litre"
        icon={Undo2}
        accent="pink"
        className="xl:col-span-2"
        flush
      >
        <BreakdownTable
          rows={breakdown.returns}
          rowKey={(row) => row.condition}
          columns={returns}
          empty="Nothing came back."
          gap={sectionGap(meta, 'returns')}
        />
      </ReportPanel>
    </div>
  );
}
