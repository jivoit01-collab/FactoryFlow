/**
 * Inward — marketplace returns. Scan returned items against the original Order ID,
 * see a summary, and submit to produce an internal credit document.
 */
import { CheckCircle2, PackageOpen, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/components/ui';

import {
  useCreateReturn,
  useMpReturn,
  useScanReturn,
  useSubmitReturn,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { MpProgressTable } from '../components/MpProgressTable';
import { MpScanPanel } from '../components/MpScanPanel';
import type { MarketplaceChannel } from '../types/marketplace.types';

export default function MpInwardPage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const [orderInput, setOrderInput] = useState('');
  const [returnId, setReturnId] = useState<number | null>(null);
  const createReturn = useCreateReturn();

  function load(orderId: string) {
    createReturn.mutate(
      { channel, order_id: orderId },
      {
        onSuccess: (r) => setReturnId(r.id),
        onError: () => toast.error(`Order ${orderId} not found for ${channel}`),
      },
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <Undo2 className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inward Returns</h1>
          <p className="text-sm text-muted-foreground">
            Scan returned items against a marketplace Order ID and submit the credit.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={(c) => { setChannel(c); setReturnId(null); }} />
      </header>

      {!returnId ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Return against an order</CardTitle>
            <CardDescription>Scan or type the {channel} Order ID.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={orderInput}
                placeholder="Order ID"
                onChange={(e) => setOrderInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && orderInput.trim() && load(orderInput.trim())}
              />
              <Button onClick={() => orderInput.trim() && load(orderInput.trim())} disabled={createReturn.isPending}>
                Load
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ActiveReturn returnId={returnId} channel={channel} onClose={() => setReturnId(null)} />
      )}
    </div>
  );
}

function ActiveReturn({
  returnId,
  channel,
  onClose,
}: {
  returnId: number;
  channel: MarketplaceChannel;
  onClose: () => void;
}) {
  const returnQuery = useMpReturn(returnId);
  const scan = useScanReturn(returnId);
  const submit = useSubmitReturn(returnId);
  const r = returnQuery.data;
  const submitted = r?.status === 'SUBMITTED';

  function handleScan(barcode: string) {
    scan.mutate(
      { barcode_raw: barcode },
      {
        onSuccess: (result) =>
          result.duplicate
            ? toast.warning(`Duplicate scan: ${barcode}`)
            : toast.success(`Returned ${result.item_code}`),
      },
    );
  }

  function handleSubmit() {
    submit.mutate(
      {},
      {
        onSuccess: (result) =>
          toast.success(`Return submitted · Credit ${result.internal_credit_doc_num || '—'}`),
      },
    );
  }

  if (!r) return <p className="text-sm text-muted-foreground">Loading return…</p>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">
            Order <span className="font-mono">{r.order_id}</span>
          </CardTitle>
          <CardDescription>{channel} return</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={submitted ? 'default' : 'secondary'}>{r.status}</Badge>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Change order
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!submitted ? (
          <MpScanPanel onScan={handleScan} pending={scan.isPending} placeholder="Scan returned item" />
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-emerald-400 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Submitted. Internal credit <span className="font-mono">{r.internal_credit_doc_num || '—'}</span>.
          </div>
        )}

        <MpProgressTable progress={r.progress ?? []} />

        {!submitted ? (
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submit.isPending || (r.scans ?? []).length === 0}>
              <PackageOpen className="mr-2 h-4 w-4" />
              {submit.isPending ? 'Submitting…' : 'Submit return'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={onClose}>
            New return
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
