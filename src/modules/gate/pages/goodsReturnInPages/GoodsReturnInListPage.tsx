import { CheckCircle2, Loader2, LogIn, RefreshCw, Truck, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type GoodsReturnListItem,
  useExpectedGoodsReturns,
  useMarkGoodsReturnIn,
} from '@/modules/returns/customer/api';
import { formatDate } from '@/modules/returns/customer/utils';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

export default function GoodsReturnInListPage() {
  const navigate = useNavigate();
  const { data: expected = [], isLoading, isFetching, refetch } = useExpectedGoodsReturns();
  const markIn = useMarkGoodsReturnIn();
  const [markingId, setMarkingId] = useState<number | null>(null);

  async function handleMarkIn(entry: GoodsReturnListItem) {
    setMarkingId(entry.id);
    try {
      await markIn.mutateAsync({ id: entry.id });
      toast.success(`${entry.vehicle_no || entry.entry_no} marked in`);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Could not mark the vehicle in.');
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Undo2 className="h-7 w-7 text-rose-600" />
            Goods Return In
          </h2>
          <p className="text-muted-foreground">
            Customer return vehicles expected at the gate. Mark a vehicle in when it arrives.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <EmptyState text="Loading…" />
      ) : expected.length === 0 ? (
        <EmptyState text="No goods-return vehicles are expected right now" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {expected.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-lg font-semibold">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      {entry.vehicle_no || '—'}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => navigate(`/returns/customer/${entry.id}`)}
                    >
                      {entry.entry_no}
                    </button>
                  </div>
                  <Badge variant="outline">{entry.company_code}</Badge>
                </div>

                <dl className="space-y-1 text-sm">
                  <Row label="Customer" value={entry.customer_name || entry.customer_code || '-'} />
                  <Row label="Driver" value={entry.driver_name || '-'} />
                  <Row label="Items" value={String(entry.line_count)} />
                  <Row label="Expected" value={formatDate(entry.expected_arrival_at)} />
                </dl>

                <Button
                  className="w-full"
                  onClick={() => handleMarkIn(entry)}
                  disabled={markingId === entry.id}
                >
                  {markingId === entry.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Mark Vehicle In
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8" />
        <p>{text}</p>
      </CardContent>
    </Card>
  );
}
