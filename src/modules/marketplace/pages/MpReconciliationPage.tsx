/** Reconciliation — per-order deviations (outward↔inward, portal↔physical). */
import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { useReconciliation } from '../api/marketplace.queries';
import { useMpChannel } from '../hooks/useMpChannel';
import { MpChannelSelect } from '../components/MpChannelSelect';
import type { MarketplaceChannel } from '../types/marketplace.types';

export default function MpReconciliationPage() {
  const [channel, setChannel] = useMpChannel();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [onlyDeviations, setOnlyDeviations] = useState(false);

  const query = useReconciliation({
    channel,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });
  const report = query.data;
  const rows = (report?.rows ?? []).filter((r) => !onlyDeviations || r.has_deviation);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <ClipboardCheck className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Outward vs inward, and portal vs physical, per Order ID.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="min-w-0 flex-1 space-y-1 sm:flex-none">
            <Label className="text-xs">From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full" />
          </div>
          <div className="min-w-0 flex-1 space-y-1 sm:flex-none">
            <Label className="text-xs">To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full" />
          </div>
          <Button
            variant={onlyDeviations ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOnlyDeviations((v) => !v)}
          >
            Deviations only
          </Button>
          {report ? (
            <span className="w-full text-sm text-muted-foreground sm:ml-auto sm:w-auto">
              {report.total_orders} orders · {report.orders_with_deviation} with deviation
            </span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Deviation rows</CardTitle>
          <CardDescription>Physical = outward − inward. Portal = ordered quantity.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {query.isLoading ? 'Loading…' : 'No rows.'}
            </p>
          ) : (
            <div className="-mx-2 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 pl-2 font-medium">Order</th>
                    <th className="py-2 px-2 font-medium">Item</th>
                    <th className="py-2 px-2 text-right font-medium">Portal</th>
                    <th className="py-2 px-2 text-right font-medium">Outward</th>
                    <th className="py-2 px-2 text-right font-medium">Inward</th>
                    <th className="py-2 px-2 text-right font-medium">Physical</th>
                    <th className="py-2 px-2 text-right font-medium">Out−In</th>
                    <th className="py-2 pl-2 pr-2 text-right font-medium">Portal−Phys</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.order_id}-${row.item_code}-${i}`} className="border-b last:border-0">
                      <td className="py-2 pr-2 pl-2 font-mono">{row.order_id}</td>
                      <td className="py-2 px-2 font-mono">{row.item_code}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{row.portal_quantity}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{row.outward_quantity}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{row.inward_quantity}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{row.physical_quantity}</td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {row.outward_vs_inward_deviation}
                      </td>
                      <td className="py-2 pl-2 pr-2 text-right">
                        {row.has_deviation ? (
                          <Badge variant="destructive">{row.portal_vs_physical_deviation}</Badge>
                        ) : (
                          <span className="tabular-nums text-muted-foreground">
                            {row.portal_vs_physical_deviation}
                          </span>
                        )}
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
