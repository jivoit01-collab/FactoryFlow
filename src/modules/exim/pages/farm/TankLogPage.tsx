/**
 * Every lot that went into the tank farm, as it arrived. EXIM's Tank Logs.
 *
 * A line is written when a lot turns "in tank", with the lot's own figures
 * copied on — its weight in KILOGRAMS and its rate per kg — so the log still
 * reads if the lot is changed later. It records the arrival, not a tank: EXIM
 * never said which tank a lot was pumped into, and the level is dipped by
 * hand. (EXIM headed the quantity "L"; it was always kilograms.)
 */
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Eye,
  IndianRupee,
  ListOrdered,
  type LucideIcon,
  Search,
  Weight,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  type StatusTone,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import {
  cn,
  formatDateTimeShort,
  formatDateToISOString,
  formatDay,
  getErrorMessage,
} from '@/shared/utils';

import { useTankLog } from '../../api';
import type { TankLog } from '../../types';
import { fmtKg, fmtLitres, fmtMoney, fmtQty, LITRES_PER_KG, todayISO } from '../../utils';

type Period = 'all' | 'today' | '7d' | '30d' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Between dates' },
];

const KIND: Record<TankLog['kind'], { label: string; tone: StatusTone; icon: LucideIcon }> = {
  INWARD: { label: 'In', tone: 'done', icon: ArrowDownToLine },
  OUTWARD: { label: 'Out', tone: 'warn', icon: ArrowUpFromLine },
  TRANSFER: { label: 'Transfer', tone: 'info', icon: ArrowRightLeft },
};

const COLUMNS = 12;

function KindPill({ kind }: { kind: TankLog['kind'] }) {
  const copy = KIND[kind] ?? KIND.INWARD;
  return (
    <StatusPill tone={copy.tone} icon={copy.icon}>
      {copy.label}
    </StatusPill>
  );
}

/** The day `n` days before today, as `YYYY-MM-DD` in the viewer's own day. */
function daysAgo(n: number): string {
  const day = new Date();
  day.setDate(day.getDate() - n);
  return formatDateToISOString(day);
}

/** Rate × quantity, both per kilogram; null when either is missing. */
function valueOf(log: TankLog): number | null {
  if (log.rate === null || log.rate === '' || log.quantity_kg === '') return null;
  return Number(log.rate) * Number(log.quantity_kg);
}

function Detail({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn(wide && 'col-span-2')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{children}</div>
    </div>
  );
}

