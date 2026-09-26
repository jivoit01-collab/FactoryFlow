import { AlertCircle, AlertTriangle, Download, Info, Scale } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useElectricityAllocation } from '../../api';
import type { IssueSeverity, SplitIssue, SplitMeter, SplitParty, SplitReport } from '../../types';
import {
  firstOfMonthISO,
  fmtDate,
  fmtMoney,
  fmtUnits,
  localISO,
  partyColour,
  shiftISO,
  todayISO,
  toNumber,
  UNASSIGNED_HATCH,
} from './electricityFormat';

function Swatch({ party }: { party: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-3 w-3 shrink-0 rounded-sm', partyColour(party))}
      style={party === 'unassigned' ? UNASSIGNED_HATCH : undefined}
    />
  );
}

const SEVERITY_STYLE: Record<IssueSeverity, { icon: typeof AlertCircle; className: string; label: string }> = {
  error: { icon: AlertCircle, className: 'text-red-700 dark:text-red-300', label: 'Needs fixing' },
  warning: { icon: AlertTriangle, className: 'text-amber-700 dark:text-amber-300', label: 'Check' },
  info: { icon: Info, className: 'text-muted-foreground', label: 'Note' },
};

function daysText(days: string[]): string {
  if (days.length <= 4) return days.map(fmtDate).join(', ');
  return `${fmtDate(days[0])} … ${fmtDate(days[days.length - 1])}`;
}

