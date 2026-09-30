/**
 * Jivo Rates: EXIM's Jivo Rates page.
 *
 * The price sheet's "JIVO RATE" table: Jivo's rupee rate for each pack (a
 * litre pouch, a 15 kg tin …) of each commodity, saved every night with the
 * commodity prices. The page shows one day as a matrix, packs down and
 * commodities across, each rate against the day before it; and a range for one
 * pack as a line per commodity, with each one's highest and lowest.
 *
 * Rates follow the oil price, so a rise is drawn rose and a fall emerald, as
 * on Oil Prices; the arrow and the sign say the same.
 *
 * The day, the range and the pack live in the address, so a view is a link.
 * Those allowed can read the sheet as it stands and save it as today's.
 */
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CloudDownload,
  FileSpreadsheet,
  Minus,
  Rows3,
  Tags,
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
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import { useRateDay, useRateRange } from '../../api';
import { DayByDayTable } from '../../components/prices/DayByDayTable';
import { DayPicker } from '../../components/prices/DayPicker';
import { ChangeMark } from '../../components/prices/PriceBits';
import {
  changeOf,
  DEFAULT_RANGE_DAYS,
  defaultPack,
  fmtPct,
  fmtRupees,
  fmtSigned,
  isDay,
  longDay,
  orderPacks,
  orderRateCommodities,
  plural,
  type Point,
  rangeEnding,
  rangeProblem,
  tally,
} from '../../components/prices/priceFormat';
import { exportRateRange } from '../../components/prices/pricesExcel';
import { RangeBar } from '../../components/prices/RangeBar';
import { RangeStatsTable } from '../../components/prices/RangeStatsTable';
import { RateSheetDialog } from '../../components/prices/SheetDialogs';
import { SeriesToggles, TrendChart } from '../../components/prices/TrendChart';
import { useTrendSeries } from '../../components/prices/useTrendSeries';
import { fmtMoney, todayISO } from '../../utils';

const P = EXIM_PERMISSIONS;

/** Five commodities to a pack: every line is drawn until the reader chooses. */
const everyCommodity = (names: string[]) => names;