export default function TankLogPage() {
  const { data, isLoading, isFetching, isError, error } = useTankLog();

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewing, setViewing] = useState<TankLog | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const today = todayISO();
    const since =
      period === 'today'
        ? today
        : period === '7d'
          ? daysAgo(7)
          : period === '30d'
            ? daysAgo(30)
            : '';
    return [...(data ?? [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((log) => {
        if (term) {
          const hit = [
            log.vehicle_number,
            log.item_name,
            log.item_code,
            log.party,
            log.created_by_name,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term));
          if (!hit) return false;
        }
        const day = formatDateToISOString(new Date(log.created_at));
        if (since && day < since) return false;
        if (period === 'custom') {
          if (from && day < from) return false;
          if (to && day > to) return false;
        }
        return true;
      });
  }, [data, search, period, from, to]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  const totalKg = rows.reduce((sum, log) => sum + Number(log.quantity_kg || 0), 0);
  const totalValue = rows.reduce((sum, log) => sum + (valueOf(log) ?? 0), 0);
  const filtered = !!search.trim() || period !== 'all';

  function reset() {
    setSearch('');
    setPeriod('all');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const viewedValue = viewing ? valueOf(viewing) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tank Log"
        description="Every lot that went into the tanks, as it arrived: its weight in kilograms and its rate per kg."
        icon={ListOrdered}
        accent="teal"
      />

      <FilterBar
        onReset={filtered ? reset : undefined}
        activeCount={(search.trim() ? 1 : 0) + (period !== 'all' ? 1 : 0)}
        isFetching={isFetching && !isLoading}
      >
        <FilterField label="Search" htmlFor="log-search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="log-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Vehicle, oil, party or who"
              className="h-9 w-full pl-8 sm:w-64"
            />
          </div>
        </FilterField>
        <FilterField label="Entered" htmlFor="log-period">
          <NativeSelect
            id="log-period"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value as Period);
              setPage(1);
            }}
            className="sm:w-44"
          >
            {PERIODS.map((p) => (
              <SelectOption key={p.value} value={p.value}>
                {p.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        {period === 'custom' && (
          <>
            <FilterField label="From" htmlFor="log-from">
              <Input
                id="log-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
                className="sm:w-44"
              />
            </FilterField>
            <FilterField label="To" htmlFor="log-to">
              <Input
                id="log-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                className="sm:w-44"
              />
            </FilterField>
          </>
        )}
      </FilterBar>

      <StatTileRow>
        <StatTile
          label="Arrivals"
          value={rows.length}
          sub={filtered ? `of ${(data ?? []).length}` : 'in the log'}
          icon={ListOrdered}
          accent="teal"
        />
        <StatTile
          label="Weight"
          value={`${fmtKg(totalKg)} kg`}
          sub={`${fmtQty(totalKg / 1000)} MT · ${fmtLitres(totalKg * LITRES_PER_KG)} L`}
          icon={Weight}
        />
        <StatTile
          label="Value"
          value={`₹ ${fmtMoney(totalValue)}`}
          sub="rate × weight"
          icon={IndianRupee}
          accent="indigo"
        />
      </StatTileRow>

      <TableCard
        summary={
          <span>
            {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
            {filtered ? ` of ${(data ?? []).length}` : ''}
          </span>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th className="w-10">#</Th>
              <Th>Kind</Th>
              <Th>Entered</Th>
              <Th>Vehicle</Th>
              <Th>Oil</Th>
              <Th>Party</Th>
              <Th align="right">Rate per kg (₹)</Th>
              <Th align="right">Quantity (kg)</Th>
              <Th align="right">Value (₹)</Th>
              <Th>Arrival</Th>
              <Th>Entered by</Th>
              <Th align="right" className="w-12" aria-label="Details" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Reading the log…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The log could not be read"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : shown.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={ListOrdered}
                message={
                  filtered ? 'Nothing matches those filters' : 'Nothing has gone into the tanks yet'
                }
                hint={
                  filtered
                    ? 'Try a wider period, or Reset.'
                    : 'A line is written here when a lot is weighed into the tanks.'
                }
              />
            ) : (
              shown.map((log, index) => {
                const value = valueOf(log);
                return (
                  <tr
                    key={log.id}
                    className={cn(ROW_CLASSES, 'cursor-pointer')}
                    onClick={() => setViewing(log)}
                  >
                    <Td className="tabular-nums text-muted-foreground">
                      {(page - 1) * pageSize + index + 1}
                    </Td>
                    <Td>
                      <KindPill kind={log.kind} />
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateTimeShort(log.created_at)}</Td>
                    <Td className="whitespace-nowrap font-mono font-medium">
                      {log.vehicle_number || '—'}
                    </Td>
                    <Td className="min-w-40">{log.item_name || log.item_code || '—'}</Td>
                    <Td className="min-w-48">{log.party || '—'}</Td>
                    <Td numeric>{log.rate ? fmtMoney(log.rate) : '—'}</Td>
                    <Td numeric>{fmtKg(log.quantity_kg)}</Td>
                    <Td numeric className="font-medium">
                      {value === null ? '—' : fmtMoney(value)}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDay(log.arrival)}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {log.created_by_name || '—'}
                    </Td>
                    <Td align="right" onClick={(event) => event.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Open entry ${log.id}`}
                        onClick={() => setViewing(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {rows.length > pageSize && (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={rows.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </TableCard>

      <Dialog open={!!viewing} onOpenChange={(value) => !value && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tank log entry {viewing?.id}</DialogTitle>
            <DialogDescription>
              {viewing?.lot ? `From lot #${viewing.lot}. ` : ''}Entered{' '}
              {formatDateTimeShort(viewing?.created_at)}
              {viewing?.created_by_name ? ` by ${viewing.created_by_name}` : ''}.
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <KindPill kind={viewing.kind} />
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <Detail label="Vehicle">
                  <span className="font-mono">{viewing.vehicle_number || '—'}</span>
                </Detail>
                <Detail label="Oil">
                  {viewing.item_name || viewing.item_code || '—'}
                  {viewing.item_name && viewing.item_code && (
                    <span className="block font-mono text-xs font-normal text-muted-foreground">
                      {viewing.item_code}
                    </span>
                  )}
                </Detail>
                <Detail label="Party" wide>
                  {viewing.party || '—'}
                </Detail>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <Detail label="Rate per kg">
                  <span className="tabular-nums">
                    {viewing.rate ? `₹ ${fmtMoney(viewing.rate)}` : '—'}
                  </span>
                </Detail>
                <Detail label="Quantity">
                  <span className="tabular-nums">{fmtKg(viewing.quantity_kg)} kg</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {fmtQty(Number(viewing.quantity_kg) / 1000)} MT ·{' '}
                    {fmtLitres(Number(viewing.quantity_kg) * LITRES_PER_KG)} L
                  </span>
                </Detail>
                <Detail label="Value (rate × quantity)" wide>
                  <span className="text-base font-semibold tabular-nums">
                    {viewedValue === null ? '—' : `₹ ${fmtMoney(viewedValue)}`}
                  </span>
                </Detail>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <Detail label="Arrival">{formatDay(viewing.arrival)}</Detail>
                <Detail label="Entered by">{viewing.created_by_name || '—'}</Detail>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
