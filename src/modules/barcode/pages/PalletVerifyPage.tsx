import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useVerifyRequests } from '../api';
import type { PalletVerifyRequestStatus } from '../types';

const STATUS_COLORS: Record<PalletVerifyRequestStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

type Tab = 'ALL' | PalletVerifyRequestStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function PalletVerifyPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('ALL');
  const { data: requests = [], isLoading } = useVerifyRequests();

  const counts = useMemo(() => {
    const c: Record<PalletVerifyRequestStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
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
        title="Verify / Reconcile Requests"
        description="Pallet verification requests raised for the barcode team"
        primaryAction={{
          label: 'New Entry',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/barcode/verify/new'),
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open" value={counts.OPEN} tone="text-amber-600" />
        <StatCard label="In Progress" value={counts.IN_PROGRESS} tone="text-blue-600" />
        <StatCard label="Resolved" value={counts.RESOLVED} tone="text-green-600" />
        <StatCard label="Cancelled" value={counts.CANCELLED} tone="text-gray-600" />
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
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Pallet</th>
                    <th className="text-left p-2 font-medium">Item</th>
                    <th className="text-left p-2 font-medium">Missing / Foreign</th>
                    <th className="text-left p-2 font-medium">Raised by</th>
                    <th className="text-left p-2 font-medium">When</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/barcode/verify/${r.id}`)}
                    >
                      <td className="p-2">{r.id}</td>
                      <td className="p-2 font-mono text-xs">{r.pallet_code}</td>
                      <td className="p-2">{r.item_name || r.item_code}</td>
                      <td className="p-2">
                        {r.missing_count} / {r.foreign_count}
                      </td>
                      <td className="p-2">{r.requested_by_name || '-'}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(r.requested_at).toLocaleString()}
                      </td>
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
