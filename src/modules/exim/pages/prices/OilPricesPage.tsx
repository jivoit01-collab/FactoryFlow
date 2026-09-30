/**
 * Oil Prices: EXIM's Daily Commodity Prices.
 *
 * Every night the server reads the purchase team's price sheet and saves the
 * day: each commodity's factory price a kilo, then with packing, with GST, and
 * with GST a litre. The page shows one day against the day before it (the
 * previous day the sheet was read), and a range as a line per commodity with
 * each one's highest and lowest.
 *
 * A price that rose is dearer oil to buy, so a rise is drawn rose and a fall
 * emerald, with the arrow and the sign saying the same.
 *
 * The day, the range and the figure live in the address, so a view is a link.
 * Those allowed can read the sheet as it stands and save it as today's.
 */
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChartLine,
  CloudDownload,
  ExternalLink,
  FileSpreadsheet,
  Minus,
  Rows3,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  FilterField,
  PageHeader,
  PageSection,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { Button, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn, formatDateTimeShort, formatDay, getErrorMessage } from '@/shared/utils';

import { usePriceDay, usePriceRange } from '../../api';
import { DayByDayTable } from '../../components/prices/DayByDayTable';
import { DayPicker } from '../../components/prices/DayPicker';
import { ChangeMark, type SortState, SortTh } from '../../components/prices/PriceBits';
import {
  changeOf,
  DEFAULT_RANGE_DAYS,
  defaultCommodities,
  figureOf,
  FIGURES,
  fmtPct,
  fmtRupees,
  fmtSigned,
  isDay,
  longDay,
  plural,
  type Point,
  PRICE_SHEET_URL,
  rangeEnding,
  rangeProblem,
  tally,
} from '../../components/prices/priceFormat';
import { exportPriceRange } from '../../components/prices/pricesExcel';
import { RangeBar } from '../../components/prices/RangeBar';
import { RangeStatsTable } from '../../components/prices/RangeStatsTable';
import { PriceSheetDialog } from '../../components/prices/SheetDialogs';
import { SeriesToggles, TrendChart } from '../../components/prices/TrendChart';
import { useTrendSeries } from '../../components/prices/useTrendSeries';
import type { CommodityPrice } from '../../types';
import { fmtMoney, todayISO } from '../../utils';

const P = EXIM_PERMISSIONS;

type DaySort = 'commodity' | 'factory' | 'change';

const DAY_COLUMNS = 6;

const alphabetical = (a: string, b: string) => a.localeCompare(b);

/** Where the day's prices came from, in words: read from the sheet, or EXIM's history. */
function sourceNote(prices: CommodityPrice[]): string {
  if (prices.length === 0) return '';
  const read = prices.filter((p) => p.source === 'SHEET').map((p) => p.fetched_at);
  if (read.length === 0) return 'copied from EXIM’s history of the sheet';
  const latest = read.reduce((a, b) => (a > b ? a : b));
  return `read from the sheet ${formatDateTimeShort(latest)}`;
}

