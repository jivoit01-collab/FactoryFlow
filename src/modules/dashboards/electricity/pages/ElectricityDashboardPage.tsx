import {
  AlertTriangle,
  BarChart3,
  IndianRupee,
  Info,
  Plug,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  COMPANY_CODE_LIST,
  COMPANY_CODES,
  COMPANY_LABELS,
  type CompanyCode,
} from '@/config/constants';
import { useAuth } from '@/core/auth';
import { useDailyElectricityReadings, useElectricityMeters } from '@/modules/maintenance/api';
import { ACCENTS, DashboardHeader, KpiStat } from '@/shared/components/dashboard';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import {
  apportionToCompany,
  companyShare,
  dailySeries,
  findAnomalies,
  type FindingLevel,
  reconcileSupply,
  rollupByMeter,
  splitBySupply,
} from '../utils/electricityAnalytics';

/** One colour per meter, cycled — the same meter keeps its colour everywhere. */
const SERIES = [
  ACCENTS.emerald.hex,
  ACCENTS.orange.hex,
  ACCENTS.blue.hex,
  ACCENTS.amber.hex,
  ACCENTS.violet.hex,
  ACCENTS.pink.hex,
  ACCENTS.teal.hex,
  ACCENTS.rose.hex,
];

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  fontSize: 12,
} as const;

