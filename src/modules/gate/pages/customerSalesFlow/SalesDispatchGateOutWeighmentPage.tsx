import { AlertCircle, Boxes, ClipboardList, FileText, PackageCheck, Scale, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type CreateWeighmentRequest,
  type SalesDispatchBoxScan,
  type SalesDispatchGateOut,
  type SalesDispatchItem,
  useCreateWeighment,
  useSalesDispatchByVehicleEntry,
  useSetSalesDispatchChallanWeight,
  useWeighment,
  type Weighment,
} from '@/modules/gate/api';
import {
  RequiredWeighmentForm,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
import {
  buildRequiredWeighmentDateTime,
  EMPTY_REQUIRED_WEIGHMENT,
  type RequiredWeighmentValues,
} from '@/modules/gate/utils';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { getExpectedDispatchBoxes, parsePositiveNumber } from './salesDispatchBoxCounts';
import { formatTimestamp, formatValue, toTimeInputValue } from './salesDispatchFlow.helpers';
import { getSalesDispatchRoutes } from './salesDispatchRoutes';

const GATE_OUT_WEIGHMENT_TOTAL_STEPS = 2;

function buildValuesFromWeighment(weighment?: Weighment | null): RequiredWeighmentValues {
  if (!weighment) return EMPTY_REQUIRED_WEIGHMENT;

  return {
    grossWeight: weighment.gross_weight || '',
    tareWeight: weighment.tare_weight || '',
    weighbridgeSlipNo: weighment.weighbridge_slip_no || '',
    firstWeighmentTime: weighment.first_weighment_time
      ? weighment.first_weighment_time.slice(11, 16)
      : '',
    secondWeighmentTime: weighment.second_weighment_time
      ? weighment.second_weighment_time.slice(11, 16)
      : toTimeInputValue(),
  };
}

function validateGateOutWeighment(values: RequiredWeighmentValues) {
  const gross = toFiniteNumber(values.grossWeight);
  const tare = toFiniteNumber(values.tareWeight);

  if (tare === null || tare < 0) {
    return 'Tare weight is required before sales dispatch out.';
  }
  if (gross === null || gross <= 0) {
    return 'Gross weight is required before sales dispatch out.';
  }
  if (gross < tare) {
    return 'Gross weight cannot be less than tare weight.';
  }

  return '';
}

export default function SalesDispatchGateOutWeighmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = getSalesDispatchRoutes(location.pathname);
  const { entryId, entryIdNumber } = useEntryId();
  const [values, setValues] = useState<RequiredWeighmentValues>(EMPTY_REQUIRED_WEIGHMENT);
  const [challanWeight, setChallanWeightValue] = useState('');
  const [error, setError] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const vehicleEntryId = entry?.vehicle_entry || entryIdNumber || null;
  const {
    data: weighment,
    isLoading: isWeighmentLoading,
    error: weighmentError,
  } = useWeighment(vehicleEntryId);
  const saveWeighment = useCreateWeighment(vehicleEntryId || 0);
  const saveChallanWeight = useSetSalesDispatchChallanWeight();

  useEffect(() => {
    if (!weighment) return;

    const timerId = window.setTimeout(() => {
      setValues(buildValuesFromWeighment(weighment));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [weighment]);

  // Seed the input from any previously stored manual challan weight. Left blank when none,
  // so an untouched field falls back to the SAP invoice weight rather than persisting a value.
  useEffect(() => {
    const stored = entry?.challan_weight;
    const next = stored !== null && stored !== undefined && stored !== '' ? String(stored) : '';
    const timerId = window.setTimeout(() => setChallanWeightValue(next), 0);
    return () => window.clearTimeout(timerId);
  }, [entry?.id, entry?.challan_weight]);

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleNext = async () => {
    if (!entry || !vehicleEntryId) {
      setError('Sales dispatch out entry not found.');
      return;
    }
    if (entry.status !== 'PRINT_COMMITTED') {
      setError('Gatepass print must be committed before recording gate-out weighment.');
      return;
    }

    const validationError = validateGateOutWeighment(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (challanWeight.trim() !== '') {
      const challanNum = Number(challanWeight);
      if (!Number.isFinite(challanNum) || challanNum < 0) {
        setError('Enter a valid challan weight, or leave it blank to use the SAP invoice weight.');
        return;
      }
    }

    const payload: CreateWeighmentRequest = {
      gross_weight: Number(values.grossWeight),
      tare_weight: Number(values.tareWeight),
      weighbridge_slip_no: values.weighbridgeSlipNo,
      second_weighment_time: buildRequiredWeighmentDateTime(
        values.secondWeighmentTime || toTimeInputValue(),
      ),
    };
    if (values.firstWeighmentTime) {
      payload.first_weighment_time = buildRequiredWeighmentDateTime(values.firstWeighmentTime);
    }

    try {
      const desiredChallan = challanWeight.trim() === '' ? null : Number(challanWeight);
      const storedChallan = toFiniteNumber(entry.challan_weight);
      const challanChanged =
        desiredChallan === null
          ? storedChallan !== null
          : storedChallan === null || Math.abs(desiredChallan - storedChallan) > 1e-9;
      if (challanChanged) {
        await saveChallanWeight.mutateAsync({
          id: entry.id,
          data: { challan_weight: desiredChallan },
        });
      }
      await saveWeighment.mutateAsync(payload);
      await refetchEntry();
      toast.success('Gross weight saved');
      navigate(routes.gatepass(entry.vehicle_entry));
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to save gross weight'));
    }
  };

  if (isEntryLoading || isWeighmentLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entryId || !entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={1}
          totalSteps={GATE_OUT_WEIGHMENT_TOTAL_STEPS}
          title="Sales Dispatch Out"
          error={
            error ||
            (entryError ? getErrorMessage(entryError, 'Sales dispatch out entry not found') : null)
          }
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Sales dispatch out entry details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(routes.dashboard)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const contextError = weighmentError
    ? getErrorMessage(weighmentError, 'Unable to load existing weighment')
    : '';

  const scans = entry.box_scans ?? [];
  const scannedBoxes = scans.length;
  const scannedQty = scans.reduce((sum, scan) => sum + parsePositiveNumber(scan.quantity), 0);
  const scannedNetWeight = scans.reduce(
    (sum, scan) => sum + parsePositiveNumber(scan.net_weight),
    0,
  );
  const expectedBoxes = getExpectedDispatchBoxes(entry);
  const invoiceItems = getInvoiceItems(entry);
  const sapInvoiceWeight = parsePositiveNumber(entry.total_weight);
  const invoiceBoxes = parsePositiveNumber(entry.total_boxes);
  const scanSkipApproved = Boolean(entry.gatepass_readiness?.scan_skip_approved);

  const enteredChallanWeight = toFiniteNumber(challanWeight);
  const isManualChallanWeight = enteredChallanWeight !== null && enteredChallanWeight > 0;
  // The operator-entered challan weight wins; fall back to the SAP invoice weight when blank.
  const effectiveChallanWeight = isManualChallanWeight ? enteredChallanWeight : sapInvoiceWeight;

  const grossNum = toFiniteNumber(values.grossWeight);
  const tareNum = toFiniteNumber(values.tareWeight);
  const netWeight = grossNum !== null && tareNum !== null ? grossNum - tareNum : null;

  const isSaving = saveWeighment.isPending || saveChallanWeight.isPending;

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={1}
        totalSteps={GATE_OUT_WEIGHMENT_TOTAL_STEPS}
        title="Sales Dispatch Out"
        error={error || contextError || null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Dispatch Context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Vehicle" value={entry.vehicle_no} />
          <InfoItem label="Driver" value={entry.driver_name} />
          <InfoItem label="Gatepass No." value={entry.gatepass_no} />
          <InfoItem
            label={entry.document_type === 'STOCK_TRANSFER' ? 'SAP Document' : 'Invoice'}
            value={entry.sap_doc_num}
          />
          <InfoItem
            label="Customer / Destination"
            value={entry.customer_name || entry.to_warehouse}
          />
          <InfoItem label="Tare Weight" value={formatWeight(values.tareWeight)} />
          <InfoItem label="Gatepass Printed" value={formatTimestamp(entry.printed_at)} />
          <InfoItem label="Print Committed" value={formatTimestamp(entry.print_committed_at)} />
        </CardContent>
      </Card>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">Record loaded vehicle gross weight</p>
            <p className="mt-1">
              Enter the loaded gross weight here. If the tare weight was missed during empty vehicle
              in, enter it here as well; it will stay on the same vehicle weighment record.
            </p>
          </div>
        </div>
      </div>

      <RequiredWeighmentForm
        values={values}
        onChange={handleValueChange}
        disabled={isSaving}
        requiredFields={{ grossWeight: true, tareWeight: true }}
      />

      <ChallanWeightCard
        value={challanWeight}
        onChange={(next) => {
          setChallanWeightValue(next);
          setError('');
        }}
        sapInvoiceWeight={sapInvoiceWeight}
        enteredBy={entry.challan_weight_by_name}
        enteredAt={entry.challan_weight_at}
        disabled={isSaving}
      />

      <WeightCheckCard
        challanWeight={effectiveChallanWeight}
        isManual={isManualChallanWeight}
        gross={grossNum}
        tare={tareNum}
        net={netWeight}
      />

      <DockingLoadCard
        scans={scans}
        scannedBoxes={scannedBoxes}
        scannedQty={scannedQty}
        scannedNetWeight={scannedNetWeight}
        expectedBoxes={expectedBoxes}
        invoiceItems={invoiceItems}
        invoiceWeight={sapInvoiceWeight}
        invoiceBoxes={invoiceBoxes}
        scanSkipApproved={scanSkipApproved}
      />

      <StepFooter
        onPrevious={() => navigate(routes.detail(entry.id))}
        onCancel={() => navigate(routes.dashboard)}
        onNext={handleNext}
        isSaving={isSaving}
        nextLabel={isSaving ? 'Saving...' : 'Save and Continue to Gate Out'}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        <FileText className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 font-medium">{formatValue(value)}</div>
    </div>
  );
}

const VARIANCE_TONE = {
  good: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', label: 'Within tolerance' },
  warn: { box: 'border-amber-200 bg-amber-50 text-amber-800', label: 'Check the load' },
  bad: { box: 'border-red-200 bg-red-50 text-red-800', label: 'Large weight mismatch' },
  neutral: { box: 'border-slate-200 bg-slate-50 text-slate-700', label: 'Comparison' },
} as const;

function getVarianceTone(pct: number | null): keyof typeof VARIANCE_TONE {
  if (pct === null) return 'neutral';
  const abs = Math.abs(pct);
  if (abs <= 2) return 'good';
  if (abs <= 5) return 'warn';
  return 'bad';
}

function ChallanWeightCard({
  value,
  onChange,
  sapInvoiceWeight,
  enteredBy,
  enteredAt,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  sapInvoiceWeight: number;
  enteredBy?: string | null;
  enteredAt?: string | null;
  disabled?: boolean;
}) {
  const hasSapWeight = sapInvoiceWeight > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Challan Weight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Enter the weight from the delivery challan to check the loaded net weight against it. Use
          this when the SAP invoice weight is missing or wrong. Leave it blank to compare against the
          SAP invoice weight.
        </p>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="challan-weight">Challan Weight (kg)</Label>
          <Input
            id="challan-weight"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={hasSapWeight ? `SAP invoice: ${formatNumber(sapInvoiceWeight)}` : 'e.g. 2450'}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {hasSapWeight
            ? `SAP invoice weight: ${formatKg(sapInvoiceWeight)}.`
            : 'This SAP invoice has no weight.'}
          {enteredBy
            ? ` Last set by ${enteredBy}${enteredAt ? ` on ${formatTimestamp(enteredAt)}` : ''}.`
            : ''}
        </p>
      </CardContent>
    </Card>
  );
}

function WeightCheckCard({
  challanWeight,
  isManual,
  gross,
  tare,
  net,
}: {
  challanWeight: number;
  isManual: boolean;
  gross: number | null;
  tare: number | null;
  net: number | null;
}) {
  const hasChallanWeight = challanWeight > 0;
  const variance = net !== null && hasChallanWeight ? net - challanWeight : null;
  const variancePct =
    variance !== null && hasChallanWeight ? (variance / challanWeight) * 100 : null;
  const tone = getVarianceTone(variancePct);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Challan vs Loaded Weight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Challan Weight"
            value={hasChallanWeight ? formatKg(challanWeight) : 'Not set'}
            hint={isManual ? 'Manually entered' : 'From SAP invoice'}
          />
          <MetricTile
            label="Gross Weight"
            value={gross !== null ? formatKg(gross) : '—'}
            hint="Loaded vehicle"
          />
          <MetricTile
            label="Tare Weight"
            value={tare !== null ? formatKg(tare) : '—'}
            hint="Empty vehicle"
          />
          <MetricTile
            label="Net Weight"
            value={net !== null ? formatKg(net) : '—'}
            hint="Gross − Tare"
            emphasis
          />
        </div>

        {net === null ? (
          <p className="text-sm text-muted-foreground">
            Enter gross and tare weight to compare the loaded net weight against the challan.
          </p>
        ) : !hasChallanWeight ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            No challan or invoice weight to compare against. Enter a challan weight above. Net loaded
            weight is {formatKg(net)}.
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm',
              VARIANCE_TONE[tone].box,
            )}
          >
            <span className="font-medium">{VARIANCE_TONE[tone].label}</span>
            <span>
              Net {formatKg(net)} vs Challan {formatKg(challanWeight)} ·{' '}
              <span className="font-semibold">
                {variance !== null && variance >= 0 ? '+' : ''}
                {variance !== null ? formatKg(variance) : '—'}
                {variancePct !== null
                  ? ` (${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%)`
                  : ''}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DockingLoadCard({
  scans,
  scannedBoxes,
  scannedQty,
  scannedNetWeight,
  expectedBoxes,
  invoiceItems,
  invoiceWeight,
  invoiceBoxes,
  scanSkipApproved,
}: {
  scans: SalesDispatchBoxScan[];
  scannedBoxes: number;
  scannedQty: number;
  scannedNetWeight: number;
  expectedBoxes: number;
  invoiceItems: SalesDispatchItem[];
  invoiceWeight: number;
  invoiceBoxes: number;
  scanSkipApproved: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          Docking Load
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricTile
            label="Scanned Boxes"
            value={
              expectedBoxes > 0
                ? `${scannedBoxes} / ${formatNumber(expectedBoxes)}`
                : String(scannedBoxes)
            }
            hint="Boxes scanned at docking"
          />
          <MetricTile label="Scanned Qty" value={scannedQty > 0 ? formatNumber(scannedQty) : '—'} />
          <MetricTile
            label="Scanned Net Weight"
            value={scannedNetWeight > 0 ? formatKg(scannedNetWeight) : '—'}
            hint="Sum of scanned box weights"
          />
          <MetricTile label="Invoice Boxes" value={invoiceBoxes > 0 ? formatNumber(invoiceBoxes) : '—'} />
          <MetricTile label="Invoice Weight" value={invoiceWeight > 0 ? formatKg(invoiceWeight) : '—'} />
        </div>

        {scannedBoxes === 0 && scanSkipApproved ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <PackageCheck className="h-4 w-4" />
            Box scanning was skipped for this entry (approved by admin).
          </div>
        ) : null}

        {invoiceItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Item</th>
                  <th className="p-2 text-right font-medium">Invoice Qty</th>
                  <th className="p-2 text-right font-medium">Boxes</th>
                  <th className="p-2 text-right font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => {
                  const weight = parsePositiveNumber(item.total_weight);
                  const boxes = parsePositiveNumber(item.total_boxes);
                  const qty = parsePositiveNumber(item.quantity);
                  return (
                    <tr key={`${item.id}-${index}`} className="border-b last:border-b-0">
                      <td className="p-2">
                        <div className="font-medium">{formatValue(item.item_code)}</div>
                        <div className="max-w-[280px] truncate text-xs text-muted-foreground">
                          {item.item_name || '-'}
                        </div>
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {qty > 0 ? [formatNumber(qty), item.uom].filter(Boolean).join(' ') : '-'}
                      </td>
                      <td className="p-2 text-right tabular-nums">{boxes > 0 ? formatNumber(boxes) : '-'}</td>
                      <td className="p-2 text-right tabular-nums">{weight > 0 ? formatKg(weight) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {scans.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              Scanned boxes ({scans.length})
            </div>
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 border-b bg-muted">
                  <tr>
                    <th className="p-2 text-left font-medium">Barcode</th>
                    <th className="p-2 text-left font-medium">Item</th>
                    <th className="p-2 text-left font-medium">Batch</th>
                    <th className="p-2 text-right font-medium">Qty</th>
                    <th className="p-2 text-right font-medium">Net Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => {
                    const boxNetWeight = parsePositiveNumber(scan.net_weight);
                    return (
                      <tr key={scan.id} className="border-b last:border-b-0">
                        <td className="p-2 font-mono text-xs">{scan.box_barcode}</td>
                        <td className="p-2">{formatValue(scan.item_code)}</td>
                        <td className="p-2">{formatValue(scan.batch_number)}</td>
                        <td className="p-2 text-right tabular-nums">
                          {[scan.quantity, scan.uom].filter(Boolean).join(' ') || '-'}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {boxNetWeight > 0 ? formatKg(boxNetWeight) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={cn('rounded-md border bg-muted/20 p-3', emphasis && 'border-primary/40 bg-primary/5')}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function getInvoiceItems(entry: SalesDispatchGateOut): SalesDispatchItem[] {
  if (entry.items?.length) return entry.items;
  return entry.documents?.flatMap((document) => document.items || []) || [];
}

function formatKg(value: number) {
  return `${formatNumber(value)} kg`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

function formatWeight(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '';
  return `${value} kg`;
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
