import { ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useActivationRequests } from '../api';
import type { ActivationRequestStatus } from '../types';

const STATUS_COLORS: Record<ActivationRequestStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

type Tab = 'ALL' | ActivationRequestStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: 'OPEN', label: 'Waiting' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'ALL', label: 'All' },
];

/**
 * Activation approvals — the way in that has no scan behind it.
 *
 * Labels reach here when they cannot be received at the godown gate: the
 * scanner is down, the pallet went straight onto a truck, a label was reprinted
 * after the trolley had passed. Approving one takes the requester's word for it,
 * which is why every request carries a reason and every box it activates is
 * stamped `APPROVAL` — so "what is in the godown that nobody ever scanned in?"
 * stays answerable.
 */
export default function ActivationApprovalsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('OPEN');
  const { data: requests = [], isLoading } = useActivationRequests();

  const counts = useMemo(() => {
    const c: Record<ActivationRequestStatus, number> = {
      OPEN: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    for (const r of requests) c[r.status] += 1;
    return c;
  }, [requests]);

  const rows = useMemo(
    () => (tab === 'ALL' ? requests : requests.filter((r) => r.status === tab)),
    [requests, tab],
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Activation Approvals"
        description="Activate printed labels that could not be received at the godown gate"
      />

      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Approving activates the labels without anyone scanning the physical boxes. Use
            it when the boxes provably exist but cannot pass the gate — otherwise send the
            requester to the warehouse Receive page.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(
          [
            ['Waiting', counts.OPEN, 'text-amber-600'],
            ['Approved', counts.APPROVED, 'text-green-600'],
            ['Rejected', counts.REJECTED, 'text-red-600'],
            ['Cancelled', counts.CANCELLED, 'text-gray-600'],
          ] as const
        ).map(([label, value, tone]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${tone}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? 'default' : 'outline'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">#</th>
                    <th className="p-2 text-left font-medium">Warehouse</th>
                    <th className="p-2 text-left font-medium">Pallet</th>
                    <th className="p-2 text-left font-medium">Item</th>
                    <th className="p-2 text-right font-medium">Labels</th>
                    <th className="p-2 text-left font-medium">Reason</th>
                    <th className="p-2 text-left font-medium">Requested by</th>
                    <th className="p-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b hover:bg-muted/30"
                      onClick={() => navigate(`/barcode/activation-approvals/${r.id}`)}
                    >
                      <td className="p-2">{r.id}</td>
                      <td className="p-2 font-mono text-xs">{r.warehouse || '—'}</td>
                      <td className="p-2 font-mono text-xs">{r.pallet_code || '—'}</td>
                      <td className="p-2">{r.item_summary || '—'}</td>
                      <td className="p-2 text-right font-medium">{r.box_count}</td>
                      <td className="max-w-xs truncate p-2 text-muted-foreground">
                        {r.reason}
                      </td>
                      <td className="p-2">{r.requested_by_name || '—'}</td>
                      <td className="p-2">
                        <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
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
