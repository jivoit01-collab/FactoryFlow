import { BarChart3, Plus, Scale, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { useMachines, useRuns } from '../api';
import { RUN_STATUS_BADGE, RUN_STATUS_LABELS } from '../constants';

const fmt = (v: string | number | null | undefined, digits = 2) => {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: digits }) : '-';
};

const today = () => new Date().toISOString().slice(0, 10);

function BlowingDashboardPage() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [machineId, setMachineId] = useState<string>('');

  const { data: machines = [] } = useMachines(true);
  const { data: runs = [], isLoading } = useRuns({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    machine_id: machineId ? Number(machineId) : undefined,
  });

  const summary = useMemo(() => {
    return runs.reduce(
      (acc, r) => {
        acc.production += r.total_counter_production;
        acc.rejection += r.rejection_pcs;
        acc.netCost += Number(r.net_cost ?? 0);
        return acc;
      },
      { production: 0, rejection: 0, netCost: 0 },
    );
  }, [runs]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Blowing"
        description="Bottle-making from preform on blowing machines — runs, costs and reports"
        primaryAction={{
          label: 'New Run',
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => navigate('/production/blowing/runs/new'),
        }}
      >
        <Button onClick={() => navigate('/production/blowing/make-vs-buy')}>
          <Scale className="mr-2 h-4 w-4" /> Make vs Buy
        </Button>
        <Button variant="outline" onClick={() => navigate('/production/blowing/reports')}>
          <BarChart3 className="mr-2 h-4 w-4" /> Reports
        </Button>
        <Button variant="outline" onClick={() => navigate('/production/blowing/master-data')}>
          <Settings2 className="mr-2 h-4 w-4" /> Master Data
        </Button>
      </DashboardHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Runs</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{runs.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Production (pcs)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{fmt(summary.production, 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rejection (pcs)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{fmt(summary.rejection, 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Cost (₹)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{fmt(summary.netCost)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-4">
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={dateFrom} max={today()} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={dateTo} max={today()} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="machine">Machine</Label>
              <select
                id="machine"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
              >
                <option value="">All</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : runs.length === 0 ? (
            <p className="text-muted-foreground">No runs found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Machine</th>
                    <th className="py-2 pr-4">Preform</th>
                    <th className="py-2 pr-4 text-right">Production</th>
                    <th className="py-2 pr-4 text-right">Rej %</th>
                    <th className="py-2 pr-4 text-right">₹/bottle</th>
                    <th className="py-2 pr-4 text-right">Net Cost</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b hover:bg-muted/50"
                      onClick={() => navigate(`/production/blowing/runs/${r.id}`)}
                    >
                      <td className="py-2 pr-4">{r.date}</td>
                      <td className="py-2 pr-4">{r.run_number}</td>
                      <td className="py-2 pr-4">{r.machine_name}</td>
                      <td className="py-2 pr-4">{r.preform_make} {fmt(r.preform_gram, 0)}g</td>
                      <td className="py-2 pr-4 text-right">{fmt(r.total_counter_production, 0)}</td>
                      <td className="py-2 pr-4 text-right">{fmt(r.rejection_pct, 2)}</td>
                      <td className="py-2 pr-4 text-right">{fmt(r.per_bottle_cost, 4)}</td>
                      <td className="py-2 pr-4 text-right">{fmt(r.net_cost)}</td>
                      <td className="py-2 pr-4">
                        <Badge className={RUN_STATUS_BADGE[r.status]}>{RUN_STATUS_LABELS[r.status]}</Badge>
                      </td>
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

export default BlowingDashboardPage;
