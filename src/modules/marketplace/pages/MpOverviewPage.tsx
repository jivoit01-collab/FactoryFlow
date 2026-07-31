/** Marketplace overview — a live command center for the dispatch pipeline. */
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  DoorOpen,
  FileBarChart2,
  FileSpreadsheet,
  PackageCheck,
  ScanLine,
  ShoppingCart,
  Truck,
  Undo2,
} from 'lucide-react';
import { type ReactNode, useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import { marketplaceApi } from '../api/marketplace.api';
import { useDispatchSheets, useMpDispatches } from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { useMpChannel } from '../hooks/useMpChannel';

export default function MpOverviewPage() {
  const [channel, setChannel] = useMpChannel();
  const dispatchesQuery = useMpDispatches({ channel });
  const dispatches = dispatchesQuery.data ?? [];
  const sheetsQuery = useDispatchSheets(channel);

  // Best-effort — the gate endpoint needs the gate_check permission; show 0 on 403.
  const gateQuery = useQuery({
    queryKey: ['mp-gate-queue', channel],
    queryFn: () => marketplaceApi.gateQueue(channel),
    retry: false,
  });

  // Aggregate every sheet's live insights into pipeline totals.
  const p = useMemo(() => {
    const sheets = sheetsQuery.data?.sheets ?? [];
    const acc = {
      orders: 0,
      toScan: 0,
      scanned: 0,
      confirmed: 0,
      trackingTotal: 0,
      trackingScanned: 0,
    };
    for (const s of sheets) {
      const i = s.insights;
      acc.orders += i.total_orders;
      acc.toScan += i.pending_orders;
      acc.scanned += Math.max(0, i.completed_orders - i.confirmed_orders);
      acc.confirmed += i.confirmed_orders;
      acc.trackingTotal += i.tracking_total;
      acc.trackingScanned += i.tracking_scanned;
    }
    return acc;
  }, [sheetsQuery.data]);

  const scanPct = p.trackingTotal ? Math.round((p.trackingScanned / p.trackingTotal) * 100) : 0;
  const atGate = gateQuery.data?.total_pending ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShoppingCart className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            {channel} dispatch pipeline — scan, confirm, gate-out, returns.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      {/* Pipeline — each card links to where you act on it */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <PipelineCard
          to="/marketplace/outward"
          icon={<ScanLine className="h-4 w-4" />}
          label="To scan"
          value={p.toScan}
          tone={p.toScan ? 'amber' : undefined}
        />
        <PipelineCard
          to="/marketplace/outward"
          icon={<PackageCheck className="h-4 w-4" />}
          label="Scanned"
          value={p.scanned}
        />
        <PipelineCard
          to="/marketplace/delivery-notes"
          icon={<Truck className="h-4 w-4" />}
          label="Confirmed"
          value={p.confirmed}
        />
        <PipelineCard
          to="/marketplace/gate"
          icon={<DoorOpen className="h-4 w-4" />}
          label="At gate"
          value={atGate}
          tone={atGate ? 'amber' : undefined}
        />
      </div>

      {/* Scan progress across all sheets */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Scan progress</span>
            <span className="text-muted-foreground">
              {p.trackingScanned}/{p.trackingTotal} tracking IDs · {scanPct}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${scanPct}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {p.orders} orders across {sheetsQuery.data?.sheets.length ?? 0} sheet(s).
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile to="/marketplace/import" icon={<FileSpreadsheet className="h-5 w-5" />} title="Import" />
        <Tile to="/marketplace/outward" icon={<Truck className="h-5 w-5" />} title="Outward" />
        <Tile to="/marketplace/gate" icon={<DoorOpen className="h-5 w-5" />} title="Gate" />
        <Tile to="/marketplace/inward" icon={<Undo2 className="h-5 w-5" />} title="Inward" />
        <Tile to="/marketplace/masters" icon={<ClipboardList className="h-5 w-5" />} title="Masters" />
        <Tile to="/marketplace/reports" icon={<FileBarChart2 className="h-5 w-5" />} title="Reports" />
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent {channel} dispatches</CardTitle>
          <CardDescription>Latest outward activity for this channel.</CardDescription>
        </CardHeader>
        <CardContent>
          {dispatches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {dispatchesQuery.isLoading ? 'Loading…' : 'No dispatches yet.'}
            </p>
          ) : (
            <div className="-mx-2 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[440px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 pl-2 font-medium">Order</th>
                    <th className="py-2 px-2 font-medium">Status</th>
                    <th className="py-2 px-2 font-medium">Delivery Note</th>
                    <th className="py-2 pl-2 pr-2 font-medium">Internal Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 pl-2 font-mono">{d.order_id}</td>
                      <td className="py-2 px-2">
                        <Badge variant={d.status === 'CONFIRMED' ? 'default' : 'secondary'}>{d.status}</Badge>
                      </td>
                      <td className="py-2 px-2 font-mono">{d.sap_delivery_note_num || '—'}</td>
                      <td className="py-2 pl-2 pr-2 font-mono">{d.internal_billing_num || '—'}</td>
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

function PipelineCard({
  to,
  icon,
  label,
  value,
  tone,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  value: number;
  tone?: 'amber';
}) {
  return (
    <Link to={to} className="rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:bg-muted/40">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${tone === 'amber' ? 'text-amber-600' : ''}`}>{value}</div>
    </Link>
  );
}

function Tile({ to, icon, title }: { to: string; icon: ReactNode; title: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition hover:bg-muted/50"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-medium">{title}</span>
    </Link>
  );
}