export default function OilPricesPage() {
  const { hasPermission } = usePermission();
  const canSave = hasPermission(P.PRICE_ADD);
  const canFetch = canSave || hasPermission(P.PRICE_FETCH);
  const baseId = useId();

  const [params, setParams] = useSearchParams();
  const dateParam = params.get('date');
  const asked = isDay(dateParam) ? dateParam : null;
  const today = todayISO();
  const standard = rangeEnding(today, DEFAULT_RANGE_DAYS);
  const fromParam = params.get('from');
  const toParam = params.get('to');
  const from = isDay(fromParam) ? fromParam : standard.from;
  const to = isDay(toParam) ? toParam : standard.to;
  const figure = figureOf(params.get('figure'));

  function writeParams(values: Record<string, string | null>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(values)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }

  function setRange(nextFrom: string, nextTo: string) {
    const fresh = rangeEnding(todayISO(), DEFAULT_RANGE_DAYS);
    const isStandard = nextFrom === fresh.from && nextTo === fresh.to;
    writeParams({ from: isStandard ? null : nextFrom, to: isStandard ? null : nextTo });
  }

  const [sheetOpen, setSheetOpen] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const [sort, setSort] = useState<SortState<DaySort>>({ key: null, dir: 'asc' });

  // --- the day ----------------------------------------------------------------

  const day = usePriceDay(asked ?? undefined);
  const dayPending = day.isLoading || day.isPlaceholderData;
  const shown = dayPending ? null : (day.data?.date ?? null);

  const lines = useMemo(
    () =>
      (day.data?.prices ?? []).map((p) => ({
        p,
        change: changeOf(p.factory_price_kg, p.previous?.factory_price_kg),
      })),
    [day.data],
  );
  const counts = tally(lines.map((line) => line.change));
  const compared = !!day.data?.previous_date;
  const biggest = lines
    .filter((line) => line.change && line.change.direction !== 'same')
    .sort((a, b) => Math.abs(b.change?.amount ?? 0) - Math.abs(a.change?.amount ?? 0))[0];

  const sortedLines = useMemo(() => {
    if (!sort.key) return lines;
    const key = sort.key;
    return [...lines].sort((a, b) => {
      const cmp =
        key === 'commodity'
          ? a.p.commodity.localeCompare(b.p.commodity)
          : key === 'factory'
            ? a.p.factory_price_kg - b.p.factory_price_kg
            : (a.change?.amount ?? -Infinity) - (b.change?.amount ?? -Infinity);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [lines, sort]);

  function sortBy(key: DaySort) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'commodity' ? 'asc' : 'desc' },
    );
  }

  // --- the range --------------------------------------------------------------

  const problem = rangeProblem(from, to);
  const range = usePriceRange(from, to, !problem);
  const rangeRows = useMemo(() => (problem ? [] : (range.data?.rows ?? [])), [problem, range.data]);
  const commodities = useMemo(
    () => [...new Set(rangeRows.map((r) => r.commodity))].sort(alphabetical),
    [rangeRows],
  );
  const points = useMemo<Point[]>(
    () => rangeRows.map((r) => ({ date: r.date, key: r.commodity, value: r[figure.key] })),
    [rangeRows, figure.key],
  );
  const trend = useTrendSeries(commodities, points, defaultCommodities);
  const daysHeld = trend.rows.length;
  const rangeError = range.isError ? getErrorMessage(range.error, 'Try again in a moment.') : null;
  const rangeLoading = !problem && range.isLoading;
  const dim = range.isPlaceholderData || (range.isFetching && !range.isLoading);

  const rangeActive = (fromParam || toParam ? 1 : 0) + (params.get('figure') ? 1 : 0);
  const format = (value: number) => fmtRupees(value);

  function download() {
    exportPriceRange({ rows: rangeRows, from, to, figure, commodities, stats: trend.stats });
    toast.success('Oil prices downloaded');
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Oil Prices" icon={ChartLine} accent="teal">
        <Button variant="outline" asChild>
          <a
            href={day.data?.sheet_url || PRICE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Open the sheet
          </a>
        </Button>
        {canFetch && (
          <Button onClick={() => setSheetOpen(true)}>
            <CloudDownload className="mr-1.5 h-4 w-4" />
            Fetch from the sheet
          </Button>
        )}
      </PageHeader>

      <DayPicker
        id={`${baseId}-day`}
        asked={asked}
        shown={shown}
        previousDate={dayPending ? null : (day.data?.previous_date ?? null)}
        nextDate={dayPending ? null : (day.data?.next_date ?? null)}
        firstDate={day.data?.first_date ?? null}
        lastDate={day.data?.last_date ?? null}
        loading={dayPending}
        fetching={day.isFetching}
        noun="prices"
        onPick={(value) => writeParams({ date: value })}
      />

      <StatTileRow>
        <StatTile
          label="Day shown"
          value={day.data?.date ? formatDay(day.data.date) : '—'}
          sub={
            day.data?.previous_date
              ? `against ${formatDay(day.data.previous_date)}`
              : day.data?.date
                ? 'the first day held'
                : 'nothing saved'
          }
          icon={CalendarDays}
          accent="teal"
        />
        <StatTile
          label="Rose"
          value={compared ? counts.up : '—'}
          sub="dearer at the factory"
          icon={TrendingUp}
          accent="rose"
        />
        <StatTile
          label="Fell"
          value={compared ? counts.down : '—'}
          sub="cheaper at the factory"
          icon={TrendingDown}
          accent="emerald"
        />
        <StatTile
          label="Unchanged"
          value={compared ? counts.same : '—'}
          sub={
            counts.fresh && compared
              ? `${counts.fresh} new, not quoted the day before`
              : 'the same as the day before'
          }
          icon={Minus}
        />
        <StatTile
          label="Biggest move"
          value={biggest ? biggest.p.commodity : '—'}
          sub={
            biggest?.change
              ? `${fmtSigned(biggest.change.amount)} ₹/kg · ${fmtPct(biggest.change.pct)}`
              : compared
                ? 'nothing moved'
                : 'no day before to compare'
          }
          icon={Activity}
          accent="amber"
        />
      </StatTileRow>

      <TableCard
        className={cn('transition-opacity', dayPending && day.data && 'opacity-60')}
        summary={
          <span>
            {day.data?.date ? (
              <>
                <span className="font-semibold text-foreground">{longDay(day.data.date)}</span>
                {' · '}
                {plural(lines.length, 'commodity', 'commodities')}
                {lines.length ? ` · ${sourceNote(day.data.prices)}` : ''}
              </>
            ) : (
              'No day shown'
            )}
          </span>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <SortTh column="commodity" sort={sort} onSort={sortBy}>
                Commodity
              </SortTh>
              <SortTh column="factory" align="right" sort={sort} onSort={sortBy}>
                Factory (₹/kg)
              </SortTh>
              <Th align="right">With packing (₹/kg)</Th>
              <Th align="right">With GST (₹/kg)</Th>
              <Th align="right">With GST (₹/L)</Th>
              <SortTh column="change" align="right" sort={sort} onSort={sortBy}>
                Change (₹/kg)
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {day.isLoading ? (
              <TableLoading colSpan={DAY_COLUMNS} message="Reading the prices…" />
            ) : day.isError ? (
              <TableEmpty
                colSpan={DAY_COLUMNS}
                icon={AlertTriangle}
                message="The prices could not be read"
                hint={getErrorMessage(day.error, 'Try again in a moment.')}
              />
            ) : lines.length === 0 ? (
              <TableEmpty
                colSpan={DAY_COLUMNS}
                icon={ChartLine}
                message={asked ? `No prices on or before ${longDay(asked)}` : 'No prices saved yet'}
                hint={
                  canSave
                    ? 'Fetch from the sheet to save today’s.'
                    : 'The sheet is read every night; the first night’s prices appear here.'
                }
              />
            ) : (
              sortedLines.map(({ p, change }) => (
                <tr key={p.commodity} className={ROW_CLASSES}>
                  <Td className="whitespace-nowrap font-medium">{p.commodity}</Td>
                  <Td numeric className="font-semibold">
                    {fmtMoney(p.factory_price_kg)}
                  </Td>
                  <Td numeric>{fmtMoney(p.packed_price_kg)}</Td>
                  <Td numeric>{fmtMoney(p.with_gst_kg)}</Td>
                  <Td numeric>{fmtMoney(p.with_gst_litre)}</Td>
                  <Td numeric className="whitespace-nowrap">
                    <ChangeMark
                      change={change}
                      pct
                      empty="new"
                      emptyTitle="Not quoted the day before"
                    />
                    {p.previous && (
                      <span className="block text-xs text-muted-foreground">
                        from {fmtMoney(p.previous.factory_price_kg)}
                      </span>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <PageSection
        title="Trends"
        description={`${figure.label} (${figure.unit}) over a range, a line per commodity. Switch a commodity on or off above the chart; the table under it lists every one.`}
        icon={TrendingUp}
      >
        <RangeBar
          id={`${baseId}-range`}
          from={from}
          to={to}
          onRange={setRange}
          problem={problem}
          isFetching={range.isFetching && !range.isLoading}
          activeCount={rangeActive}
          onReset={
            rangeActive ? () => writeParams({ from: null, to: null, figure: null }) : undefined
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={download}
              disabled={!!problem || rangeLoading || !!rangeError || rangeRows.length === 0}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Download Excel
            </Button>
          }
        >
          <FilterField label="Figure" htmlFor={`${baseId}-figure`} className="sm:w-56">
            <NativeSelect
              id={`${baseId}-figure`}
              value={figure.key}
              onChange={(event) =>
                writeParams({
                  figure: event.target.value === FIGURES[0].key ? null : event.target.value,
                })
              }
            >
              {FIGURES.map((f) => (
                <SelectOption key={f.key} value={f.key}>
                  {f.label} ({f.unit})
                </SelectOption>
              ))}
            </NativeSelect>
          </FilterField>
        </RangeBar>

        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          {trend.series.length > 0 && (
            <SeriesToggles
              series={trend.series}
              selected={trend.selected}
              onToggle={trend.toggle}
              onAll={trend.showAll}
              onNone={trend.showNone}
              label="Commodities drawn"
            />
          )}
          {problem ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{problem}</p>
          ) : rangeLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Reading the range…</p>
          ) : rangeError ? (
            <p className="py-16 text-center text-sm text-rose-600 dark:text-rose-400">
              {rangeError}
            </p>
          ) : trend.rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No prices were saved between {longDay(from)} and {longDay(to)}.
            </p>
          ) : trend.drawn.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Switch a commodity on to draw its line.
            </p>
          ) : (
            <TrendChart rows={trend.rows} series={trend.drawn} format={format} dim={dim} />
          )}
        </div>

        <RangeStatsTable
          series={trend.series}
          selected={trend.selected}
          stats={trend.stats}
          format={fmtMoney}
          heading="Commodity"
          loading={rangeLoading}
          error={rangeError}
          emptyMessage={problem ?? 'No prices in this range'}
          emptyHint={problem ? undefined : 'Try a longer range.'}
          summary={
            <span>
              <span className="font-semibold text-foreground">
                {figure.label} ({figure.unit})
              </span>
              {` · ${longDay(from)} to ${longDay(to)}`}
              {daysHeld ? ` · ${plural(daysHeld, 'day')} with prices` : ''}
            </span>
          }
          actions={
            <Button
              variant={showDays ? 'secondary' : 'outline'}
              size="sm"
              aria-expanded={showDays}
              onClick={() => setShowDays((value) => !value)}
              disabled={trend.drawn.length === 0 || trend.rows.length === 0}
            >
              <Rows3 className="mr-1.5 h-3.5 w-3.5" />
              {showDays ? 'Hide day by day' : 'Day by day'}
            </Button>
          }
        />

        {showDays && trend.drawn.length > 0 && trend.rows.length > 0 && (
          <DayByDayTable
            rows={trend.rows}
            series={trend.drawn}
            stats={trend.stats}
            format={fmtMoney}
            summary={`${figure.label} (${figure.unit}), the commodities drawn, newest first`}
          />
        )}
      </PageSection>

      {canFetch && (
        <PriceSheetDialog
          open={sheetOpen}
          sheetUrl={day.data?.sheet_url}
          onOpenChange={setSheetOpen}
          canSave={canSave}
          onSaved={() => writeParams({ date: null })}
        />
      )}
    </div>
  );
}
