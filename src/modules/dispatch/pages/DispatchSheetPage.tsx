import { Download, Loader2, Sheet as SheetIcon, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useDispatchSheet } from '@/modules/dispatch/api/sheet.api';
import {
  columnsFor,
  figure,
  type SheetColumn,
} from '@/modules/dispatch/components/sheet/sheetColumns';
import { downloadSheet } from '@/modules/dispatch/components/sheet/sheetExport';
import type { DispatchSheetRow, DispatchSheetStream } from '@/modules/dispatch/types/sheet.types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  ColumnFilter,
  columnLetter,
  type ColumnSpec,
  useLocalColumns,
  useSheetSelection,
  useSpreadsheetKeys,
} from '@/shared/components/sheetGrid';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

/** The first of this month, and today — the block of the book anybody opens. */
function thisMonth() {
  const today = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return {
    from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: iso(today),
  };
}

/**
 * The Dispatch Sheet — the outward register, as the desk has always kept it.
 *
 * For years this was an Excel workbook: a tab for oil, a tab for water, a
 * block per day, a line per invoice that went out on a truck. Every column of
 * it is already in the app — the plan holds the vehicle, the bilty, the
 * priority, the kanta weight and the freight; the invoice holds its date, the
 * party, the address, the litres and the boxes — so this is not a new book to
 * keep. It is those rows, laid out the way the desk reads them, and it fills
 * itself.
 *
 * It reads like the sheet it replaces, not like a dashboard:
 *
 * * **Every column has a funnel and a sort**, so the header row is the filter
 *   bar. There is no separate one.
 * * **The margins select.** Click a row number for the row, a column letter
 *   for the column, the corner for everything; shift-click extends. The
 *   figures for whatever is picked sit at the foot, as Excel's status bar does.
 * * **The cells walk with the arrow keys** once one is clicked, and Ctrl+C
 *   copies the one under the cursor.
 * * **Download gives back what is on screen** — this tab's columns, the rows
 *   that survived the filters, in the order they are sorted.
 *
 * Read-only, deliberately: a figure typed here would be a second, disagreeing
 * copy of what the plan already says. The way to change a line is to change
 * the plan it is a view of, on the Plans page.
 */
