import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Loader2,
  PackageMinus,
  ReceiptText,
  Search,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmSapPost } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  type ShortDispatchInvoiceLookup,
  type ShortDispatchReason,
  useCreateShortDispatch,
  useShortDispatchInvoiceLookup,
  useShortDispatchWarehouses,
} from '../api';
import { formatQty, REASON_OPTIONS } from '../utils';

/** One invoice line as the operator is editing it. */
interface EditableLine {
  lineNum: number;
  itemCode: string;
  itemName: string;
  uom: string;
  billed: number;
  alreadyShort: number;
  remaining: number;
  sourceWarehouse: string;
  batchNumber: string;
  /** Free text while typing; parsed only on submit. */
  shortQuantity: string;
  reason: ShortDispatchReason;
  remarks: string;
}

/**
 * Short Dispatch — one form, posted straight into SAP.
 *
 * Deliberately not a wizard. A short dispatch is keyed by the person standing in
 * front of the stock the bill says has gone, in one sitting: find the bill, say
 * what did not go, confirm where it goes back, post. Splitting that over pages
 * would only create drafts of corrections nobody made.
 */
export default function ShortDispatchNewPage() {
  const navigate = useNavigate();
  const lookup = useShortDispatchInvoiceLookup();
  const create = useCreateShortDispatch();
  const { data: warehouses = [] } = useShortDispatchWarehouses();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoice, setInvoice] = useState<ShortDispatchInvoiceLookup | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [warehouseCode, setWarehouseCode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const shortLines = useMemo(() => lines.filter((line) => Number(line.shortQuantity) > 0), [lines]);
  // Lines the bill picked off a different floor from the one the stock is going
  // back to. Not refused — a bill can be picked across floors and the return is
  // one document — but the operator should see it before they post.
  const offFloorLines = useMemo(
    () =>
      shortLines.filter((line) => line.sourceWarehouse && line.sourceWarehouse !== warehouseCode),
    [shortLines, warehouseCode],
  );

  async function handleLookup() {
    setError(null);
    const number = invoiceNumber.trim();
    if (!number) {
      setError('Enter the invoice number.');
      return;
    }
    try {
      const bill = await lookup.mutateAsync(number);
      setInvoice(bill);
      setWarehouseCode(bill.default_warehouse_code);
      setLines(
        bill.lines.map((line) => ({
          lineNum: line.line_num,
          itemCode: line.item_code,
          itemName: line.item_name,
          uom: line.uom,
          billed: line.quantity,
          alreadyShort: line.already_short,
          remaining: line.remaining_quantity,
          sourceWarehouse: line.warehouse_code,
          batchNumber: line.original_batch_number,
          shortQuantity: '',
          reason: 'SHORT',
          remarks: '',
        })),
      );
    } catch (err) {
      setInvoice(null);
      setLines([]);
      setError(getErrorMessage(err, `Could not read invoice ${number}.`));
    }
  }

  function updateLine(lineNum: number, patch: Partial<EditableLine>) {
    setLines((prev) =>
      prev.map((line) => (line.lineNum === lineNum ? { ...line, ...patch } : line)),
    );
  }

  async function handlePost() {
    setError(null);
    if (!invoice) return;
    if (shortLines.length === 0) {
      setError('Enter a short quantity for at least one item.');
      return;
    }
    if (!warehouseCode) {
      setError('Select the warehouse the stock goes back into.');
      return;
    }
    const over = shortLines.find((line) => Number(line.shortQuantity) > line.remaining);
    if (over) {
      setError(
        `${over.itemCode}: only ${formatQty(over.remaining)} ${over.uom} is left to return ` +
          `against this bill.`,
      );
      return;
    }

    const confirmed = await confirmSapPost({
      title: `Post the return note for invoice ${invoice.doc_num}?`,
      creates: (
        <>
          an A/R Return for {shortLines.length} item
          {shortLines.length === 1 ? '' : 's'} back into <strong>{warehouseCode}</strong>
        </>
      ),
      detail:
        'SAP mints a new batch number for the returned stock — the batch physically ' +
        'on the floor is recorded on the line, not reused.',
    });
    if (!confirmed) return;

    try {
      const entry = await create.mutateAsync({
        invoice_number: invoice.doc_num,
        warehouse_code: warehouseCode,
        remarks: remarks.trim(),
        lines: shortLines.map((line) => ({
          source_line_num: line.lineNum,
          short_quantity: Number(line.shortQuantity),
          reason: line.reason,
          remarks: line.remarks.trim(),
        })),
      });
      toast.success(
        entry.sap_return_doc_num
          ? `${entry.entry_no} posted — SAP Return ${entry.sap_return_doc_num}`
          : `${entry.entry_no} posted`,
      );
      navigate(`/warehouse/short-dispatch/${entry.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'SAP would not take the return note.'));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/warehouse/short-dispatch')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold">New Short Dispatch</h2>
          <p className="text-sm text-muted-foreground">
            The bill is posted, so SAP has already taken this stock out. Say what did not actually
            go and it is put back with a return note.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* The bill */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionTitle icon={<ReceiptText className="h-4 w-4" />} title="Invoice" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleLookup();
                }
              }}
              placeholder="Enter the SAP invoice number"
              autoFocus
            />
            <Button variant="outline" onClick={handleLookup} disabled={lookup.isPending}>
              {lookup.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Find Bill
            </Button>
          </div>

          {invoice && (
            <div className="space-y-3">
              <p className="text-sm">
                Invoice <span className="font-medium">{invoice.doc_num}</span> ·{' '}
                <span className="font-medium">{invoice.card_name}</span> ({invoice.card_code})
              </p>
              {invoice.existing_entries.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  <p className="font-medium">This bill has already been short once.</p>
                  <p className="mt-1 text-xs">
                    {invoice.existing_entries
                      .map(
                        (entry) =>
                          `${entry.entry_no}${
                            entry.sap_return_doc_num
                              ? ` (SAP Return ${entry.sap_return_doc_num})`
                              : ''
                          }`,
                      )
                      .join(', ')}
                    . What those returned is already off the quantities below.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {invoice && (
        <>
          {/* Where it goes back */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <SectionTitle icon={<WarehouseIcon className="h-4 w-4" />} title="Returns Into *" />
              <p className="text-xs text-muted-foreground">
                The stock never left the floor, so it goes back where the bill took it from.
                Preselected to the warehouse most of this bill was picked from — change it only if
                the goods are actually somewhere else.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <NativeSelect
                    value={warehouseCode}
                    onChange={(event) => setWarehouseCode(event.target.value)}
                  >
                    <SelectOption value="">Select warehouse</SelectOption>
                    {warehouses.map((warehouse) => (
                      <SelectOption key={warehouse.warehouse_code} value={warehouse.warehouse_code}>
                        {warehouse.warehouse_code} — {warehouse.warehouse_name}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Anything the store should know about this shortfall"
                    rows={2}
                  />
                </div>
              </div>

              {offFloorLines.length > 0 && (
                <p className="rounded-md border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  {offFloorLines.length} of the short items{' '}
                  {offFloorLines.length === 1 ? 'was' : 'were'} billed out of{' '}
                  {[...new Set(offFloorLines.map((line) => line.sourceWarehouse))].join(', ')}, not{' '}
                  {warehouseCode}. One return note posts into one warehouse, so all of it lands in{' '}
                  {warehouseCode}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* What did not go */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <SectionTitle icon={<PackageMinus className="h-4 w-4" />} title="What Did Not Go" />
                <span className="text-xs text-muted-foreground">
                  {shortLines.length} of {lines.length} line
                  {lines.length === 1 ? '' : 's'} short
                </span>
              </div>

              {lines.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  This invoice has no lines.
                </p>
              ) : (
                <div className="space-y-3">
                  {lines.map((line) => (
                    <LineRow
                      key={line.lineNum}
                      line={line}
                      onChange={(patch) => updateLine(line.lineNum, patch)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/warehouse/short-dispatch')}>
              Cancel
            </Button>
            <Button onClick={handlePost} disabled={create.isPending || shortLines.length === 0}>
              {create.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Boxes className="mr-2 h-4 w-4" />
              )}
              Post Return Note
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function LineRow({
  line,
  onChange,
}: {
  line: EditableLine;
  onChange: (patch: Partial<EditableLine>) => void;
}) {
  const entered = Number(line.shortQuantity) || 0;
  const isShort = entered > 0;
  const overRemaining = entered > line.remaining;

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border p-3 transition-colors',
        isShort && 'border-primary/50 bg-primary/5',
        overRemaining && 'border-destructive/60 bg-destructive/5',
      )}
    >
      <div>
        <p className="text-sm font-medium">{line.itemName || line.itemCode}</p>
        <p className="text-xs text-muted-foreground">
          {line.itemCode} · billed {formatQty(line.billed)} {line.uom}
          {line.sourceWarehouse ? ` from ${line.sourceWarehouse}` : ''}
          {line.batchNumber ? ` · batch ${line.batchNumber}` : ''}
          {line.alreadyShort > 0
            ? ` · ${formatQty(line.alreadyShort)} already returned, ${formatQty(line.remaining)} left`
            : ''}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,220px)_minmax(0,1fr)]">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Short qty</span>
          <Input
            type="number"
            min={0}
            step="0.001"
            max={line.remaining || undefined}
            value={line.shortQuantity}
            onChange={(event) => onChange({ shortQuantity: event.target.value })}
            className="h-9"
            // A number input edits itself when scrolled past; blurring hands the
            // scroll back to the page.
            onWheel={(event) => event.currentTarget.blur()}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Reason</span>
          <NativeSelect
            value={line.reason}
            disabled={!isShort}
            onChange={(event) => onChange({ reason: event.target.value as ShortDispatchReason })}
            className="h-9"
          >
            {REASON_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Note</span>
          <Input
            value={line.remarks}
            disabled={!isShort}
            onChange={(event) => onChange({ remarks: event.target.value })}
            placeholder="Optional"
            className="h-9"
          />
        </label>
      </div>

      {overRemaining && (
        <p className="text-xs text-destructive">
          Only {formatQty(line.remaining)} {line.uom} is left to return against this line.
        </p>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      {icon}
      {title}
    </div>
  );
}