export default function JivoRatesPage() {
  const { hasPermission } = usePermission();
  const canSave = hasPermission(P.RATE_ADD);
  const canFetch = canSave || hasPermission(P.RATE_FETCH);
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
  const packParam = params.get('pack');

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

  // --- the day ----------------------------------------------------------------

  const day = useRateDay(asked ?? undefined);
  const dayPending = day.isLoading || day.isPlaceholderData;
  const shown = dayPending ? null : (day.data?.date ?? null);

  const matrix = useMemo(() => {
    const rates = day.data?.rates ?? [];
    return {
      packs: orderPacks(day.data?.packs ?? rates.map((r) => r.pack_type)),
      commodities: orderRateCommodities(day.data?.commodities ?? rates.map((r) => r.commodity)),
      cells: new Map(
        rates.map((r) => [
          `${r.pack_type}|${r.commodity}`,
          { rate: r.rate, change: changeOf(r.rate, r.previous) },
        ]),
      ),
      rates,
    };
  }, [day.data]);

  const changes = [...matrix.cells.values()].map((cell) => cell.change);
  const counts = tally(changes);
  const compared = !!day.data?.previous_date;
  // Packs run from a pouch to a 15 kg tin, so the biggest move is the biggest share.
  const biggest = matrix.rates
    .map((r) => ({ r, change: matrix.cells.get(`${r.pack_type}|${r.commodity}`)?.change ?? null }))
    .filter((line) => line.change && line.change.direction !== 'same')
    .sort((a, b) => Math.abs(b.change?.pct ?? 0) - Math.abs(a.change?.pct ?? 0))[0];

  // --- the range --------------------------------------------------------------

  const problem = rangeProblem(from, to);
  const range = useRateRange(from, to, !problem);
  const rangeRows = useMemo(() => (problem ? [] : (range.data?.rows ?? [])), [problem, range.data]);

  const packChoices = useMemo(() => {
    const names = [...rangeRows.map((r) => r.pack_type), ...matrix.packs];
    if (packParam) names.push(packParam);
    return orderPacks(names);
  }, [rangeRows, matrix.packs, packParam]);
  const pack = packParam ?? defaultPack(packChoices) ?? '';

  // Across every pack, so a commodity keeps its colour when the pack changes.
  const commodities = useMemo(
    () => orderRateCommodities(rangeRows.map((r) => r.commodity)),
    [rangeRows],
  );
  const packRows = useMemo(() => rangeRows.filter((r) => r.pack_type === pack), [rangeRows, pack]);
  const points = useMemo<Point[]>(
    () => packRows.map((r) => ({ date: r.date, key: r.commodity, value: r.rate })),
    [packRows],
  );
  const trend = useTrendSeries(commodities, points, everyCommodity);
  const daysHeld = trend.rows.length;
  const rangeError = range.isError ? getErrorMessage(range.error, 'Try again in a moment.') : null;
  const rangeLoading = !problem && range.isLoading;
  const dim = range.isPlaceholderData || (range.isFetching && !range.isLoading);
  const rangeActive = (fromParam || toParam ? 1 : 0) + (packParam ? 1 : 0);

  function download() {
    exportRateRange({
      rows: rangeRows,
      from,
      to,
      pack,
      packs: packChoices,
      commodities,
      stats: trend.stats,
    });
    toast.success('Jivo rates downloaded');
  }

  const columns = 1 + Math.max(matrix.commodities.length, 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Jivo Rates" icon={Tags} accent="teal">
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
        noun="rates"
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
          sub="rates dearer than the day before"
          icon={TrendingUp}
          accent="rose"
        />
        <StatTile
          label="Fell"
          value={compared ? counts.down : '—'}
          sub="rates cheaper than the day before"
          icon={TrendingDown}
          accent="emerald"
        />
        <StatTile
          label="Unchanged"
          value={compared ? counts.same : '—'}
          sub={
            counts.fresh && compared
              ? `${counts.fresh} new, not quoted the day before`
              : `of ${plural(matrix.cells.size, 'rate')}`
          }
          icon={Minus}
        />
        <StatTile
          label="Biggest move"
          value={biggest ? `${biggest.r.pack_type} · ${biggest.r.commodity}` : '—'}
          sub={
            biggest?.change
              ? `${fmtPct(biggest.change.pct)} · ${fmtSigned(biggest.change.amount)} ₹ a pack`
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
                {` · ${plural(matrix.packs.length, 'pack')}, ${plural(matrix.cells.size, 'rate')} · ₹ a pack`}
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
              <Th>Pack</Th>
              {matrix.commodities.map((c) => (
                <Th key={c} align="right">
                  {c}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {day.isLoading ? (
              <TableLoading colSpan={columns} message="Reading the rates…" />
            ) : day.isError ? (
              <TableEmpty
                colSpan={columns}
                icon={AlertTriangle}
                message="The rates could not be read"
                hint={getErrorMessage(day.error, 'Try again in a moment.')}
              />
            ) : matrix.packs.length === 0 ? (
              <TableEmpty
                colSpan={columns}
                icon={Tags}
                message={asked ? `No rates on or before ${longDay(asked)}` : 'No rates saved yet'}
                hint={
                  canSave
                    ? 'Fetch from the sheet to save today’s.'
                    : 'The sheet is read every night; the first night’s rates appear here.'
                }
              />
            ) : (
              matrix.packs.map((p) => (
                <tr key={p} className={ROW_CLASSES}>
                  <Td className="whitespace-nowrap font-medium">{p}</Td>
                  {matrix.commodities.map((c) => {
                    const cell = matrix.cells.get(`${p}|${c}`);
                    return (
                      <Td key={c} numeric className="whitespace-nowrap">
                        {cell ? (
                          <>
                            <span className="block font-semibold">{fmtMoney(cell.rate)}</span>
                            <ChangeMark
                              change={cell.change}
                              empty="new"
                              emptyTitle="Not quoted the day before"
                            />
                          </>
                        ) : (
                          <span className="text-muted-foreground" title="Not quoted this day">
                            —
                          </span>
                        )}
                      </Td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <PageSection
        title="Trends"
        description={`${pack || 'A pack'}’s rate (₹ a pack) over a range, a line per commodity. Switch a commodity on or off above the chart; the table under it lists every one.`}
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
            rangeActive ? () => writeParams({ from: null, to: null, pack: null }) : undefined
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
          <FilterField label="Pack" htmlFor={`${baseId}-pack`} className="sm:w-48">
            <NativeSelect
              id={`${baseId}-pack`}
              value={pack}
              onChange={(event) => {
                const value = event.target.value;
                writeParams({ pack: value === defaultPack(packChoices) ? null : value });
              }}
              disabled={packChoices.length === 0}
            >
              {packChoices.length === 0 && <SelectOption value="">No packs</SelectOption>}
              {packChoices.map((p) => (
                <SelectOption key={p} value={p}>
                  {p}
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
              No rates {pack ? `for ${pack} ` : ''}were saved between {longDay(from)} and{' '}
              {longDay(to)}.
            </p>
          ) : trend.drawn.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Switch a commodity on to draw its line.
            </p>
          ) : (
            <TrendChart rows={trend.rows} series={trend.drawn} format={fmtRupees} dim={dim} />
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
          emptyMessage={problem ?? 'No rates in this range'}
          emptyHint={problem ? undefined : 'Try a longer range.'}
          summary={
            <span>
              <span className="font-semibold text-foreground">{pack || 'No pack'}, ₹ a pack</span>
              {` · ${longDay(from)} to ${longDay(to)}`}
              {daysHeld ? ` · ${plural(daysHeld, 'day')} with rates` : ''}
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
            summary={`${pack}, ₹ a pack, the commodities drawn, newest first`}
          />
        )}
      </PageSection>

      {canFetch && (
        <RateSheetDialog
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
