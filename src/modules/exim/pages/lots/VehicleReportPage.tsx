/**
 * The vehicle report: EXIM's, truck by truck.
 *
 * The lots in a status, grouped by the truck carrying them, the worst first:
 * the one furthest past its ETA, waiting longest at the gate, or with the
 * contract closest to its end. EXIM's four statuses are a click apart and
 * counted together in the tiles; any other status can be picked too. The
 * Excel download is EXIM's: a summary sheet, a sheet per status, and every
 * truck on one more.
 *
 * Lots with no vehicle yet (contracts, mostly) are listed one line each rather
 * than as one truck with no number.
 */
import {
  AlertTriangle,
  ChevronDown,
  FileDown,
  PackageOpen,
  RefreshCw,
  Scale,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
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
import { Button, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import { useVehicleReport } from '../../api';
import {
  LOT_STATUS_CHOICES,
  LOT_STATUS_LABEL,
  PAYMENT_STATUSES,
  PaymentMark,
} from '../../components';
import { LotLink } from '../../components/lots/LotBits';
import { contractLeft, fmtRate } from '../../components/lots/lotFormat';
import type { LotStatus, VehicleReportRow } from '../../types';
import { daysUntil, fmtQty, todayISO } from '../../utils';

type Item = VehicleReportRow['items'][number];

interface TruckRow {
  key: string;
  vehicle_number: string;
  transporter: string;
  items: Item[];
}

/** EXIM's tabs, in EXIM's order. */
const TABS: LotStatus[] = ['ON_THE_WAY', 'OUT_SIDE_FACTORY', 'UNDER_LOADING', 'IN_CONTRACT'];

const COLUMNS = 9;

function trucksOf(rows?: VehicleReportRow[]): TruckRow[] {
  const trucks: TruckRow[] = [];
  (rows ?? []).forEach((row, i) => {
    if (row.vehicle_number.trim()) {
      trucks.push({ key: `${i}`, ...row });
    } else {
      row.items.forEach((item, j) =>
        trucks.push({
          key: `${i}-${j}`,
          vehicle_number: '',
          transporter: row.transporter,
          items: [item],
        }),
      );
    }
  });
  return trucks;
}

/** The date that matters in a status: the contract's end, the day it came, or its ETA. */
function dateOf(item: Item, status: LotStatus): string | null {
  if (status === 'IN_CONTRACT') return item.contract_end;
  if (status === 'OUT_SIDE_FACTORY') return item.arrival_date;
  return item.eta;
}

function dateLabel(status: LotStatus) {
  if (status === 'IN_CONTRACT') return 'Contract ends';
  if (status === 'OUT_SIDE_FACTORY') return 'Arrived';
  return 'ETA';
}

function daysLabel(status: LotStatus) {
  if (status === 'IN_CONTRACT') return 'Contract';
  if (status === 'OUT_SIDE_FACTORY') return 'Waiting';
  return 'Due';
}

function plural(n: number, one: string) {
  return `${n} ${one}${n === 1 ? '' : 's'}`;
}

function daysText(days: number, status: LotStatus): string {
  if (status === 'IN_CONTRACT') return contractLeft(days);
  if (status === 'OUT_SIDE_FACTORY') {
    if (days < 0) return `${plural(-days, 'day')} at the gate`;
    return days === 0 ? 'Came today' : `Due in ${plural(days, 'day')}`;
  }
  if (days < 0) return `${plural(-days, 'day')} late`;
  return days === 0 ? 'Due today' : `In ${plural(days, 'day')}`;
}

/** EXIM's colours by meaning: past it, within two days, within five, comfortable. */
function daysTone(days: number): StatusTone {
  if (days < 0) return 'blocked';
  if (days <= 2) return 'warn';
  if (days <= 5) return 'info';
  return 'done';
}

function worstDays(truck: TruckRow, status: LotStatus): number | null {
  const days = truck.items
    .map((item) => daysUntil(dateOf(item, status)))
    .filter((d): d is number => d !== null);
  return days.length ? Math.min(...days) : null;
}

function sortTrucks(trucks: TruckRow[], status: LotStatus): TruckRow[] {
  return [...trucks].sort((a, b) => {
    const wa = worstDays(a, status);
    const wb = worstDays(b, status);
    if (wa === null && wb === null) return 0;
    if (wa === null) return 1;
    if (wb === null) return -1;
    return wa - wb;
  });
}

function mtOf(trucks: TruckRow[]) {
  return trucks.reduce((sum, t) => sum + t.items.reduce((s, i) => s + Number(i.mt), 0), 0);
}

function overdueOf(trucks: TruckRow[], status: LotStatus) {
  return trucks.reduce(
    (count, t) => count + t.items.filter((i) => (daysUntil(dateOf(i, status)) ?? 0) < 0).length,
    0,
  );
}

function DaysPill({ date, status }: { date: string | null; status: LotStatus }) {
  const days = daysUntil(date);
  if (days === null) return <span className="text-muted-foreground">—</span>;
  return <StatusPill tone={daysTone(days)}>{daysText(days, status)}</StatusPill>;
}

/** The lots a line sums, each opening its own page. */
function LineLots({ lots, canOpen }: { lots: number[]; canOpen: boolean }) {
  if (!lots.length) return null;
  return (
    <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
      {lots.map((id) => (
        <LotLink key={id} id={id} canOpen={canOpen} />
      ))}
    </span>
  );
}

// --- Excel --------------------------------------------------------------------

function sheetRows(status: LotStatus, rows?: VehicleReportRow[]) {
  const label = LOT_STATUS_LABEL[status];
  return sortTrucks(trucksOf(rows), status).flatMap((truck, t) =>
    truck.items.map((item, i) => {
      const date = dateOf(item, status);
      const days = daysUntil(date);
      return {
        'No.': truck.items.length > 1 ? `${t + 1}.${i + 1}` : `${t + 1}`,
        Status: label,
        Vehicle: truck.vehicle_number || '-',
        Transporter: truck.transporter || '-',
        'Vendor code': item.vendor_code || '-',
        Vendor: item.vendor_name || '-',
        'Oil code': item.item_code || '-',
        Oil: item.item_name || '-',
        'Rate (₹/kg)': item.rate ?? '',
        'Qty (L)': item.litres,
        'Qty (MT)': item.mt,
        [daysLabel(status)]: days === null ? '' : daysText(days, status),
        [dateLabel(status)]: date ? formatDay(date) : '',
        'Job work': item.job_work || '-',
        Payment: PAYMENT_STATUSES.includes(status)
          ? item.payment_status === 'PAID'
            ? 'Paid'
            : 'Unpaid'
          : '',
      };
    }),
  );
}

function appendSheet(book: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const data = rows.length ? rows : [{ Message: 'Nothing in this status' }];
  const sheet = XLSX.utils.json_to_sheet(data);
  const keys = Object.keys(data[0]);
  sheet['!cols'] = keys.map((key) => ({
    wch: Math.min(
      40,
      Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length)) + 2,
    ),
  }));
  XLSX.utils.book_append_sheet(book, sheet, name.slice(0, 31));
}