export default function DispatchSheetPage() {
  const initial = thisMonth();
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [stream, setStream] = useState<DispatchSheetStream>('OIL');
  const [search, setSearch] = useState('');
  // Which column's drop-down is open, so only that one's value list is built:
  // a year's worth of rows counted twenty times over on every render is real
  // time, and nineteen of those lists are not on screen.
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const [allCompanies, setAllCompanies] = useState(false);

  const params = useMemo(
    () => ({
      date_from: dateFrom,
      date_to: dateTo,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(allCompanies ? { all_companies: true } : {}),
    }),
    [dateFrom, dateTo, search, allCompanies],
  );

  // Both sheets come down together and the tab picks between them here: the
  // counts on the two tabs have to be right before either is opened, and a
  // second round trip to learn "water: 0" is a second round trip for nothing.
  const { data, isLoading, isError, error } = useDispatchSheet(params);

  const allRows = useMemo(() => data?.data ?? [], [data]);
  const streamRows = useMemo(
    () => allRows.filter((row) => row.stream === stream),
    [allRows, stream],
  );

  const columns = useMemo(
    () => columnsFor(stream, { crossCompany: allCompanies }),
    [stream, allCompanies],
  );

  // The Excel filters and the sort, over the rows in hand. Every column offers
  // the values it actually holds, counted.
  const specs = useMemo(() => {
    const out: Record<string, ColumnSpec<DispatchSheetRow>> = {};
    for (const column of columns) {
      out[column.key] = {
        value: (row) => column.value(row),
        sortValue: column.number ? (row) => column.number?.(row) ?? null : undefined,
      };
    }
    return out;
  }, [columns]);

  const {
    rows,
    column: columnProps,
    filteredColumns,
    clearFilters,
  } = useLocalColumns(streamRows, specs, { key: 'dispatch_date', direction: 'asc' }, {
    activeColumn: openColumn,
  });

  const { gridProps } = useSpreadsheetKeys({ onCopy: () => toast.success('Copied') });

  const byKey = useMemo(() => {
    const map = new Map<string, SheetColumn>();
    for (const column of columns) map.set(column.key, column);
    return map;
  }, [columns]);

  const selection = useSheetSelection({
    rows,
    columnKeys: columns.map((column) => column.key),
    numberAt: (row, key) => byKey.get(key)?.number?.(row) ?? null,
    // A different tab, window or company scope is a different set of lines, so
    // "rows 3 to 10" no longer means anything and the selection goes.
    reset: `${stream}|${dateFrom}|${dateTo}|${allCompanies}|${filteredColumns.join()}`,
  });

  /** Column totals over what is on screen — the sheet's own footing line. */
  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const column of columns) {
      if (!column.total || !column.number) continue;
      out[column.key] = rows.reduce((sum, row) => sum + (column.number?.(row) ?? 0), 0);
    }
    return out;
  }, [columns, rows]);

  const meta = data?.meta;
  const counts = {
    OIL: allRows.filter((row) => row.stream === 'OIL').length,
    WATER: allRows.filter((row) => row.stream === 'WATER').length,
  };

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Dispatch Sheet"
        description="Every invoice that left the gate, day by day — the register, filled from the plans"
      >
        <Button
          variant="outline"
          disabled={rows.length === 0}
          onClick={() =>
            downloadSheet({ rows, columns, stream, dateFrom, dateTo })
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </DashboardHeader>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">From</span>
          <Input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-9 w-40"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">To</span>
          <Input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-9 w-40"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Find</span>
          <Input
            placeholder="Invoice, party, bilty, vehicle…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-64"
          />
        </label>
        <label className="flex h-9 items-center gap-2 text-sm">
          <Checkbox
            checked={allCompanies}
            onCheckedChange={(checked) => setAllCompanies(checked === true)}
          />
          All companies
        </label>

        {filteredColumns.length > 0 && (
          <div className="flex h-9 items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Filtered by {filteredColumns.join(', ')}
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <Tabs value={stream} onValueChange={(value) => setStream(value as DispatchSheetStream)}>
        <TabsList>
          <TabsTrigger value="OIL">Oil · {counts.OIL}</TabsTrigger>
          <TabsTrigger value="WATER">Water · {counts.WATER}</TabsTrigger>
        </TabsList>
      </Tabs>

      {meta && !meta.sap_available && (
        <p className="flex items-start gap-2 rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            SAP did not answer, so the invoice date, litres and boxes are blank on
            these rows. Everything the plan itself holds is right.
          </span>
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Reading the register…
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            The register could not be read. {(error as Error)?.message ?? ''}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <SheetIcon className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filteredColumns.length > 0
                ? 'No line matches those column filters.'
                : `Nothing went out on the ${stream === 'WATER' ? 'water' : 'oil'} sheet between these dates.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="max-h-[70vh] overflow-auto">
            <table {...gridProps} className={`w-full text-sm ${gridProps.className}`}>
              <thead className="sticky top-0 z-10 bg-muted">
                {/* The letters across the top of a sheet. Clicking one picks
                    the column; the corner picks everything. They are a
                    separate row from the headings so that clicking a heading
                    still sorts it, as it does everywhere else. */}
                <tr className="border-b text-[10px] text-muted-foreground">
                  <th
                    className="w-10 cursor-pointer border-r bg-muted px-1 py-0.5 text-center hover:bg-primary/20"
                    onClick={selection.pickAll}
                    title="Select the whole sheet"
                  >
                    ◤
                  </th>
                  {columns.map((column, index) => (
                    <th
                      key={column.key}
                      className={`cursor-pointer border-r px-1 py-0.5 text-center font-normal hover:bg-primary/20 ${
                        selection.isColumnPicked(column.key) ? 'bg-primary/20' : ''
                      }`}
                      onClick={(event) => selection.pickColumn(column.key, event.shiftKey)}
                      title={`Select column ${column.label}`}
                    >
                      {columnLetter(index)}
                    </th>
                  ))}
                </tr>
                <tr className="border-b text-left">
                  <th className="w-10 border-r bg-muted px-1 py-2" />
                  {columns.map((column) => (
                    <ColumnFilter
                      key={column.key}
                      {...columnProps(column.key, column.label, column.align ?? 'left')}
                      onOpen={() => setOpenColumn(column.key)}
                    />
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.company_code}-${row.plan_id}`}
                    className="border-b hover:bg-muted/40"
                  >
                    {/* The numbers down the left. Clicking one picks the row. */}
                    <th
                      scope="row"
                      className={`w-10 cursor-pointer border-r bg-muted/60 px-1 py-1 text-center text-[10px] font-normal text-muted-foreground hover:bg-primary/20 ${
                        selection.isRowPicked(index) ? 'bg-primary/20' : ''
                      }`}
                      onClick={(event) => selection.pickRow(index, event.shiftKey)}
                      title={`Select row ${index + 1}`}
                    >
                      {index + 1}
                    </th>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-1.5 ${
                          column.align === 'right' ? 'text-right tabular-nums' : ''
                        } ${column.wide ? 'max-w-[280px] truncate' : 'whitespace-nowrap'} ${
                          selection.cellClass(index, column.key)
                        }`}
                        title={column.wide ? column.value(row) : undefined}
                      >
                        {column.value(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

              {/* The sheet's own footing line, over what is on screen — filter
                  to one day and this is that day's total, which is the figure
                  the workbook keeps under each day's block. */}
              <tfoot className="sticky bottom-0 border-t bg-muted font-medium">
                <tr>
                  <th className="border-r px-1 py-2" />
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={`px-3 py-2 ${
                        column.align === 'right' ? 'text-right tabular-nums' : ''
                      }`}
                    >
                      {index === 0
                        ? `${rows.length} ${rows.length === 1 ? 'line' : 'lines'}`
                        : column.total
                          ? figure(totals[column.key] ?? 0)
                          : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Excel's status bar: what is picked, and what it adds up to. */}
          <div className="flex flex-wrap items-center gap-4 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {selection.figures ? (
              <>
                <span>
                  {selection.selection.kind === 'all'
                    ? 'Whole sheet'
                    : selection.selection.kind === 'rows'
                      ? `${selection.selection.rows.size} ${selection.selection.rows.size === 1 ? 'row' : 'rows'}`
                      : `${selection.selection.columns.size} ${selection.selection.columns.size === 1 ? 'column' : 'columns'}`}{' '}
                  picked
                </span>
                <span>Count {selection.figures.cells.toLocaleString('en-IN')}</span>
                <span>Numbers {selection.figures.numbers.toLocaleString('en-IN')}</span>
                <span className="font-medium text-foreground">
                  Sum {figure(selection.figures.sum, 2)}
                </span>
                {selection.figures.average !== null && (
                  <span>Average {figure(selection.figures.average, 2)}</span>
                )}
                <Button variant="ghost" size="sm" className="h-6" onClick={selection.clear}>
                  Clear selection
                </Button>
              </>
            ) : (
              <span>
                Click a row number or a column letter to pick one — shift-click to extend.
                Click a cell and the arrow keys walk the sheet; Ctrl+C copies it.
              </span>
            )}
            <span className="ml-auto">
              {meta ? `${meta.date_from} to ${meta.date_to}` : ''}
              {filteredColumns.length > 0 ? ` · ${rows.length} of ${streamRows.length}` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
