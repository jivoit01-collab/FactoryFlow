import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Loader2,
  Lock,
  Play,
  ScanLine,
  Settings,
  ShieldCheck,
  TimerReset,
  Trash2,
  XCircle,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Input,
  Label,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useCancelDispatchSession,
  useCloseDispatchSession,
  useCreateDispatchSession,
  useDispatchScanLogs,
  useDispatchSession,
  useDispatchSessionDispatch,
  useDispatchSessions,
  useDispatchSettings,
  useLookupDispatchBill,
  useRemoveDispatchScannedBox,
  useSubmitDispatchScan,
  useUpdateDispatchScannedBoxQty,
  useUpdateDispatchSettings,
} from '../api';
import { useScanner } from '../hooks/useScanner';
import type {
  DispatchBillLine,
  DispatchBillLookupResponse,
  DispatchScanLog,
  DispatchScannedUnit,
  DispatchSession,
  DispatchSessionLine,
  DispatchSessionStatus,
} from '../types';
import {
  canMarkDispatchComplete,
  canSubmitDispatchScan,
  formatDispatchScanMessage,
  getDispatchActiveLine,
  getLineProgress,
  isLineComplete,
} from '../utils/dispatchValidation';
import { toastBarcodeError } from '../utils/errors';

type DispatchTab = 'active' | 'completed' | 'closed';

const SESSION_STATUS_LABEL: Record<DispatchSessionStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PARTIAL: 'In progress',
  READY_TO_DISPATCH: 'Ready',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  SAP_SYNC_FAILED: 'SAP failed',
};

const CLOSED_STATUSES = new Set<DispatchSessionStatus>([
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
  'SAP_SYNC_FAILED',
]);

type DispatchTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo';

const SURFACE_CLASS = 'rounded-md border bg-card text-card-foreground shadow-sm';

const BADGE_TONE_CLASS: Record<DispatchTone, string> = {
  slate:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200',
  emerald:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200',
  amber:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200',
  rose:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200',
  cyan:
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/70 dark:bg-cyan-950/40 dark:text-cyan-200',
  indigo:
    'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/70 dark:bg-indigo-950/40 dark:text-indigo-200',
};

const STAT_TONE_CLASS: Record<Exclude<DispatchTone, 'indigo'>, string> = {
  slate: 'border-border bg-card',
  emerald:
    'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/70 dark:bg-emerald-950/30',
  amber:
    'border-amber-200 bg-amber-50/70 dark:border-amber-800/70 dark:bg-amber-950/30',
  rose: 'border-rose-200 bg-rose-50/70 dark:border-rose-800/70 dark:bg-rose-950/30',
  cyan: 'border-cyan-200 bg-cyan-50/70 dark:border-cyan-800/70 dark:bg-cyan-950/30',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN');
}

function formatQty(qty: string | number | null | undefined, uom?: string) {
  const numeric = Number(qty ?? 0);
  const cleanQty = Number.isFinite(numeric)
    ? numeric.toLocaleString('en-IN', { maximumFractionDigits: 3 })
    : String(qty ?? '0');
  return `${cleanQty} ${uom ?? ''}`.trim();
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQtyWithBoxes(
  qty: string | number | null | undefined,
  uom?: string,
  boxes?: string | number | null,
) {
  const qtyText = formatQty(qty, uom || 'PCS');
  const boxValue = toNumber(boxes);
  if (boxValue <= 0) return qtyText;
  return `${qtyText} / ${formatQty(boxValue, 'Boxes')}`;
}

function getLineExpectedBoxes(line: DispatchSessionLine | DispatchBillLine) {
  if ('expected_boxes' in line) return line.expected_boxes ?? line.bill_boxes ?? '0';
  return line.total_boxes ?? '0';
}

function getSessionBoxes(
  session: DispatchSession | null,
  field: 'expected_boxes' | 'scanned_boxes' | 'pending_boxes',
) {
  if (!session) return 0;
  return session.lines.reduce((sum, line) => {
    if (field === 'expected_boxes') return sum + toNumber(line.expected_boxes ?? line.bill_boxes);
    if (field === 'scanned_boxes') return sum + toNumber(line.scanned_boxes);
    return sum + toNumber(line.pending_boxes);
  }, 0);
}

function getRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return undefined;
}

function getProgress(session: DispatchSession | null) {
  if (!session) return 0;
  const expected = Number(session.total_expected_qty || 0);
  const scanned = Number(session.total_scanned_qty || 0);
  if (!expected) return 0;
  return Math.min(100, Math.round((scanned / expected) * 100));
}

