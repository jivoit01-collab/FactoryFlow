/**
 * Packing — between warehouse issue and Outward.
 * Pick an issued order → generate unique item barcodes → print them → complete
 * packing → the order becomes dispatchable in Outward.
 */
import { ArrowLeft, Barcode, CheckCircle2, PackageCheck, Printer } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import PrintableLabel from '@/modules/barcode/components/PrintableLabel';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import {
  useCompletePacking,
  useGenerateBarcodes,
  useOpenPacking,
  usePacking,
  usePackingQueue,
} from '../api/marketplace.queries';
import { MpFlowSteps } from '../components/MpFlowSteps';
import { PackLabel } from '../components/PackLabel';

export default function MpPackingPage() {
  const [packingId, setPackingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data: queuePage, isLoading } = usePackingQueue({ channel: 'FLIPKART', page, pageSize });
  const queue = queuePage?.results ?? [];
  const openPacking = useOpenPacking();

  function open(orderId: string) {
    openPacking.mutate(orderId, {
      onSuccess: (p) => setPackingId(p.id),
      onError: (e: unknown) =>
        toast.error((e as { message?: string })?.message ?? 'Could not open packing'),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Packing</h1>
        <p className="text-sm text-muted-foreground">
          Generate and print item barcodes, then release the order to Outward.
        </p>
        <MpFlowSteps current={5} />
      </header>

      {packingId ? (
        <ActivePacking packingId={packingId} onClose={() => setPackingId(null)} />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Orders to pack</CardTitle>
            <CardDescription>
              Issued from the warehouse. Packed orders stay here so their labels can be reprinted.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Buyer</th>
                    <th className="p-3">Lines</th>
                    <th className="p-3">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td>
                    </tr>
                  ) : queue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No orders to pack — issue their materials first.
                      </td>
                    </tr>
                  ) : (
                    queue.map((o) => {
                      const packed = o.packing_status === 'PACKED';
                      return (
                        <tr key={o.order_id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="p-3 font-mono font-medium">{o.order_id}</td>
                          <td className="p-3 text-muted-foreground">{o.buyer_name || '—'}</td>
                          <td className="p-3">{o.line_count}</td>
                          <td className="p-3">
                            <Badge variant={packed ? 'default' : 'outline'}>
                              {o.packing_status ?? 'NEW'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant={packed ? 'outline' : 'default'}
                              onClick={() => open(o.order_id)}
                              disabled={openPacking.isPending}
                            >
                              {packed ? (
                                <>
                                  <Printer className="mr-1.5 h-4 w-4" /> Reprint
                                </>
                              ) : (
                                'Pack'
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {queuePage && queuePage.count > 0 && (
              <PaginationControls
                page={queuePage.page}
                pageSize={queuePage.page_size}
                total={queuePage.count}
                totalPages={queuePage.total_pages}
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
      )}
    </div>
  );
}

function ActivePacking({ packingId, onClose }: { packingId: number; onClose: () => void }) {
  const { data: packing } = usePacking(packingId);
  const generate = useGenerateBarcodes(packingId);
  const complete = useCompletePacking(packingId);

  if (!packing) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const barcodes = packing.barcodes ?? [];
  const packed = packing.status === 'PACKED';

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Packing queue
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">
              Order <span className="font-mono">{packing.order_id}</span>
            </CardTitle>
            <CardDescription>{packing.buyer_name || '—'}</CardDescription>
          </div>
          <Badge variant={packed ? 'default' : 'secondary'}>{packing.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {barcodes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Barcode className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No item barcodes yet.</p>
              <Button
                onClick={() =>
                  generate.mutate(undefined, {
                    onSuccess: () => toast.success('Barcodes generated'),
                    onError: (e: unknown) =>
                      toast.error((e as { message?: string })?.message ?? 'Generate failed'),
                  })
                }
                disabled={generate.isPending}
              >
                <Barcode className="mr-2 h-4 w-4" /> Generate item barcodes
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{barcodes.length} item barcode(s)</span>
                <PrintableLabel triggerLabel="Print all labels" variant="outline">
                  {barcodes.map((bc) => (
                    <PackLabel key={bc.id} bc={bc} orderId={packing.order_id} />
                  ))}
                </PrintableLabel>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2">Barcode</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {barcodes.map((bc) => (
                      <tr key={bc.id} className="border-b last:border-0">
                        <td className="p-2">
                          <div className="font-mono">{bc.item_code}</div>
                          <div className="text-xs text-muted-foreground">{bc.item_name}</div>
                        </td>
                        <td className="p-2 text-right">{Number(bc.quantity)}</td>
                        <td className="p-2 font-mono text-xs">{bc.barcode}</td>
                        <td className="p-2 text-right">
                          <PrintableLabel triggerLabel="Print" variant="ghost" size="sm">
                            <PackLabel bc={bc} orderId={packing.order_id} />
                          </PrintableLabel>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!packed ? (
        <Button
          disabled={barcodes.length === 0 || complete.isPending}
          onClick={() =>
            complete.mutate(undefined, {
              onSuccess: () => {
                toast.success('Packed — order moved to Outward');
                onClose();
              },
              onError: (e: unknown) =>
                toast.error((e as { message?: string })?.message ?? 'Complete failed'),
            })
          }
        >
          <PackageCheck className="mr-2 h-4 w-4" /> Complete packing → Outward
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Packed. Dispatch it from Outward.
        </span>
      )}
    </div>
  );
}