// --- the page -------------------------------------------------------------------

export default function VehicleReportPage() {
  const canOpenLot = usePermission().hasPermission(EXIM_PERMISSIONS.LOT_VIEW);
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('status') as LotStatus | null;
  const active: LotStatus = asked && asked in LOT_STATUS_LABEL ? asked : TABS[0];
  const other = TABS.includes(active) ? null : active;

  const reports: Record<string, ReturnType<typeof useVehicleReport>> = {
    ON_THE_WAY: useVehicleReport('ON_THE_WAY'),
    OUT_SIDE_FACTORY: useVehicleReport('OUT_SIDE_FACTORY'),
    UNDER_LOADING: useVehicleReport('UNDER_LOADING'),
    IN_CONTRACT: useVehicleReport('IN_CONTRACT'),
  };
  const otherReport = useVehicleReport(other ?? '');
  const current = other ? otherReport : reports[active];

  const [open, setOpen] = useState<Set<string>>(() => new Set());

  function pick(status: LotStatus) {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (status === TABS[0]) next.delete('status');
        else next.set('status', status);
        return next;
      },
      { replace: true },
    );
    setOpen(new Set());
  }

  function toggle(key: string) {
    setOpen((was) => {
      const next = new Set(was);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const tabTrucks = TABS.map((status) => ({
    status,
    trucks: trucksOf(reports[status].data),
    loading: reports[status].isLoading,
  }));
  const anyLoading = tabTrucks.some((t) => t.loading) || (!!other && otherReport.isLoading);
  const allTrucks = tabTrucks.reduce((n, t) => n + t.trucks.length, 0);
  const allMt = tabTrucks.reduce((sum, t) => sum + mtOf(t.trucks), 0);
  const overdue = tabTrucks.reduce((n, t) => n + overdueOf(t.trucks, t.status), 0);
  const busiest = tabTrucks.reduce((best, t) => (t.trucks.length > best.trucks.length ? t : best));

  const trucks = sortTrucks(trucksOf(current.data), active);
  const totalMt = mtOf(trucks);

  function download() {
    const book = XLSX.utils.book_new();
    const statuses = other ? [...TABS, other] : TABS;
    const made = new Date().toLocaleString('en-IN');
    appendSheet(
      book,
      'Summary',
      statuses.map((status) => {
        const list = trucksOf((status === other ? otherReport : reports[status]).data);
        return {
          Status: LOT_STATUS_LABEL[status],
          Trucks: list.length,
          Lines: list.reduce((n, t) => n + t.items.length, 0),
          'Qty (MT)': Number(mtOf(list).toFixed(3)),
          Overdue: overdueOf(list, status),
          'Made on': made,
        };
      }),
    );
    const every: Record<string, unknown>[] = [];
    for (const status of statuses) {
      const rows = sheetRows(status, (status === other ? otherReport : reports[status]).data);
      appendSheet(book, LOT_STATUS_LABEL[status], rows);
      every.push(...rows);
    }
    appendSheet(book, 'All vehicles', every);
    XLSX.writeFile(book, `vehicle-report-${todayISO()}.xlsx`);
    toast.success('The vehicle report is downloading');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Report"
        icon={Truck}
        accent="teal"
      >
        <Button
          variant="outline"
          onClick={() => {
            Object.values(reports).forEach((r) => r.refetch());
            if (other) otherReport.refetch();
          }}
        >
          <RefreshCw className={cn('mr-1.5 h-4 w-4', current.isFetching && 'animate-spin')} />
          Refresh
        </Button>
        <Button variant="outline" onClick={download} disabled={anyLoading}>
          <FileDown className="mr-1.5 h-4 w-4" />
          Download Excel
        </Button>
      </PageHeader>

      <StatTileRow>
        <StatTile
          label="Trucks"
          value={anyLoading ? '—' : allTrucks}
          sub="in the four statuses"
          icon={Truck}
          accent="teal"
        />
        <StatTile
          label="Quantity"
          value={anyLoading ? '—' : fmtQty(allMt)}
          sub="MT"
          icon={Scale}
          accent="indigo"
        />
        <StatTile
          label="Overdue"
          value={anyLoading ? '—' : overdue}
          sub="past the ETA, the arrival or the contract's end"
          icon={AlertTriangle}
          accent={overdue ? 'rose' : 'emerald'}
        />
        <StatTile
          label="Busiest"
          value={anyLoading ? '—' : LOT_STATUS_LABEL[busiest.status]}
          sub={anyLoading ? undefined : plural(busiest.trucks.length, 'truck')}
          icon={TrendingUp}
          accent="violet"
        />
      </StatTileRow>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-lg border bg-card p-0.5 shadow-sm">
          {tabTrucks.map((tab) => (
            <button
              key={tab.status}
              type="button"
              onClick={() => pick(tab.status)}
              aria-pressed={active === tab.status}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active === tab.status
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {LOT_STATUS_LABEL[tab.status]}
              {!tab.loading && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    active === tab.status ? 'bg-primary-foreground/20' : 'bg-muted',
                  )}
                >
                  {tab.trucks.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <NativeSelect
          aria-label="Another status"
          value={other ?? ''}
          onChange={(event) => event.target.value && pick(event.target.value as LotStatus)}
          className="w-full sm:w-56"
        >
          <SelectOption value="">Another status…</SelectOption>
          {LOT_STATUS_CHOICES.filter((s) => !TABS.includes(s)).map((s) => (
            <SelectOption key={s} value={s}>
              {LOT_STATUS_LABEL[s]}
            </SelectOption>
          ))}
        </NativeSelect>
      </div>

      <TableCard
        summary={
          <span>
            <span className="font-semibold text-foreground">{LOT_STATUS_LABEL[active]}</span>
            {current.isLoading
              ? ' · loading…'
              : ` · ${plural(trucks.length, 'truck')} · ${fmtQty(totalMt)} MT`}
          </span>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th className="w-10">#</Th>
              <Th>Vehicle</Th>
              <Th>Transporter</Th>
              <Th>Vendor</Th>
              <Th>Oil</Th>
              <Th align="right">Rate (₹/kg)</Th>
              <Th align="right">Quantity (MT)</Th>
              <Th>{daysLabel(active)}</Th>
              <Th>{dateLabel(active)}</Th>
            </tr>
          </thead>
          <tbody>
            {current.isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Loading the trucks…" />
            ) : current.isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The report could not be loaded"
                hint={getErrorMessage(current.error, 'Try Refresh in a moment.')}
              />
            ) : trucks.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={PackageOpen}
                message={`No lots ${LOT_STATUS_LABEL[active].toLowerCase()}`}
              />
            ) : (
              trucks.map((truck, index) => {
                const vehicle = truck.vehicle_number ? (
                  <span className="whitespace-nowrap rounded bg-muted px-2 py-0.5 font-mono text-sm">
                    {truck.vehicle_number}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No vehicle</span>
                );

                if (truck.items.length === 1) {
                  const item = truck.items[0];
                  const date = dateOf(item, active);
                  return (
                    <tr key={truck.key} className={ROW_CLASSES}>
                      <Td className="text-muted-foreground tabular-nums">{index + 1}</Td>
                      <Td>{vehicle}</Td>
                      <Td className="whitespace-nowrap">{truck.transporter || '—'}</Td>
                      <Td className="whitespace-nowrap">{item.vendor_name || item.vendor_code}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          {item.item_name}
                          <PaymentMark status={active} payment={item.payment_status} />
                        </span>
                        <LineLots lots={item.lots} canOpen={canOpenLot} />
                      </Td>
                      <Td numeric>{fmtRate(item.rate)}</Td>
                      <Td numeric>{fmtQty(item.mt)}</Td>
                      <Td>
                        <DaysPill date={date} status={active} />
                      </Td>
                      <Td className="whitespace-nowrap text-muted-foreground">{formatDay(date)}</Td>
                    </tr>
                  );
                }

                const expanded = open.has(truck.key);
                const worst =
                  truck.items
                    .map((item) => dateOf(item, active))
                    .filter((d): d is string => !!d)
                    .sort()[0] ?? null;
                return (
                  <Fragment key={truck.key}>
                    <tr
                      className={cn(ROW_CLASSES, 'cursor-pointer', expanded && 'bg-muted/30')}
                      onClick={() => toggle(truck.key)}
                    >
                      <Td className="text-muted-foreground tabular-nums">{index + 1}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? 'Hide' : 'Show'} the lots on ${truck.vehicle_number}`}
                            className="rounded text-muted-foreground hover:text-foreground"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggle(truck.key);
                            }}
                          >
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                expanded && 'rotate-180',
                              )}
                            />
                          </button>
                          {vehicle}
                          <StatusPill tone="neutral">{truck.items.length} lots</StatusPill>
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">{truck.transporter || '—'}</Td>
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {new Set(truck.items.map((i) => i.vendor_code)).size} vendors
                      </Td>
                      <Td className="whitespace-nowrap text-muted-foreground">Mixed</Td>
                      <Td numeric className="text-muted-foreground">
                        —
                      </Td>
                      <Td numeric className="font-medium">
                        {fmtQty(truck.items.reduce((s, i) => s + Number(i.mt), 0))}
                      </Td>
                      <Td>
                        <DaysPill date={worst} status={active} />
                      </Td>
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {formatDay(worst)}
                      </Td>
                    </tr>
                    {expanded &&
                      truck.items.map((item, i) => {
                        const date = dateOf(item, active);
                        return (
                          <tr key={`${truck.key}-${i}`} className={cn(ROW_CLASSES, 'bg-muted/20')}>
                            <Td />
                            <Td className="pl-10 font-mono text-xs text-muted-foreground">
                              {truck.vehicle_number}
                            </Td>
                            <Td className="whitespace-nowrap">{truck.transporter || '—'}</Td>
                            <Td className="whitespace-nowrap">
                              {item.vendor_name || item.vendor_code}
                            </Td>
                            <Td>
                              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                {item.item_name}
                                <PaymentMark status={active} payment={item.payment_status} />
                              </span>
                              <LineLots lots={item.lots} canOpen={canOpenLot} />
                            </Td>
                            <Td numeric>{fmtRate(item.rate)}</Td>
                            <Td numeric>{fmtQty(item.mt)}</Td>
                            <Td>
                              <DaysPill date={date} status={active} />
                            </Td>
                            <Td className="whitespace-nowrap text-muted-foreground">
                              {formatDay(date)}
                            </Td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })
            )}
          </tbody>
          {!current.isLoading && trucks.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/40 font-medium">
                <Td colSpan={6} className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total
                </Td>
                <Td numeric>{fmtQty(totalMt)}</Td>
                <Td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </TableCard>
    </div>
  );
}