function statusBadgeClass(status: DispatchSessionStatus) {
  if (status === 'COMPLETED') return BADGE_TONE_CLASS.emerald;
  if (status === 'READY_TO_DISPATCH') return BADGE_TONE_CLASS.cyan;
  if (status === 'SAP_SYNC_FAILED' || status === 'CANCELLED') return BADGE_TONE_CLASS.rose;
  if (status === 'CLOSED') return BADGE_TONE_CLASS.slate;
  if (status === 'PARTIAL') return BADGE_TONE_CLASS.amber;
  return BADGE_TONE_CLASS.indigo;
}

function StatTile({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan';
}) {
  const toneClass = STAT_TONE_CLASS[tone];

  return (
    <div className={cn('min-w-0 rounded-md border p-3 text-card-foreground', toneClass)}>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold leading-tight">{value}</p>
    </div>
  );
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}>
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function BillLookupSummary({ bill }: { bill: DispatchBillLookupResponse }) {
  const totalQty = bill.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const totalBoxes = bill.lines.reduce((sum, line) => sum + toNumber(line.total_boxes), 0);

  return (
    <section className={cn(SURFACE_CLASS, 'p-4')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={BADGE_TONE_CLASS.cyan}>SAP bill loaded</Badge>
            {bill.already_dispatched && (
              <Badge className={BADGE_TONE_CLASS.amber}>Already dispatched</Badge>
            )}
          </div>
          <h2 className="mt-2 truncate text-xl font-semibold">{bill.bill_number}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {bill.customer.name || bill.customer.code || '-'} ·{' '}
            {bill.reference_delivery_number || 'No delivery ref'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
          <StatTile label="Lines" value={bill.lines.length.toString()} tone="cyan" />
          <StatTile
            label="Qty"
            value={formatQtyWithBoxes(totalQty, 'PCS', totalBoxes)}
            tone="emerald"
          />
          <StatTile label="Source" value={bill.source_system.replaceAll('_', ' ')} />
        </div>
      </div>

      <BillLinePreview lines={bill.lines} />
    </section>
  );
}

function BillLinePreview({ lines }: { lines: DispatchBillLine[] }) {
  return (
    <div className="mt-4 grid gap-2">
      {lines.map((line) => (
        <div
          key={`${line.sap_line_no}-${line.sequence_no}`}
          className="grid gap-2 rounded-md border bg-muted/40 p-3 md:grid-cols-[72px_minmax(0,1fr)_140px_120px]"
        >
          <div>
            <p className="text-xs text-muted-foreground">Seq</p>
            <p className="font-mono text-sm font-semibold">{line.sequence_no}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold">{line.material_code}</p>
            <p className="truncate text-sm text-muted-foreground">
              {line.material_description || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Qty</p>
            <p className="text-sm font-semibold">
              {formatQtyWithBoxes(line.quantity, line.uom, getLineExpectedBoxes(line))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Batch</p>
            <p className="truncate font-mono text-sm">{line.batch_number || '-'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionHero({ session }: { session: DispatchSession | null }) {
  if (!session) {
    return (
      <section className={cn(SURFACE_CLASS, 'p-6')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className={BADGE_TONE_CLASS.slate}>No active bill selected</Badge>
            <h2 className="mt-3 text-2xl font-semibold">Dispatch cockpit</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Select an active dispatch or create one from a SAP bill to begin warehouse scanning.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <StatTile label="Expected" value="-" />
            <StatTile label="Scanned" value="-" />
            <StatTile label="Pending" value="-" />
          </div>
        </div>
      </section>
    );
  }

  const progress = getProgress(session);
  const expectedBoxes = getSessionBoxes(session, 'expected_boxes');
  const scannedBoxes = getSessionBoxes(session, 'scanned_boxes');
  const pendingBoxes = getSessionBoxes(session, 'pending_boxes');

  return (
    <section className={cn(SURFACE_CLASS, 'p-5')}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusBadgeClass(session.status)}>
              {SESSION_STATUS_LABEL[session.status] ?? session.status}
            </Badge>
          </div>
          <h2 className="mt-3 truncate text-2xl font-semibold">{session.bill_number}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {session.customer_name || session.customer_code || '-'} ·{' '}
            {session.delivery_number || session.reference_delivery_number || 'No delivery ref'}
          </p>
          <div className="mt-4 max-w-3xl">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Dispatch progress</span>
              <span className="tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <ProgressBar value={progress} className="h-3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Expected"
            value={formatQtyWithBoxes(session.total_expected_qty, 'PCS', expectedBoxes)}
            tone="cyan"
          />
          <StatTile
            label="Scanned"
            value={formatQtyWithBoxes(session.total_scanned_qty, 'PCS', scannedBoxes)}
            tone="emerald"
          />
          <StatTile
            label="Pending"
            value={formatQtyWithBoxes(session.pending_qty, 'PCS', pendingBoxes)}
            tone="amber"
          />
          <StatTile
            label="Rejected"
            value={session.rejected_scan_count.toLocaleString('en-IN')}
            tone={session.rejected_scan_count ? 'rose' : 'slate'}
          />
        </div>
      </div>
    </section>
  );
}

function ActiveLineFocus({ activeLine }: { activeLine: DispatchSessionLine | null }) {
  if (!activeLine) {
    return (
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800/70 dark:bg-emerald-950/30">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
          <div>
            <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
              Ready for dispatch confirmation
            </h3>
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              All bill lines have reached the required scanned quantity.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const pending = activeLine.pending_qty || activeLine.remaining_qty;
  const progress = getLineProgress(activeLine);

  return (
    <section className={cn(SURFACE_CLASS, 'p-5')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
            <ScanLine className="h-4 w-4" />
            Active line {activeLine.sequence_no}
          </div>
          <h3 className="mt-2 truncate text-xl font-semibold">{activeLine.material_code}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeLine.material_description || '-'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
          <StatTile
            label="Pending"
            value={formatQtyWithBoxes(pending, activeLine.uom, activeLine.pending_boxes)}
            tone="amber"
          />
          <StatTile
            label="Scanned"
            value={formatQtyWithBoxes(
              activeLine.scanned_qty,
              activeLine.uom,
              activeLine.scanned_boxes,
            )}
            tone="emerald"
          />
          <StatTile label="Batch" value={activeLine.batch_number || '-'} />
          <StatTile label="Warehouse" value={activeLine.warehouse_code || '-'} />
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={progress} />
      </div>
    </section>
  );
}

function ScannerDock({
  disabled,
  loading,
  onScan,
}: {
  disabled: boolean;
  loading: boolean;
  onScan: (barcode: string) => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { isScanning, error, elementId, startScanning, stopScanning } = useScanner({
    onScan,
    debounceMs: 2000,
  });

  const submit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;
    onScan(trimmed);
    setValue('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <section className="rounded-md border border-cyan-200 bg-cyan-50/70 p-4 shadow-sm dark:border-cyan-800/70 dark:bg-cyan-950/30">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-600 text-white">
            <ScanLine className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">Scanner</h3>
            <p className="text-xs text-muted-foreground">Pallet, box, or item barcode</p>
          </div>
        </div>
        {disabled ? (
          <Badge className={BADGE_TONE_CLASS.slate}>Locked</Badge>
        ) : (
          <Badge className={BADGE_TONE_CLASS.emerald}>Ready</Badge>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          disabled={disabled || loading}
          onChange={(event) => setValue(event.target.value)}
          className="h-12 flex-1 font-mono text-base"
          placeholder={disabled ? 'Scanner locked' : 'Scan barcode'}
          autoFocus
        />
        <Button type="submit" className="h-12 px-4" disabled={!value.trim() || disabled || loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </Button>
      </form>

      <div
        id={elementId}
        className="mt-3 w-full overflow-hidden rounded-md bg-black"
        style={{ minHeight: isScanning ? 280 : 0, display: isScanning ? 'block' : 'none' }}
      />

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {!isScanning ? (
          <Button
            type="button"
            variant="outline"
            onClick={startScanning}
            disabled={disabled || loading}
          >
            <Camera className="h-4 w-4" />
            Camera scan
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={stopScanning}>
            <CameraOff className="h-4 w-4" />
            Stop camera
          </Button>
        )}
        <div className="flex items-center rounded-md border bg-background px-3 text-xs text-muted-foreground">
          {isScanning
            ? 'Point camera at QR or barcode'
            : 'Use handheld scanner, keyboard, or camera'}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    </section>
  );
}

function ActionPanel({
  session,
  closeReason,
  setCloseReason,
  completeEnabled,
  onComplete,
  onClose,
  onCancel,
  loading,
}: {
  session: DispatchSession;
  closeReason: string;
  setCloseReason: (value: string) => void;
  completeEnabled: boolean;
  onComplete: () => void;
  onClose: () => void;
  onCancel: () => void;
  loading: {
    complete: boolean;
    close: boolean;
    cancel: boolean;
  };
}) {
  const closed = CLOSED_STATUSES.has(session.status);

  return (
    <section className={cn(SURFACE_CLASS, 'p-4')}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
        <h3 className="text-base font-semibold">Dispatch control</h3>
      </div>

      <div className="mt-4 grid gap-2">
        <Button
          onClick={onComplete}
          disabled={!completeEnabled || loading.complete}
          className="h-11"
        >
          {loading.complete ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ClipboardCheck className="h-4 w-4" />
          )}
          Confirm Dispatch
        </Button>
      </div>

      {!closed && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label htmlFor="dispatch-close-reason">Close or cancel reason</Label>
            <Textarea
              id="dispatch-close-reason"
              value={closeReason}
              onChange={(event) => setCloseReason(event.target.value)}
              placeholder="Required before close or cancel"
              className="min-h-[92px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading.close || !closeReason.trim()}
              >
                {loading.close ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Close
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={loading.cancel || !closeReason.trim()}
              >
                {loading.cancel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function LineBoard({
  session,
  activeLine,
  canSelectAnyLine,
  onSelectLine,
}: {
  session: DispatchSession;
  activeLine: DispatchSessionLine | null;
  canSelectAnyLine: boolean;
  onSelectLine: (line: DispatchSessionLine) => void;
}) {
  return (
    <section className={SURFACE_CLASS}>
      <div className="border-b p-4">
        <h3 className="text-base font-semibold">Bill lines</h3>
      </div>
      <div className="divide-y divide-border">
        {session.lines.map((line) => (
          <LineRow
            key={line.id}
            line={line}
            active={activeLine?.id === line.id}
            canSelect={canSelectAnyLine && !isLineComplete(line)}
            onSelect={() => onSelectLine(line)}
          />
        ))}
      </div>
    </section>
  );
}

function LineRow({
  line,
  active,
  canSelect,
  onSelect,
}: {
  line: DispatchSessionLine;
  active: boolean;
  canSelect: boolean;
  onSelect: () => void;
}) {
  const complete = isLineComplete(line);
  const progress = getLineProgress(line);
  const Root = canSelect ? 'button' : 'div';

  return (
    <Root
      type={canSelect ? 'button' : undefined}
      onClick={canSelect ? onSelect : undefined}
      className={cn(
        'grid w-full gap-3 p-4 text-left lg:grid-cols-[80px_minmax(0,1fr)_260px]',
        active && 'bg-cyan-50/50 ring-1 ring-inset ring-cyan-300 dark:bg-cyan-950/30 dark:ring-cyan-800/60',
        canSelect && 'transition hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20',
      )}
    >
      <div>
        <p className="text-xs text-muted-foreground">Seq</p>
        <p className="font-mono text-lg font-semibold">{line.sequence_no}</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-mono text-sm font-semibold">{line.material_code}</p>
          {active && <Badge className={BADGE_TONE_CLASS.cyan}>Active</Badge>}
          {complete && (
            <Badge className={BADGE_TONE_CLASS.emerald}>Complete</Badge>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {line.material_description || '-'}
        </p>
        <div className="mt-3">
          <ProgressBar value={progress} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Bill"
          value={formatQtyWithBoxes(
            line.bill_qty,
            line.uom,
            line.expected_boxes ?? line.bill_boxes,
          )}
        />
        <StatTile
          label="Scanned"
          value={formatQtyWithBoxes(line.scanned_qty, line.uom, line.scanned_boxes)}
          tone="emerald"
        />
        <StatTile
          label="Pending"
          value={formatQtyWithBoxes(
            line.pending_qty || line.remaining_qty,
            line.uom,
            line.pending_boxes,
          )}
          tone="amber"
        />
      </div>
    </Root>
  );
}

function RecentScanStream({ logs }: { logs: DispatchScanLog[] }) {
  const recentLogs = useMemo(() => logs.slice(0, 8), [logs]);

  return (
    <section className={SURFACE_CLASS}>
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-base font-semibold">Recent scans</h3>
        <Badge className={BADGE_TONE_CLASS.slate}>
          {logs.length.toLocaleString('en-IN')}
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {recentLogs.length === 0 && (
          <div className="p-5 text-sm text-muted-foreground">
            No scans recorded for this dispatch.
          </div>
        )}
        {recentLogs.map((log) => {
          const accepted = log.result === 'ACCEPTED';
          return (
            <div key={log.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {accepted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-700 dark:text-rose-300" />
                  )}
                  <p className="truncate font-mono text-sm font-semibold">{log.raw_barcode}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDispatchScanMessage(log)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge
                  className={
                    accepted
                      ? BADGE_TONE_CLASS.emerald
                      : BADGE_TONE_CLASS.rose
                  }
                >
                  {log.result}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(log.scanned_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ScannedBoxesSection({
  session,
  highlightedBarcode,
  updating,
  removing,
  onUpdateQty,
  onRemove,
}: {
  session: DispatchSession;
  highlightedBarcode: string;
  updating: boolean;
  removing: boolean;
  onUpdateQty: (unit: DispatchScannedUnit, dispatchQty: number) => void;
  onRemove: (unit: DispatchScannedUnit) => void;
}) {
  const boxes = useMemo(
    () => session.scanned_units.filter((unit) => unit.entity_type === 'BOX'),
    [session.scanned_units],
  );
  const [draftQty, setDraftQty] = useState<Record<number, string>>({});

  const activeBoxes = boxes.filter((box) => box.scan_status !== 'REMOVED');
  const totalDispatchQty = activeBoxes.reduce((sum, box) => sum + toNumber(box.dispatch_qty), 0);
  const totalRemainingQty = activeBoxes.reduce((sum, box) => sum + toNumber(box.remaining_qty), 0);
  const removedBoxes = boxes.length - activeBoxes.length;

  const validateAndUpdate = (unit: DispatchScannedUnit) => {
    const value = Number(draftQty[unit.id]);
    if (!Number.isFinite(value) || value < 1) {
      toast.error('Dispatch Qty cannot be less than 1.');
      return;
    }
    if (value > toNumber(unit.total_box_qty)) {
      toast.error('Dispatch Qty cannot be greater than Total Box Qty.');
      return;
    }
    onUpdateQty(unit, value);
  };

  return (
    <section className={SURFACE_CLASS}>
      <div className="border-b p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Scanned Boxes</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatTile
              label="Boxes Scanned"
              value={activeBoxes.length.toLocaleString('en-IN')}
              tone="cyan"
            />
            <StatTile
              label="Dispatch Qty"
              value={formatQty(totalDispatchQty, 'PCS')}
              tone="emerald"
            />
            <StatTile
              label="Remaining Qty"
              value={formatQty(totalRemainingQty, 'PCS')}
              tone="amber"
            />
            <StatTile
              label="Removed"
              value={removedBoxes.toLocaleString('en-IN')}
              tone={removedBoxes ? 'rose' : 'slate'}
            />
          </div>
        </div>
      </div>

      {boxes.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">No boxes scanned yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {boxes.map((unit) => {
            const totalQty = toNumber(unit.total_box_qty);
            const dispatchQty = toNumber(unit.dispatch_qty);
            const remainingQty = Math.max(totalQty - dispatchQty, 0);
            const requiredPendingQty = toNumber(unit.required_pending_qty || unit.dispatch_qty);
            const availableQty = toNumber(unit.available_qty || unit.total_box_qty);
            const removed = unit.scan_status === 'REMOVED';
            const partial = !removed && remainingQty > 0;
            const highlighted = highlightedBarcode && highlightedBarcode === unit.barcode_value;
            return (
              <div
                key={unit.id}
                id={`scanned-box-${unit.id}`}
                className={cn(
                  'grid gap-4 p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_220px]',
                  highlighted && 'bg-amber-50 ring-2 ring-inset ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-800/70',
                  removed && 'bg-muted/40 opacity-75',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-mono text-base font-semibold">
                      {unit.box_barcode || unit.barcode_value}
                    </p>
                    <Badge
                      className={
                        removed
                          ? BADGE_TONE_CLASS.slate
                          : partial
                            ? BADGE_TONE_CLASS.amber
                            : BADGE_TONE_CLASS.emerald
                      }
                    >
                      {removed
                        ? 'Removed / Not Included'
                        : partial
                          ? 'Partial Dispatch'
                          : 'Full Dispatch'}
                    </Badge>
                    <Badge variant="outline">{unit.barcode_type || unit.entity_type}</Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-sm">
                    {unit.item_code || unit.material_code}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {unit.item_name || '-'}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Batch No</p>
                      <p className="font-mono font-medium">{unit.batch_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Warehouse</p>
                      <p className="font-medium">{unit.warehouse || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Scan Date/Time</p>
                      <p className="font-medium">{formatDateTime(unit.scanned_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dispatch Doc</p>
                      <p className="font-mono font-medium">{unit.dispatch_doc_no || session.bill_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Scanned By</p>
                      <p className="font-medium">{unit.scanned_by_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-medium">{unit.customer_name || session.customer_name || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Original Qty" value={formatQty(totalQty, unit.uom || 'PCS')} />
                  <StatTile
                    label="Available Qty"
                    value={formatQty(availableQty, unit.uom || 'PCS')}
                    tone="cyan"
                  />
                  <StatTile
                    label="Required Pending"
                    value={formatQty(requiredPendingQty, unit.uom || 'PCS')}
                    tone="amber"
                  />
                  <StatTile
                    label="Dispatch Qty"
                    value={formatQty(dispatchQty, unit.uom || 'PCS')}
                    tone="emerald"
                  />
                  <StatTile
                    label="Remaining Qty"
                    value={formatQty(remainingQty, unit.uom || 'PCS')}
                    tone={remainingQty ? 'amber' : 'slate'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`dispatch-qty-${unit.id}`}>Dispatch Qty</Label>
                  <Input
                    id={`dispatch-qty-${unit.id}`}
                    type="number"
                    min={1}
                    max={totalQty || undefined}
                    step="0.001"
                    value={draftQty[unit.id] ?? String(toNumber(unit.dispatch_qty) || '')}
                    disabled={removed || updating || removing}
                    onChange={(event) =>
                      setDraftQty((current) => ({ ...current, [unit.id]: event.target.value }))
                    }
                    className="h-11 text-base"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => validateAndUpdate(unit)}
                      disabled={removed || updating || removing}
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Edit Qty
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onRemove(unit)}
                      disabled={removed || updating || removing}
                    >
                      {removing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Remove Box
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SessionQueue({
  rows,
  selectedId,
  onOpen,
  loading,
  empty,
}: {
  rows: DispatchSession[];
  selectedId: number | null;
  onOpen: (sessionId: number) => void;
  loading: boolean;
  empty: string;
}) {
  return (
    <section className={SURFACE_CLASS}>
      {loading && <div className="p-5 text-sm text-muted-foreground">Loading dispatches...</div>}
      {!loading && rows.length === 0 && (
        <div className="p-5 text-sm text-muted-foreground">{empty}</div>
      )}
      {!loading && rows.length > 0 && (
        <div className="divide-y divide-border">
          {rows.map((session) => {
            const progress = getProgress(session);
            const scannedBoxes = getSessionBoxes(session, 'scanned_boxes');
            const pendingBoxes = getSessionBoxes(session, 'pending_boxes');
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onOpen(session.id)}
                className={cn(
                  'block w-full p-4 text-left transition hover:bg-muted/50',
                  selectedId === session.id && 'bg-cyan-50/70 dark:bg-cyan-950/30',
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-mono text-sm font-semibold">
                        {session.bill_number}
                      </p>
                      <Badge className={statusBadgeClass(session.status)}>
                        {SESSION_STATUS_LABEL[session.status] ?? session.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {session.customer_name || session.customer_code || '-'}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session.completed_line_count}/{session.line_count} lines
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <StatTile
                    label="Scanned"
                    value={formatQtyWithBoxes(session.total_scanned_qty, 'PCS', scannedBoxes)}
                    tone="emerald"
                  />
                  <StatTile
                    label="Pending"
                    value={formatQtyWithBoxes(session.pending_qty, 'PCS', pendingBoxes)}
                    tone="amber"
                  />
                  <StatTile label="Updated" value={formatDateTime(session.updated_at)} />
                </div>
                <ProgressBar value={progress} className="mt-3" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DispatchSettingsPanel() {
  const { data: settings } = useDispatchSettings();
  const updateSettings = useUpdateDispatchSettings();

  const toggle = async (key: keyof typeof settings, checked: boolean) => {
    if (!settings) return;
    try {
      await updateSettings.mutateAsync({ [key]: checked });
      toast.success('Dispatch setting updated');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to update dispatch setting.');
    }
  };

  if (!settings) return null;

  const rows: Array<[keyof typeof settings, string]> = [
    ['allow_partial_dispatch', 'Partial dispatch'],
    ['allow_partial_pallet_dispatch', 'Partial pallet'],
    ['allow_box_dispatch_from_pallet', 'Box from pallet'],
    ['require_sequential_item_scanning', 'Sequential scan'],
    ['allow_manual_close', 'Manual close'],
    ['allow_admin_override', 'Admin override'],
  ];

  return (
    <section className={cn(SURFACE_CLASS, 'p-4')}>
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">Controls</h3>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map(([key, label]) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3"
          >
            <span className="text-sm font-medium">{label}</span>
            <Switch
              checked={Boolean(settings[key])}
              onChange={(checked) => toggle(key, checked)}
              disabled={updateSettings.isPending}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function BarcodeDispatchPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<DispatchTab>('active');
  const [billNumber, setBillNumber] = useState('');
  const [lookupBill, setLookupBill] = useState<DispatchBillLookupResponse | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [highlightedBoxBarcode, setHighlightedBoxBarcode] = useState('');
  const [filters, setFilters] = useState({
    bill_number: '',
    customer: '',
    from_date: '',
    to_date: '',
  });

  const lookupMutation = useLookupDispatchBill();
  const createSessionMutation = useCreateDispatchSession();
  const submitScanMutation = useSubmitDispatchScan();
  const updateScannedBoxQtyMutation = useUpdateDispatchScannedBoxQty();
  const removeScannedBoxMutation = useRemoveDispatchScannedBox();
  const completeMutation = useDispatchSessionDispatch();
  const closeMutation = useCloseDispatchSession();
  const cancelMutation = useCancelDispatchSession();

  const activeSessions = useDispatchSessions({ ...filters, status_group: 'active' });
  const completedSessions = useDispatchSessions({ ...filters, status_group: 'completed' });
  const closedSessions = useDispatchSessions({ ...filters, status_group: 'closed' });
  const sessionQuery = useDispatchSession(selectedSessionId);
  const session = sessionQuery.data ?? null;
  const { data: scanLogs = [] } = useDispatchScanLogs(selectedSessionId);
  const { data: dispatchSettings } = useDispatchSettings();

  const rowsByTab = {
    active: activeSessions.data ?? [],
    completed: completedSessions.data ?? [],
    closed: closedSessions.data ?? [],
  };
  const loadingByTab = {
    active: activeSessions.isLoading,
    completed: completedSessions.isLoading,
    closed: closedSessions.isLoading,
  };

  const trimmedBillNumber = billNumber.trim();
  const sequentialScan = dispatchSettings?.require_sequential_item_scanning !== false;
  const defaultActiveLine = session ? getDispatchActiveLine(session) : null;
  const selectedLine = session?.lines.find((line) => line.id === selectedLineId) ?? null;
  const activeLine = sequentialScan ? defaultActiveLine : selectedLine || defaultActiveLine;
  const scanEnabled = canSubmitDispatchScan(session) && Boolean(activeLine);
  const completeEnabled = canMarkDispatchComplete(session);

  useEffect(() => {
    if (!session) {
      // Existing line selection state mirrors the loaded dispatch session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedLineId(null);
      return;
    }
    if (sequentialScan) {
      setSelectedLineId(null);
      return;
    }
    const current = session.lines.find((line) => line.id === selectedLineId);
    if (current && !isLineComplete(current)) return;

    setSelectedLineId(defaultActiveLine?.id ?? null);
  }, [defaultActiveLine?.id, selectedLineId, sequentialScan, session]);

  useEffect(() => {
    if (!highlightedBoxBarcode || !session) return;
    const unit = session.scanned_units.find((box) => box.barcode_value === highlightedBoxBarcode);
    if (!unit) return;
    window.setTimeout(() => {
      document.getElementById(`scanned-box-${unit.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 50);
    const timeout = window.setTimeout(() => setHighlightedBoxBarcode(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [highlightedBoxBarcode, session]);

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedBillNumber) {
      toast.error('Bill number is required');
      return;
    }

    try {
      const result = await lookupMutation.mutateAsync({ bill_number: trimmedBillNumber });
      setLookupBill(result);
      toast.success(`Bill ${result.bill_number} loaded`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to fetch bill details from SAP.');
    }
  };

  const handleStartSession = async () => {
    if (!trimmedBillNumber) {
      toast.error('Bill number is required');
      return;
    }

    try {
      const result = await createSessionMutation.mutateAsync({ bill_number: trimmedBillNumber });
      setSelectedSessionId(result.id);
      setLookupBill(null);
      setTab('active');
      toast.success(`Dispatch created for ${result.bill_number}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to start dispatch session.');
    }
  };

  const handleScan = async (barcode: string) => {
    if (!session || !scanEnabled) {
      toast.error('No active dispatch line is ready for scanning');
      return;
    }

    try {
      const result = await submitScanMutation.mutateAsync({
        sessionId: session.id,
        data: {
          barcode,
          line_id: sequentialScan ? null : activeLine?.id,
          device_id: 'web-dispatch-screen',
          request_id: getRequestId(),
        },
      });

      if (result.scan.result === 'ACCEPTED') {
        toast.success(formatDispatchScanMessage(result.scan));
      } else {
        toast.warning(formatDispatchScanMessage(result.scan));
        if (result.scan.reject_code === 'BOX_ALREADY_SCANNED') {
          setHighlightedBoxBarcode(result.scan.raw_barcode);
        }
      }
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to submit dispatch scan.');
    }
  };

  const handleComplete = async () => {
    if (!session || !completeEnabled) return;

    try {
      const result = await completeMutation.mutateAsync(session.id);
      setTab('completed');
      toast.success(`Bill ${result.bill_number} completed`);
      navigate(`/barcode/dispatch/summary/${result.id}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to complete dispatch.');
    }
  };

  const handleClose = async () => {
    if (!session || !closeReason.trim()) {
      toast.error('Close reason is required');
      return;
    }
    try {
      await closeMutation.mutateAsync({
        sessionId: session.id,
        data: { reason: closeReason.trim() },
      });
      setCloseReason('');
      setTab('closed');
      toast.success('Dispatch closed');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to close dispatch session.');
    }
  };

  const handleCancel = async () => {
    if (!session || !closeReason.trim()) {
      toast.error('Cancel reason is required');
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        sessionId: session.id,
        data: { reason: closeReason.trim() },
      });
      setCloseReason('');
      setTab('closed');
      toast.success('Dispatch cancelled');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to cancel dispatch session.');
    }
  };

  const handleUpdateScannedBoxQty = async (unit: DispatchScannedUnit, dispatchQty: number) => {
    if (!session) return;
    try {
      await updateScannedBoxQtyMutation.mutateAsync({
        sessionId: session.id,
        unitId: unit.id,
        dispatchQty,
      });
      setHighlightedBoxBarcode(unit.barcode_value);
      toast.success('Dispatch quantity updated');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to update scanned box quantity.');
    }
  };

  const handleRemoveScannedBox = async (unit: DispatchScannedUnit) => {
    if (!session) return;
    if (!window.confirm('Are you sure you want to remove this scanned box?')) return;
    try {
      await removeScannedBoxMutation.mutateAsync({
        sessionId: session.id,
        unitId: unit.id,
      });
      toast.success('Scanned box removed');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to remove scanned box.');
    }
  };

  return (
    <div className="space-y-5">
      <DashboardHeader
        title="Barcode Dispatch"
        description="Scanner-first dispatch operations for SAP bills, pallets, and boxes"
      >
        <Button variant="outline" onClick={() => navigate('/barcode/dispatch/reports')}>
          <BarChart3 className="h-4 w-4" />
          Reports
        </Button>
      </DashboardHeader>

      <SessionHero session={session} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="space-y-5">
          <section className={cn(SURFACE_CLASS, 'p-4')}>
            <form onSubmit={handleLookup} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Label htmlFor="dispatch-bill-number">SAP bill number</Label>
                <Input
                  id="dispatch-bill-number"
                  value={billNumber}
                  onChange={(event) => setBillNumber(event.target.value)}
                  placeholder="Billing document or invoice number"
                  autoComplete="off"
                  className="h-11"
                />
              </div>
              <div className="grid gap-2 self-end sm:grid-cols-2 lg:min-w-[320px]">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={lookupMutation.isPending}
                  className="h-11"
                >
                  {lookupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSearch className="h-4 w-4" />
                  )}
                  Lookup
                </Button>
                <Button
                  type="button"
                  onClick={handleStartSession}
                  disabled={createSessionMutation.isPending}
                  className="h-11"
                >
                  {createSessionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Start
                </Button>
              </div>
            </form>
          </section>

          {lookupBill && <BillLookupSummary bill={lookupBill} />}

          {sessionQuery.isLoading && selectedSessionId && (
            <section className={cn(SURFACE_CLASS, 'p-5 text-sm text-muted-foreground')}>
              Loading dispatch details...
            </section>
          )}

          {session && (
            <>
              <ActiveLineFocus activeLine={activeLine} />
              <LineBoard
                session={session}
                activeLine={activeLine}
                canSelectAnyLine={!sequentialScan}
                onSelectLine={(line) => setSelectedLineId(line.id)}
              />
              <ScannedBoxesSection
                session={session}
                highlightedBarcode={highlightedBoxBarcode}
                updating={updateScannedBoxQtyMutation.isPending}
                removing={removeScannedBoxMutation.isPending}
                onUpdateQty={handleUpdateScannedBoxQty}
                onRemove={handleRemoveScannedBox}
              />
              <RecentScanStream logs={scanLogs} />
            </>
          )}
        </main>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          {session && (
            <>
              <ScannerDock
                disabled={!scanEnabled}
                loading={submitScanMutation.isPending}
                onScan={handleScan}
              />
              <ActionPanel
                session={session}
                closeReason={closeReason}
                setCloseReason={setCloseReason}
                completeEnabled={completeEnabled}
                onComplete={handleComplete}
                onClose={handleClose}
                onCancel={handleCancel}
                loading={{
                  complete: completeMutation.isPending,
                  close: closeMutation.isPending,
                  cancel: cancelMutation.isPending,
                }}
              />
            </>
          )}

          <section className={cn(SURFACE_CLASS, 'p-4')}>
            <div className="mb-3 flex items-center gap-2">
              <TimerReset className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">Dispatch queue</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={filters.bill_number}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, bill_number: event.target.value }))
                }
                placeholder="Bill"
              />
              <Input
                value={filters.customer}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, customer: event.target.value }))
                }
                placeholder="Customer"
              />
              <Input
                type="date"
                value={filters.from_date}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, from_date: event.target.value }))
                }
              />
              <Input
                type="date"
                value={filters.to_date}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, to_date: event.target.value }))
                }
              />
            </div>
          </section>

          <Tabs value={tab} onValueChange={(value) => setTab(value as DispatchTab)}>
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-md">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Done</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <SessionQueue
                rows={rowsByTab.active}
                selectedId={selectedSessionId}
                onOpen={setSelectedSessionId}
                loading={loadingByTab.active}
                empty="No active dispatches."
              />
            </TabsContent>
            <TabsContent value="completed">
              <SessionQueue
                rows={rowsByTab.completed}
                selectedId={selectedSessionId}
                onOpen={setSelectedSessionId}
                loading={loadingByTab.completed}
                empty="No completed dispatches."
              />
            </TabsContent>
            <TabsContent value="closed">
              <SessionQueue
                rows={rowsByTab.closed}
                selectedId={selectedSessionId}
                onOpen={setSelectedSessionId}
                loading={loadingByTab.closed}
                empty="No closed dispatches."
              />
            </TabsContent>
          </Tabs>

          <DispatchSettingsPanel />

          {session && CLOSED_STATUSES.has(session.status) && (
            <div className="grid gap-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate(`/barcode/dispatch/summary/${session.id}`)}
              >
                <ClipboardCheck className="h-4 w-4" />
                Open summary
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate(`/barcode/dispatch/reports?session=${session.id}`)}
              >
                <BarChart3 className="h-4 w-4" />
                Open report
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