const units = (value: number) => Math.round(value).toLocaleString('en-IN');
const money = (value: number) =>
  `₹${Math.round(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Day-of-month tick — the axis is one month at a time, so the year is noise. */
function dayTick(date: string) {
  return date.slice(8);
}

const FINDING_STYLE: Record<FindingLevel, { badge: string; icon: typeof AlertTriangle }> = {
  critical: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    icon: TriangleAlert,
  },
  warning: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    icon: AlertTriangle,
  },
  info: { badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', icon: Info },
};

/**
 * Reads the daily electricity register back as a board: where the units went,
 * what they cost, and what is wrong with the readings themselves. Nothing is
 * entered here — the register at /maintenance/daily-electricity stays the only
 * place a reading is keyed.
 */
export default function ElectricityDashboardPage() {
  // The register itself is a Maintenance page, and Maintenance is rolled out
  // for Jivo Oil alone — so the link to it is offered only where it opens.
  const { currentCompany } = useAuth();
  const canOpenRegister = currentCompany?.company_code === COMPANY_CODES.JIVO_OIL;

  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  // Opens on Beverages: it is the plant this board was asked for, and "all
  // companies" mixes its meters with Oil's own before anybody has chosen.
  const [companyFilter, setCompanyFilter] = useState<CompanyCode | ''>(
    COMPANY_CODES.JIVO_BEVERAGES,
  );
  const [meterFilter, setMeterFilter] = useState('');

  const { data: meters = [], isLoading: metersLoading } = useElectricityMeters();
  const { data: readings = [], isLoading } = useDailyElectricityReadings({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    meter: meterFilter ? Number(meterFilter) : undefined,
    company: companyFilter || undefined,
  });

  // The picker offers the chosen company's meters only — a shared meter counts
  // for each company it feeds, and an untagged one belongs to none of them, the
  // same rule the readings query applies on the server.
  const pickableMeters = useMemo(
    () => (companyFilter ? meters.filter((m) => m.company_codes.includes(companyFilter)) : meters),
    [meters, companyFilter],
  );

  /** Switching company drops a meter that the new one does not feed. */
  const onSelectCompany = (code: CompanyCode | '') => {
    setCompanyFilter(code);
    const stillOffered =
      !meterFilter ||
      !code ||
      meters.some((m) => m.id === Number(meterFilter) && m.company_codes.includes(code));
    if (!stillOffered) setMeterFilter('');
  };

  const window = useMemo(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo]);

  // Under a company, a meter feeding two plants shows that company's half.
  // The raw rows stay in hand for the data-quality panel, which reads dials.
  const attributed = useMemo(
    () => apportionToCompany(readings, meters, companyFilter),
    [readings, meters, companyFilter],
  );
  const sharedMeters = useMemo(
    () =>
      companyFilter
        ? meters.filter((m) => companyShare(m, companyFilter) < 1).map((m) => m.id)
        : [],
    [meters, companyFilter],
  );
  const isShared = (meterId: number) => sharedMeters.includes(meterId);

  const split = useMemo(() => splitBySupply(attributed), [attributed]);
  const rollups = useMemo(
    () => rollupByMeter(attributed, meters, window),
    [attributed, meters, window],
  );
  const subRollups = useMemo(() => rollups.filter((r) => !r.isMain), [rollups]);
  const findings = useMemo(
    () => findAnomalies(readings, meters, window),
    [readings, meters, window],
  );
  const reconciliation = useMemo(() => reconcileSupply(split.supplyTotal, split.subTotal), [split]);

  const colourOf = useMemo(() => {
    const map = new Map<string, string>();
    subRollups.forEach((r, i) => map.set(r.name, SERIES[i % SERIES.length]));
    return map;
  }, [subRollups]);

  // Three named lines and one "Others" keeps the trend readable on a plant with
  // nineteen meters; the table below carries every one of them.
  const topNames = useMemo(() => subRollups.slice(0, 3).map((r) => r.name), [subRollups]);
  const trend = useMemo(() => dailySeries(split.subs, topNames), [split.subs, topNames]);
  const hasOthers = subRollups.length > topNames.length;

  const daysWithReadings = new Set(readings.map((r) => r.date)).size;
  const expectedReadings = rollups.reduce((total, r) => total + r.due, 0);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Electricity Dashboard"
        description="Where the plant's units went, what they cost, and what the daily round got wrong."
      >
        {canOpenRegister && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/maintenance/daily-electricity">
              <Zap className="h-4 w-4" />
              Daily register
            </Link>
          </Button>
        )}
      </DashboardHeader>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="min-w-[150px]">
            <Label htmlFor="elec-dash-from">From</Label>
            <Input
              id="elec-dash-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="min-w-[150px]">
            <Label htmlFor="elec-dash-to">To</Label>
            <Input
              id="elec-dash-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="min-w-[180px]">
            <Label htmlFor="elec-dash-company">Company</Label>
            <NativeSelect
              id="elec-dash-company"
              value={companyFilter}
              onChange={(e) => onSelectCompany(e.target.value as CompanyCode | '')}
            >
              <SelectOption value="">All companies</SelectOption>
              {COMPANY_CODE_LIST.map((code) => (
                <SelectOption key={code} value={code}>
                  {COMPANY_LABELS[code]}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="min-w-[200px]">
            <Label htmlFor="elec-dash-meter">Meter</Label>
            <NativeSelect
              id="elec-dash-meter"
              value={meterFilter}
              onChange={(e) => setMeterFilter(e.target.value)}
            >
              <SelectOption value="">All meters</SelectOption>
              {pickableMeters.map((meter) => (
                <SelectOption key={meter.id} value={String(meter.id)}>
                  {meter.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <p className="ml-auto max-w-sm text-xs text-muted-foreground">
            {companyFilter
              ? 'A meter feeding two plants is counted at half here — nothing in the register says how its load divides, so each company carries an equal share.'
              : 'Every meter at its full reading. Pick a company to see its share of the ones two plants share.'}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <KpiStat
          icon={Zap}
          label="Sub-meter units"
          value={units(split.subTotal.units)}
          sub={
            sharedMeters.length
              ? `${daysWithReadings} day${daysWithReadings === 1 ? '' : 's'} · shared meters at 50%`
              : `${daysWithReadings} day${daysWithReadings === 1 ? '' : 's'} with readings`
          }
          accent={ACCENTS.blue}
          delayMs={0}
        />
        <KpiStat
          icon={IndianRupee}
          label="Sub-meter cost"
          value={money(split.subTotal.cost)}
          sub={
            sharedMeters.length
              ? 'This company\u2019s share, as keyed'
              : 'Priced as keyed on each row'
          }
          accent={ACCENTS.emerald}
          delayMs={60}
        />
        <KpiStat
          icon={BarChart3}
          label="Avg daily load"
          value={units(daysWithReadings ? split.subTotal.units / daysWithReadings : 0)}
          sub="Units per day with a reading"
          accent={ACCENTS.violet}
          delayMs={120}
        />
        <KpiStat
          icon={Plug}
          label="Incoming supply"
          value={split.mains.length ? units(split.supplyTotal.units) : '—'}
          sub={
            split.mains.length
              ? split.supplyGroups
                  .filter((g) => g.counts)
                  .map((g) => g.label)
                  .join(' · ') || 'No counted main'
              : 'No main meter in range'
          }
          accent={ACCENTS.amber}
          delayMs={180}
        />
        <KpiStat
          icon={AlertTriangle}
          label="Readings logged"
          value={`${readings.length} / ${expectedReadings}`}
          sub={
            expectedReadings > readings.length
              ? `${expectedReadings - readings.length} day-meters not keyed`
              : 'Every due day keyed'
          }
          accent={expectedReadings > readings.length ? ACCENTS.orange : ACCENTS.teal}
          delayMs={240}
        />
      </div>

      {reconciliation.overDrawn && (
        <Card className="border-rose-300/70 dark:border-rose-500/40">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <TriangleAlert className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              The sub-meters add up to <strong>{units(reconciliation.gap)} units more</strong> than
              the mains brought in ({reconciliation.gapPct.toFixed(1)}% over). A slice cannot exceed
              the supply — check the multiplying factors and the duplicate readings listed below.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Units and cost by meter</CardTitle>
          </CardHeader>
          <CardContent>
            {subRollups.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No sub-meter readings in this range.
              </p>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subRollups.map((r) => ({
                          name: r.name,
                          value: Math.max(0, r.units),
                          cost: r.cost,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {subRollups.map((r) => (
                          <Cell key={r.meterId} fill={colourOf.get(r.name)} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, item) => [
                          `${units(Number(value))} units · ${money(
                            Number((item?.payload as { cost?: number } | undefined)?.cost ?? 0),
                          )}`,
                          name,
                        ]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* The legend carries the money, so the split and what it cost
                    are read in one place rather than two cards. */}
                <ul className="mt-3 space-y-1.5">
                  {subRollups.map((row) => (
                    <li key={row.meterId} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: colourOf.get(row.name) }}
                      />
                      <span className="min-w-0 flex-1 truncate" title={row.name}>
                        {row.name}
                        {isShared(row.meterId) && (
                          <span className="ml-1 text-muted-foreground">(50%)</span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {row.share.toFixed(0)}%
                      </span>
                      <span className="w-20 shrink-0 text-right tabular-nums">
                        {units(row.units)}
                      </span>
                      <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                        {money(row.cost)}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 border-t pt-2 text-xs font-medium">
                    <span className="h-2.5 w-2.5 shrink-0" />
                    <span className="min-w-0 flex-1">Total</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">100%</span>
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {units(split.subTotal.units)}
                    </span>
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {money(split.subTotal.cost)}
                    </span>
                  </li>
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Daily units</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No sub-meter readings in this range.
              </p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={dayTick}
                      fontSize={10}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      fontSize={10}
                      width={52}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value, name) => [`${units(Number(value))} units`, name]}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
                    {topNames.map((name) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        name={name}
                        stroke={colourOf.get(name)}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                    {hasOthers && (
                      <Line
                        type="monotone"
                        dataKey="Others"
                        name="Others"
                        stroke={ACCENTS.slate.hex}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data quality</CardTitle>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {isLoading ? 'Checking the readings…' : 'Nothing irregular in this range.'}
            </p>
          ) : (
            <ul className="divide-y">
              {findings.slice(0, 9).map((finding, i) => {
                const style = FINDING_STYLE[finding.level];
                const Icon = style.icon;
                return (
                  <li key={`${finding.title}-${i}`} className="flex gap-3 py-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.badge}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{finding.title}</span>
                      <span className="block text-xs text-muted-foreground">{finding.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {findings.length > 9 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {findings.length - 9} more — narrow the range or pick one meter to see the rest.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meter detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || metersLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading readings…</p>
          ) : rollups.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No readings in this range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Meter</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 text-right font-medium">MF</th>
                    <th className="px-3 py-2 text-right font-medium">Rate</th>
                    <th className="px-3 py-2 text-right font-medium">Last closing</th>
                    <th className="px-3 py-2 text-right font-medium">Units</th>
                    <th className="px-3 py-2 text-right font-medium">Cost</th>
                    <th className="px-3 py-2 text-right font-medium">Share</th>
                    <th className="px-3 py-2 text-right font-medium">Readings</th>
                  </tr>
                </thead>
                <tbody>
                  {rollups.map((row) => (
                    <tr key={row.meterId} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ background: colourOf.get(row.name) ?? ACCENTS.slate.hex }}
                          />
                          {row.name}
                          {row.isMain && (
                            <span
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              title="Main meter — incoming supply, read apart from the total"
                            >
                              Main
                            </span>
                          )}
                          {isShared(row.meterId) && (
                            <span
                              className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                              title="Feeds two plants — shown at this company's half"
                            >
                              50%
                            </span>
                          )}
                          {row.negativeDays > 0 && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                              Check
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">{row.location}</td>
                      <td className="px-3 py-2">
                        {row.companies || <span className="text-muted-foreground">Not set</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ×{parseFloat(row.multiplyingFactor)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {parseFloat(row.ratePerUnit).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.lastClosing ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{units(row.units)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(row.cost)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.isMain ? '—' : `${row.share.toFixed(1)}%`}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.readings} / {row.due}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-3 py-3 text-xs text-muted-foreground">
            MF and rate shown are the meter master's. Units and cost are the figures stored on each
            reading, which carry the factor and rate typed that day.
            {sharedMeters.length > 0 &&
              ' A meter marked 50% feeds two plants and is shown at this company\u2019s half; the register itself holds the whole figure.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