function downloadCsv(report: SplitReport) {
  const parties = report.parties;
  const header = ['Meter', 'Level', 'Read (units)', 'Sub-meters (units)', 'Own (units)', 'Who pays', ...parties.map((p) => `${p.name} (units)`), ...parties.map((p) => `${p.name} (Rs)`)];
  const lines = report.meters
    .filter((meter) => !meter.is_register)
    .map((meter) => {
      const share = new Map((meter.split ?? []).map((s) => [s.party, s]));
      return [
        meter.name,
        String(meter.depth),
        meter.units,
        meter.sub_metered_units ?? '',
        meter.own_units ?? '',
        meter.rule?.summary ?? 'Not placed',
        ...parties.map((p) => share.get(p.key)?.units ?? '0'),
        ...parties.map((p) => share.get(p.key)?.cost ?? '0'),
      ];
    });
  const csv = [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `electricity-split-${report.date_from}-to-${report.date_to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Who used how much, between two dates: each company's share of the campus's
 * electricity, the tree it was worked out on, and everything that kept it
 * from being exact.
 */
export function SplitTab() {
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const { data: report, isLoading } = useElectricityAllocation(dateFrom, dateTo);

  const setSpan = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };
  const now = new Date();
  const lastMonthStart = firstOfMonthISO(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = localISO(new Date(now.getFullYear(), now.getMonth(), 0));

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 shadow-sm dark:border-border">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label htmlFor="split-from">From</Label>
            <Input id="split-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="split-to">To</Label>
            <Input id="split-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={() => setSpan(firstOfMonthISO(), todayISO())}>
              This month
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSpan(lastMonthStart, lastMonthEnd)}>
              Last month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSpan(shiftISO(todayISO(), -1), shiftISO(todayISO(), -1))}
            >
              Yesterday
            </Button>
          </div>
          {report && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => downloadCsv(report)}>
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading || !report ? (
        <p className="p-6 text-center text-muted-foreground">Working out the split…</p>
      ) : (
        <SplitBody report={report} />
      )}
    </div>
  );
}

function SplitBody({ report }: { report: SplitReport }) {
  const parties = useMemo(() => new Map(report.parties.map((p) => [p.key, p])), [report]);
  const allocated = toNumber(report.totals.allocated_units);
  const supply = toNumber(report.totals.supply_units);
  const gap = allocated - supply;

  return (
    <>
      {/* ---- who pays: one tile per party ---- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {report.totals.by_party.map((row) => {
          const party = parties.get(row.party);
          const unassigned = row.party === 'unassigned';
          return (
            <Card key={row.party} className={cn('shadow-sm', unassigned && 'border-amber-300 dark:border-amber-900')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Swatch party={row.party} />
                  {unassigned && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />}
                  {party?.name ?? row.party}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{fmtMoney(row.cost)}</div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  {fmtUnits(row.units)} units{row.share_pct ? ` · ${row.share_pct}%` : ''}
                </div>
                {unassigned && (
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">Nobody is set to pay for these yet.</div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {report.totals.by_party.length === 0 && (
          <Card className="shadow-sm sm:col-span-2 lg:col-span-4">
            <CardContent className="p-4 text-sm text-muted-foreground">No meter was read in this span.</CardContent>
          </Card>
        )}
      </div>

      {/* ---- the share bar: the same split, as parts of the whole ---- */}
      {allocated > 0 && (
        <Card className="shadow-sm">
          <CardContent className="space-y-2 p-4">
            <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label="Share of the electricity by who pays">
              {report.totals.by_party.map((row) => {
                const share = (toNumber(row.units) / allocated) * 100;
                if (share <= 0) return null;
                const name = parties.get(row.party)?.name ?? row.party;
                return (
                  <div
                    key={row.party}
                    className={cn('h-full first:rounded-l last:rounded-r', partyColour(row.party))}
                    style={{ width: `${share}%`, ...(row.party === 'unassigned' ? UNASSIGNED_HATCH : {}) }}
                    title={`${name}: ${fmtUnits(row.units)} units · ${fmtMoney(row.cost)} · ${row.share_pct ?? '0'}%`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {report.totals.by_party.map((row) => (
                <span key={row.party} className="flex items-center gap-1.5">
                  <Swatch party={row.party} />
                  {parties.get(row.party)?.name ?? row.party} {row.share_pct ?? '0'}%
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- does it add up ---- */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
          <Scale className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {supply === 0 ? (
            <span className="text-muted-foreground">No main meter was read in this span, so there is no supply to check the split against.</span>
          ) : Math.abs(gap) < 0.5 ? (
            <span>
              The mains read <strong>{fmtUnits(supply)}</strong> units ({fmtMoney(report.totals.supply_cost)}), and every
              one of them is in the split above.
            </span>
          ) : (
            <span>
              The mains read <strong>{fmtUnits(supply)}</strong> units ({fmtMoney(report.totals.supply_cost)}); the split
              holds <strong>{fmtUnits(allocated)}</strong> — {fmtUnits(Math.abs(gap))} {gap > 0 ? 'more' : 'fewer'}.{' '}
              {gap > 0
                ? `Sub-meters read ${fmtUnits(report.totals.over_read_units)} units more than their parents, or a main was not read on a day its sub-meters were.`
                : 'A main meter went unread on some days, so its own load on those days is in nobody’s share.'}{' '}
              The problems below say where.
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {report.entered_days} of {report.days} days entered
          </span>
        </CardContent>
      </Card>

      <IssuesPanel issues={report.issues} />
      <SplitTreeTable report={report} parties={report.parties} />
      <DailyTable report={report} />
    </>
  );
}

function IssuesPanel({ issues }: { issues: SplitIssue[] }) {
  const [showAll, setShowAll] = useState(false);
  if (issues.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4 text-sm text-muted-foreground">Nothing in this span needs looking at.</CardContent>
      </Card>
    );
  }
  const serious = issues.filter((issue) => issue.severity !== 'info');
  const shown = showAll ? issues : serious.slice(0, 8);
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">What kept the split from being exact</p>
          {(issues.length > shown.length || showAll) && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'Show fewer' : `Show all ${issues.length}`}
            </Button>
          )}
        </div>
        <ul className="space-y-1.5">
          {shown.map((issue, index) => {
            const style = SEVERITY_STYLE[issue.severity];
            const Icon = style.icon;
            return (
              <li key={`${issue.kind}-${issue.meter_id}-${index}`} className="flex gap-2 text-sm">
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.className)} aria-label={style.label} />
                <span>
                  {issue.message}
                  {issue.days.length > 0 && (
                    <span className="text-muted-foreground"> ({daysText(issue.days)})</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function SplitTreeTable({ report, parties }: { report: SplitReport; parties: SplitParty[] }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <div className="border-b bg-muted/30 px-4 py-3">
          <p className="text-sm font-medium">Meter by meter</p>
          <p className="text-xs text-muted-foreground">
            Each meter's own units are what it read less what its sub-meters read; that is what its rule divides.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Meter</th>
                <th className="px-3 py-2 text-right font-medium">Read</th>
                <th className="px-3 py-2 text-right font-medium">Sub-meters</th>
                <th className="px-3 py-2 text-right font-medium">Own</th>
                <th className="px-3 py-2 font-medium">Who pays</th>
                {parties.map((party) => (
                  <th key={party.key} className="px-3 py-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <Swatch party={party.key} />
                      {party.name}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Days read</th>
              </tr>
            </thead>
            <tbody>
              {report.meters.map((meter) => (
                <MeterRow key={`${meter.id}-${meter.is_register}`} meter={meter} parties={parties} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MeterRow({ meter, parties }: { meter: SplitMeter; parties: SplitParty[] }) {
  const share = new Map((meter.split ?? []).map((s) => [s.party, s]));
  const indent = { paddingLeft: `${meter.depth * 1.25 + 0.75}rem` };
  if (meter.is_register) {
    return (
      <tr className="border-b border-slate-100 bg-muted/20 text-muted-foreground dark:border-border/60">
        <td className="py-2 pr-3" style={indent}>
          <span>↳ </span>
          {meter.name}
          <div className="text-xs">Second register of {meter.register_of_name} — never counted</div>
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{fmtUnits(meter.units)}</td>
        <td className="px-3 py-2" colSpan={3 + parties.length}>
          {meter.ratio ? `${meter.register_of_name} ÷ ${meter.name} = ${meter.ratio}` : '—'}
        </td>
        <td className="px-3 py-2 text-right">{meter.days_read}</td>
      </tr>
    );
  }
  const hasSubMeters = meter.children.length > 0;
  const overRead = toNumber(meter.over_read_units) > 0;
  const drivers = meter.drivers ?? [];
  return (
    <tr className="border-b border-slate-100 align-top last:border-0 dark:border-border/60">
      <td className="py-2 pr-3" style={indent}>
        <div className="font-medium">
          {meter.depth > 0 && <span className="text-muted-foreground">└ </span>}
          {meter.name}
        </div>
        {meter.unplaced && <div className="text-xs text-red-700 dark:text-red-300">Not placed in the tree</div>}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{fmtUnits(meter.units)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
        {hasSubMeters ? fmtUnits(meter.sub_metered_units) : '—'}
      </td>
      <td className="px-3 py-2 text-right font-medium tabular-nums">
        {fmtUnits(meter.own_units)}
        {overRead && (
          <div className="text-xs font-normal text-red-700 dark:text-red-300">
            sub-meters over by {fmtUnits(meter.over_read_units)}
          </div>
        )}
      </td>
      <td className="max-w-[280px] px-3 py-2 text-xs">
        <div className={cn(meter.rule?.basis === 'UNASSIGNED' && 'text-amber-700 dark:text-amber-300')}>
          {meter.rule?.summary ?? 'Nobody'}
          {meter.rule_changed_in_span && ' (changed during the span)'}
        </div>
        {drivers.length > 0 && (
          <div className="text-muted-foreground">
            {drivers
              .map(
                (driver) =>
                  `${parties.find((p) => p.key === driver.party)?.name ?? driver.party} ${driver.amount}${
                    meter.rule?.basis === 'RUN_HOURS' ? ' h' : ' units'
                  }`,
              )
              .join(' · ')}
          </div>
        )}
        {(meter.fallback_days ?? 0) > 0 && (
          <div className="text-muted-foreground">fixed split used on {meter.fallback_days} day(s)</div>
        )}
      </td>
      {parties.map((party) => {
        const cell = share.get(party.key);
        return (
          <td key={party.key} className="px-3 py-2 text-right tabular-nums">
            {cell ? (
              <>
                {fmtUnits(cell.units)}
                <div className="text-xs text-muted-foreground">
                  {fmtMoney(cell.cost)}
                  {cell.share_pct && cell.share_pct !== '100.0' ? ` · ${cell.share_pct}%` : ''}
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </td>
        );
      })}
      <td
        className={cn(
          'px-3 py-2 text-right tabular-nums',
          (meter.days_read ?? 0) < (meter.days_in_service ?? 0) && 'text-amber-700 dark:text-amber-300',
        )}
        title={(meter.spread_days ?? 0) > 0 ? `${meter.spread_days} day(s) filled from a reading after skipped days` : undefined}
      >
        {meter.days_read}/{meter.days_in_service}
      </td>
    </tr>
  );
}

function DailyTable({ report }: { report: SplitReport }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between border-b bg-muted/30 px-4 py-3 text-left"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="text-sm font-medium">Day by day</span>
          <span className="text-xs text-muted-foreground">{open ? 'Hide' : 'Show'}</span>
        </button>
        {open && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 text-right font-medium">Mains read</th>
                  {report.parties.map((party) => (
                    <th key={party.key} className="px-3 py-2 text-right font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Swatch party={party.key} />
                        {party.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.daily.map((day) => (
                  <tr
                    key={day.date}
                    className={cn('border-b border-slate-100 last:border-0 dark:border-border/60', !day.entered && 'text-muted-foreground')}
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      {fmtDate(day.date)}
                      {!day.entered && <span className="ml-2 text-xs">not entered</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {day.supply_units == null ? '—' : fmtUnits(day.supply_units)}
                    </td>
                    {report.parties.map((party) => (
                      <td key={party.key} className="px-3 py-2 text-right tabular-nums">
                        {fmtUnits(day.by_party[party.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
