/** Marketplace overview — quick links + recent dispatches. */
import { ClipboardList, ShoppingCart, Truck, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import { useMpDispatches } from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import type { MarketplaceChannel } from '../types/marketplace.types';

export default function MpOverviewPage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const dispatchesQuery = useMpDispatches({ channel });
  const dispatches = dispatchesQuery.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <ShoppingCart className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Flipkart / Amazon dispatch, returns and internal billing.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile to="/marketplace/outward" icon={<Truck className="h-5 w-5" />} title="Outward" subtitle="Scan & dispatch" />
        <Tile to="/marketplace/inward" icon={<Undo2 className="h-5 w-5" />} title="Inward" subtitle="Returns" />
        <Tile to="/marketplace/masters" icon={<ClipboardList className="h-5 w-5" />} title="Masters" subtitle="SKU & combos" />
        <Tile
          to="/marketplace/reconciliation"
          icon={<ClipboardList className="h-5 w-5" />}
          title="Reconcile"
          subtitle="Deviations"
        />
      </div>

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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Order</th>
                  <th className="py-2 px-2 font-medium">Status</th>
                  <th className="py-2 px-2 font-medium">Delivery Note</th>
                  <th className="py-2 pl-2 font-medium">Internal Bill</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono">{d.order_id}</td>
                    <td className="py-2 px-2">
                      <Badge variant={d.status === 'CONFIRMED' ? 'default' : 'secondary'}>{d.status}</Badge>
                    </td>
                    <td className="py-2 px-2 font-mono">{d.sap_delivery_note_num || '—'}</td>
                    <td className="py-2 pl-2 font-mono">{d.internal_billing_num || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/50">
      <span className="text-primary">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}
