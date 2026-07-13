/**
 * Inward — marketplace returns. Scan returned items against the original Order ID,
 * see a summary, and submit to produce a Return Note. Also lists existing returns
 * so a submitted one can be reopened and its note reprinted.
 */
import { CheckCircle2, PackageOpen, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';
import { PaginationControls } from '@/shared/components/PaginationControls';
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
  useMpReturns,
  useScanReturn,
  useSubmitReturn,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { MpProgressTable } from '../components/MpProgressTable';
import { MpScanPanel } from '../components/MpScanPanel';
import { ReturnNoteButton } from '../components/ReturnNote';
import type { MarketplaceChannel, MpReturnStatus } from '../types/marketplace.types';

const STATUS_VARIANT: Record<MpReturnStatus, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'outline',
  SCANNING: 'secondary',
  SUBMITTED: 'default',
  CANCELLED: 'outline',
};

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
            Scan returned items against a marketplace Order ID and submit the Return Note.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={(c) => { setChannel(c); setReturnId(null); }} />
      </header>

      {returnId ? (
        <ActiveReturn returnId={returnId} channel={channel} onClose={() => setReturnId(null)} />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Return against an order</CardTitle>
              <CardDescription>Scan or type the {channel} Order ID.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={orderInput}
                  placeholder="Order ID"
                  onChange={(e) => setOrderInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && orderInput.trim() && load(orderInput.trim())}
                />
                <Button className="w-full sm:w-auto" onClick={() => orderInput.trim() && load(orderInput.trim())} disabled={createReturn.isPending}>
                  Load
                </Button>
              </div>
            </CardContent>
          </Card>

          <ReturnsList channel={channel} onOpen={setReturnId} />
        </>
      )}
    </div>
  );
}

function ReturnsList({
  channel,
  onOpen,
}: {
  channel: MarketplaceChannel;
  onOpen: (id: number) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data, isLoading } = useMpReturns({ channel, page, pageSize });
  const rows = data?.results ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Return orders</CardTitle>
        <CardDescription>Open a return to continue scanning or reprint its note.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="-mx-2 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Buyer</th>
                <th className="p-3">Return Note</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No returns yet for {channel}.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-mono font-medium">{r.order_id}</td>
                    <td className="p-3 text-muted-foreground">{r.buyer_name || '—'}</td>
                    <td className="p-3 font-mono text-xs">{r.return_note_num || '—'}</td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => onOpen(r.id)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && data.count > 0 && (
          <PaginationControls
            page={data.page}
            pageSize={data.page_size}
            total={data.count}
            totalPages={data.total_pages}
            isLoading={isLoading}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </CardContent>
    </Card>
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
  const { currentCompany } = useAuth();
  const returnQuery = useMpReturn(returnId);
  const scan = useScanReturn(returnId);
  const submit = useSubmitReturn(returnId);
  const r = returnQuery.data;
  const submitted = r?.status === 'SUBMITTED';
  const companyName = currentCompany?.company_name ?? '';

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
          toast.success(`Return submitted · Note ${result.return_note_num || '—'}`),
      },
    );
  }

  if (!r) return <p className="text-sm text-muted-foreground">Loading return…</p>;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">
            Order <span className="font-mono">{r.order_id}</span>
          </CardTitle>
          <CardDescription>{channel} return</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-400 bg-emerald-50 p-3 text-sm text-emerald-800">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Submitted. Return Note <span className="font-mono font-semibold">{r.return_note_num || '—'}</span>.
            </span>
            <ReturnNoteButton mpReturn={r} companyName={companyName} />
          </div>
        )}

        <MpProgressTable progress={r.progress ?? []} />

        {!submitted ? (
          <div className="flex justify-end">
            <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={submit.isPending || (r.scans ?? []).length === 0}>
              <PackageOpen className="mr-2 h-4 w-4" />
              {submit.isPending ? 'Submitting…' : 'Submit return'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            New return
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
