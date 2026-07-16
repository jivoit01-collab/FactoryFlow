/**
 * Inward — marketplace returns. Scan returned items against the original Order ID,
 * see a summary, and submit to produce a Return Note. Also lists existing returns
 * so a submitted one can be reopened and its note reprinted.
 */
import { CheckCircle2, PackageOpen, ScanLine, Undo2 } from 'lucide-react';
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
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useMpReturn,
  useMpReturns,
  useScanReturn,
  useScanReturnByTracking,
  useSetReturnScanCondition,
  useSubmitReturn,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { MpProgressTable } from '../components/MpProgressTable';
import { MpScanFeedback, type ScanFeedback } from '../components/MpScanFeedback';
import { MpScanPanel } from '../components/MpScanPanel';
import { ReturnNoteButton } from '../components/ReturnNote';
import {
  type MarketplaceChannel,
  MP_RETURN_CONDITIONS,
  type MpReturnCondition,
  type MpReturnScan,
  type MpReturnStatus,
} from '../types/marketplace.types';

const WARN_CODES = ['NOT_FOUND', 'EMPTY'];

function errorCode(e: unknown): string | undefined {
  return (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

const STATUS_VARIANT: Record<MpReturnStatus, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'outline',
  SCANNING: 'secondary',
  SUBMITTED: 'default',
  CANCELLED: 'outline',
};

export default function MpInwardPage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  const [returnId, setReturnId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const scanReturn = useScanReturnByTracking(channel);

  function handleScan(barcode: string) {
    scanReturn.mutate(barcode, {
      onSuccess: (r) => {
        setReturnId(r.id);
        if (r.duplicate) {
          setFeedback({ kind: 'warning', message: `Already scanned · ${r.order_id}`, detail: r.buyer_name });
        } else {
          setFeedback({ kind: 'success', message: `Return opened · ${r.order_id}`, detail: r.buyer_name });
        }
      },
      onError: (e) => {
        const warn = WARN_CODES.includes(errorCode(e) ?? '');
        setFeedback({ kind: warn ? 'warning' : 'error', message: getErrorMessage(e, 'Scan failed') });
      },
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <Undo2 className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inward Returns</h1>
          <p className="text-sm text-muted-foreground">
            Scan a returned shipment's Tracking ID to open its return, set item conditions, and submit
            the Return Note.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={(c) => { setChannel(c); setReturnId(null); setFeedback(null); }} />
      </header>

      {returnId ? (
        <ActiveReturn returnId={returnId} channel={channel} onClose={() => setReturnId(null)} />
      ) : (
        <>
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanLine className="h-5 w-5 text-primary" /> Scan a returned shipment
              </CardTitle>
              <CardDescription>
                Scan the Flipkart <strong>Tracking ID</strong> — the return opens with every item
                recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MpScanPanel onScan={handleScan} pending={scanReturn.isPending} placeholder="Scan Tracking ID (e.g. FMPP…)" />
              <MpScanFeedback feedback={feedback} />
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

        <ReturnedItemsCondition
          returnId={returnId}
          scans={r.scans ?? []}
          readOnly={submitted}
        />

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

/** Per-item Condition of returned goods — saved on each scan for tracking/reporting. */
function ReturnedItemsCondition({
  returnId,
  scans,
  readOnly,
}: {
  returnId: number;
  scans: MpReturnScan[];
  readOnly: boolean;
}) {
  const setCondition = useSetReturnScanCondition(returnId);
  if (scans.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label className="text-xs">Returned items — condition</Label>
      <div className="-mx-2 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2">Qty</th>
              <th className="p-2 w-48">Condition</th>
              <th className="p-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((s) => (
              <ReturnScanConditionRow
                key={s.id}
                scan={s}
                readOnly={readOnly}
                onSave={(condition, remarks) =>
                  setCondition.mutate(
                    { scanId: s.id, condition, condition_remarks: remarks },
                    {
                      onError: (e: unknown) =>
                        toast.error(
                          (e as { message?: string })?.message ?? 'Could not save condition',
                        ),
                    },
                  )
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReturnScanConditionRow({
  scan,
  readOnly,
  onSave,
}: {
  scan: MpReturnScan;
  readOnly: boolean;
  onSave: (condition: MpReturnCondition, remarks: string) => void;
}) {
  const [condition, setCondition] = useState<MpReturnCondition>(scan.condition ?? '');
  const [remarks, setRemarks] = useState(scan.condition_remarks ?? '');

  return (
    <tr className="border-b last:border-0">
      <td className="p-2">
        <div className="font-mono text-xs font-medium">{scan.item_code}</div>
        <div className="text-xs text-muted-foreground">{scan.item_name}</div>
      </td>
      <td className="p-2 tabular-nums">{scan.quantity}</td>
      <td className="p-2">
        <NativeSelect
          value={condition}
          disabled={readOnly}
          onChange={(e) => {
            const value = e.target.value as MpReturnCondition;
            setCondition(value);
            onSave(value, remarks);
          }}
          className="w-full"
        >
          <SelectOption value="">Select…</SelectOption>
          {MP_RETURN_CONDITIONS.map((c) => (
            <SelectOption key={c.value} value={c.value}>
              {c.label}
            </SelectOption>
          ))}
        </NativeSelect>
      </td>
      <td className="p-2">
        <Input
          value={remarks}
          disabled={readOnly}
          placeholder={condition === 'OTHER' ? 'Add details' : 'Optional'}
          onChange={(e) => setRemarks(e.target.value)}
          onBlur={() => onSave(condition, remarks)}
        />
      </td>
    </tr>
  );
}
