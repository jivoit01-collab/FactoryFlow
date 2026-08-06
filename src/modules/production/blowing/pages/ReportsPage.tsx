import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import { useDailyReport, useMonthlyReport, useVariances } from '../api';
import type { DailyReportTotals, VarianceCell } from '../types';

const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined ? '-' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d });

function TotalsGrid({ totals }: { totals: DailyReportTotals }) {
  const items: Array<[string, number, number]> = [
    ['Runs', totals.run_count, 0],
    ['Production (pcs)', totals.total_production, 0],
    ['Rejection (pcs)', totals.total_rejection, 0],
    ['Preform used (g)', totals.total_preform_g, 0],
    ['Total units', totals.total_units, 2],
    ['Electricity (₹)', totals.electricity_cost, 2],
    ['Labour (₹)', totals.labour_cost, 2],
    ['Wastage (₹)', totals.wastage_cost, 2],
    ['Total cost (₹)', totals.total_cost, 2],
    ['Net cost (₹)', totals.net_cost, 2],
    ['Avg ₹/bottle', totals.avg_per_bottle_cost, 4],
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map(([label, val, d]) => (
        <Card key={label}>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold">{fmt(val, d)}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function DailyTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useDailyReport(date);
  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label htmlFor="d-date">Date</Label>
        <Input id="d-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <TotalsGrid totals={data.totals} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>By machine</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Machine</th><th className="py-2 pr-4 text-right">Production</th>
                    <th className="py-2 pr-4 text-right">Rejection</th><th className="py-2 pr-4 text-right">Net cost</th>
                  </tr></thead>
                  <tbody>
                    {data.by_machine.map((m) => (
                      <tr key={m.machine_id} className="border-b">
                        <td className="py-2 pr-4">{m.machine_name}</td>
                        <td className="py-2 pr-4 text-right">{fmt(m.total_production, 0)}</td>
                        <td className="py-2 pr-4 text-right">{fmt(m.total_rejection, 0)}</td>
                        <td className="py-2 pr-4 text-right">{fmt(m.net_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>By preform</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Preform</th><th className="py-2 pr-4 text-right">Production</th>
                    <th className="py-2 pr-4 text-right">Rejection</th><th className="py-2 pr-4 text-right">Net cost</th>
                  </tr></thead>
                  <tbody>
                    {data.by_preform.map((p, i) => (
                      <tr key={`${p.make}-${p.gram}-${i}`} className="border-b">
                        <td className="py-2 pr-4">{p.make} {fmt(p.gram, 0)}g</td>
                        <td className="py-2 pr-4 text-right">{fmt(p.total_production, 0)}</td>
                        <td className="py-2 pr-4 text-right">{fmt(p.total_rejection, 0)}</td>
                        <td className="py-2 pr-4 text-right">{fmt(p.net_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function MonthlyTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data, isLoading } = useMonthlyReport(year, month);
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="w-32">
          <Label htmlFor="m-year">Year</Label>
          <Input id="m-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div className="w-32">
          <Label htmlFor="m-month">Month</Label>
          <Input id="m-month" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
        </div>
      </div>
      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <TotalsGrid totals={data.totals} />
          <Card>
            <CardHeader><CardTitle>Day-wise</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th><th className="py-2 pr-4 text-right">Production</th>
                    <th className="py-2 pr-4 text-right">Rejection</th><th className="py-2 pr-4 text-right">Units</th>
                    <th className="py-2 pr-4 text-right">Net cost</th><th className="py-2 pr-4 text-right">Avg ₹/bottle</th>
                  </tr></thead>
                  <tbody>
                    {data.daywise.map((d) => (
                      <tr key={d.date} className="border-b">
                        <td className="py-2 pr-4">{d.date}</td>
                        <td className="py-2 pr-4 text-right">{fmt(d.total_production, 0)}</td>
                        <td className="py-2 pr-4 text-right">{fmt(d.total_rejection, 0)}</td>
                        <td className="py-2 pr-4 text-right">{fmt(d.total_units)}</td>
                        <td className="py-2 pr-4 text-right">{fmt(d.net_cost)}</td>
                        <td className="py-2 pr-4 text-right">{fmt(d.avg_per_bottle_cost, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function VarCell({ cell, digits = 4 }: { cell: VarianceCell; digits?: number }) {
  if (cell.std === null) return <span className="text-muted-foreground">no std</span>;
  return (
    <span className={cell.breach ? 'font-medium text-red-600' : ''}>
      {fmt(cell.actual, digits)} / {fmt(cell.std, digits)}
      {cell.variance_pct !== null && (
        <span className="ml-1 text-xs text-muted-foreground">({cell.variance_pct >= 0 ? '+' : ''}{fmt(cell.variance_pct, 1)}%)</span>
      )}
    </span>
  );
}

function VariancesTab() {
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useVariances(from, to);
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div><Label htmlFor="v-from">From</Label><Input id="v-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="v-to">To</Label><Input id="v-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Actual vs Standard</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.summary.breaches} of {data.summary.runs} runs breach a standard (actual &gt; 5% worse than target).
              Set targets under Master Data → Preform Specs.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Run</th>
                    <th className="py-2 pr-4">Preform</th>
                    <th className="py-2 pr-4">Blowing ₹/bottle (act/std)</th>
                    <th className="py-2 pr-4">Reject % (act/std)</th>
                    <th className="py-2 pr-4">Units/bottle (act/std)</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.run_id} className="border-b">
                      <td className="py-2 pr-4">{r.date}</td>
                      <td className="py-2 pr-4">#{r.run_number} · {r.machine_name}</td>
                      <td className="py-2 pr-4">{r.preform}</td>
                      <td className="py-2 pr-4"><VarCell cell={r.blowing_cost} /></td>
                      <td className="py-2 pr-4"><VarCell cell={r.reject_pct} digits={2} /></td>
                      <td className="py-2 pr-4"><VarCell cell={r.units_per_bottle} digits={5} /></td>
                      <td className="py-2 pr-4">
                        {r.any_breach
                          ? <Badge className="bg-red-100 text-red-700">Breach</Badge>
                          : <Badge className="bg-green-100 text-green-700">OK</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportsPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <DashboardHeader title="Blowing — Reports" description="Daily and monthly production &amp; cost">
        <Button variant="outline" onClick={() => navigate('/production/blowing')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </DashboardHeader>
      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="variances">Variances</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="pt-4"><DailyTab /></TabsContent>
        <TabsContent value="monthly" className="pt-4"><MonthlyTab /></TabsContent>
        <TabsContent value="variances" className="pt-4"><VariancesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsPage;
