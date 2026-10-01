import { AlertTriangle, BarChart3, IndianRupee, Zap } from 'lucide-react';
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

import { localISODate } from '../../utils/month';
import { useElectricityBoard } from '../api';

/**
 * One colour per meter, in a fixed order by size: the seven biggest get their
 * own, the rest are "Others". Never cycled, so no two meters share a colour.
 */
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7'];
const OTHERS = ACCENTS.slate.hex;

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  fontSize: 12,
} as const;

const num = (value: string | null | undefined) => (value == null ? 0 : Number(value));
const units = (value: number) => Math.round(value).toLocaleString('en-IN');
const money = (value: number) =>
  `₹${Math.round(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/**
 * Local today. Not `toISOString()`, which is UTC: from midnight to 05:30 IST it
 * names yesterday, and on the 1st that put To on the 30th behind a From on the
 * 1st — a backwards range on exactly the morning somebody wants last month.
 */
function todayISO() {
  return localISODate(new Date());
}

function firstOfMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Day-of-month tick — the axis is one month at a time, so the year is noise. */
function dayTick(date: string) {
  return date.slice(8);
}

/**
 * Electricity from Daily Electricity++: what each company used, meter by
 * meter and day by day — the same figures Admin Control, the expense wall and
 * the company matrix show. A meter two companies draw on is at the share
 * Electricity++ gives the company, and a main is never added to its sub-meters.
 */
export default function ElectricityDashboardPage() {
  // Daily Electricity++ is a Maintenance page, rolled out for Jivo Oil, so the
  // link to it is offered only where it opens.
  const { currentCompany } = useAuth();
  const canOpenRegister = currentCompany?.company_code === COMPANY_CODES.JIVO_OIL;

  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [companyFilter, setCompanyFilter] = useState<CompanyCode | ''>(
    COMPANY_CODES.JIVO_BEVERAGES,
  );
  const [meterFilter, setMeterFilter] = useState('');

  const { data: board, isLoading } = useElectricityBoard({
    date_from: dateFrom,
    date_to: dateTo,
    company: companyFilter,
  });

  const allMeters = useMemo(() => board?.meters ?? [], [board]);
  const meters = useMemo(
    () => (meterFilter ? allMeters.filter((m) => m.name === meterFilter) : allMeters),
    [allMeters, meterFilter],
  );
  const total = useMemo(
    () => ({
      units: meters.reduce((sum, m) => sum + num(m.units), 0),
      cost: meters.reduce((sum, m) => sum + num(m.cost), 0),
    }),
    [meters],
  );

  const named = meters.slice(0, SERIES.length);
  const colourOf = useMemo(() => {
    const map = new Map<string, string>();
    named.forEach((m, i) => map.set(m.name, SERIES[i]));
    return map;
  }, [named]);
  const pie = useMemo(() => {
    const rows = named.map((m) => ({ name: m.name, value: num(m.units), cost: num(m.cost) }));
    const rest = meters.slice(SERIES.length);
    if (rest.length) {
      rows.push({
        name: 'Others',
        value: rest.reduce((s, m) => s + num(m.units), 0),
        cost: rest.reduce((s, m) => s + num(m.cost), 0),
      });
    }
    return rows;
  }, [named, meters]);

  // Three named lines and one "Others" keeps the trend readable; the table
  // below carries every meter.
  const topNames = useMemo(() => meters.slice(0, 3).map((m) => m.name), [meters]);
  const shown = useMemo(() => new Set(meters.map((m) => m.name)), [meters]);
  const trend = useMemo(
    () =>
      (board?.days ?? []).map((day) => {
        const point: Record<string, number | string> = { date: day.date };
        let others = 0;
        for (const [name, value] of Object.entries(day.by_meter)) {
          if (!shown.has(name)) continue;
          if (topNames.includes(name)) point[name] = num(value);
          else others += num(value);
        }
        if (meters.length > topNames.length) point.Others = others;
        return point;
      }),
    [board, shown, topNames, meters.length],
  );
  const days = board?.days_with_units ?? 0;
  const warnings = board?.warnings ?? [];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Electricity Dashboard">
        {canOpenRegister && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/maintenance/daily-electricity-plus">
              <Zap className="h-4 w-4" />
              Daily Electricity++
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
              onChange={(e) => {
                setCompanyFilter(e.target.value as CompanyCode | '');
                setMeterFilter('');
              }}
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
              {allMeters.map((meter) => (
                <SelectOption key={meter.name} value={meter.name}>
                  {meter.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiStat
          icon={Zap}
          label="Units"
          value={units(total.units)}
          sub={`${days} day${days === 1 ? '' : 's'}`}
          accent={ACCENTS.blue}
        />
        <KpiStat
          icon={IndianRupee}
          label="Cost"
          value={money(total.cost)}
          accent={ACCENTS.emerald}
          delayMs={60}
        />
        <KpiStat
          icon={BarChart3}
          label="Avg daily load"
          value={units(days ? total.units / days : 0)}
          sub="Units a day"
          accent={ACCENTS.violet}
          delayMs={120}
        />
      </div>

      {warnings.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
              {warnings.length} reading {warnings.length === 1 ? 'problem' : 'problems'} in
              Electricity++
            </p>
            <ul className="list-disc space-y-1 pl-6 text-xs text-muted-foreground">
              {warnings.slice(0, 5).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
              {warnings.length > 5 && <li>…and {warnings.length - 5} more.</li>}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Units and cost by meter</CardTitle>
          </CardHeader>
          <CardContent>
            {meters.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {isLoading ? 'Loading…' : 'No electricity in this range.'}
              </p>
            ) : (
              <>
                <div className="h-[200px]" role="img" aria-label="Units by meter">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {pie.map((row) => (
                          <Cell
                            key={row.name}
                            fill={colourOf.get(row.name) ?? OTHERS}
                            stroke="none"
                          />
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
                <ul className="mt-3 space-y-1.5">
                  {pie.map((row) => (
                    <li key={row.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: colourOf.get(row.name) ?? OTHERS }}
                      />
                      <span className="min-w-0 flex-1 truncate" title={row.name}>
                        {row.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {total.units ? ((row.value / total.units) * 100).toFixed(0) : 0}%
                      </span>
                      <span className="w-20 shrink-0 text-right tabular-nums">
                        {units(row.value)}
                      </span>
                      <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                        {money(row.cost)}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 border-t pt-2 text-xs font-medium">
                    <span className="h-2.5 w-2.5 shrink-0" />
                    <span className="min-w-0 flex-1">Total</span>
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {units(total.units)}
                    </span>
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {money(total.cost)}
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
                {isLoading ? 'Loading…' : 'No electricity in this range.'}
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
                        isAnimationActive={false}
                      />
                    ))}
                    {meters.length > topNames.length && (
                      <Line
                        type="monotone"
                        dataKey="Others"
                        name="Others"
                        stroke={OTHERS}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        isAnimationActive={false}
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
          <CardTitle className="text-base">Meter detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {meters.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {isLoading ? 'Loading…' : 'No electricity in this range.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Meter</th>
                    <th className="px-3 py-2 text-right font-medium">Share of meter</th>
                    <th className="px-3 py-2 text-right font-medium">Rate</th>
                    <th className="px-3 py-2 text-right font-medium">Units</th>
                    <th className="px-3 py-2 text-right font-medium">Cost</th>
                    <th className="px-3 py-2 text-right font-medium">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {meters.map((row) => (
                    <tr key={row.name} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ background: colourOf.get(row.name) ?? OTHERS }}
                          />
                          {row.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.share_pct == null ? 'All' : `${Number(row.share_pct).toFixed(0)}%`}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.rate == null ? '—' : num(row.rate).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{units(num(row.units))}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(num(row.cost))}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
