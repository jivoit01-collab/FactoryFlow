import {
  AlertCircle,
  Boxes,
  ClipboardList,
  FileText,
  PackageCheck,
  PackagePlus,
  Plus,
  Scale,
  ShieldCheck,
  Trash2,
  Truck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type CreateWeighmentRequest,
  type SalesDispatchBoxScan,
  type SalesDispatchGateOut,
  type SalesDispatchItem,
  useCreateWeighment,
  useSalesDispatchByVehicleEntry,
  useSetSalesDispatchAdditionalWeights,
  useSetSalesDispatchChallanWeight,
  useWeighment,
  type Weighment,
} from '@/modules/gate/api';
import { useArrivalDockings } from '@/modules/gate/api/arrivals/arrivals.queries';
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

import {
  getExpectedDispatchBoxes,
  getExpectedDispatchLoose,
  parsePositiveNumber,
} from './salesDispatchBoxCounts';
import {
  formatTimestamp,
  formatValue,
  isMultiDockingTruck,
  toTimeInputValue,
} from './salesDispatchFlow.helpers';
import { getSalesDispatchRoutes } from './salesDispatchRoutes';
import {
  formatLooseScanNote,
  getScanTargetPacking,
  mergeScanProgress,
  summarizeScanProgress,
} from './salesDispatchScanSummary';

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
  const [additionalRows, setAdditionalRows] = useState<AdditionalWeightRow[]>([]);
  const [error, setError] = useState('');
  const rowKeyRef = useRef(0);

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
  // One physical truck can carry several dockings (a multi-company truck, or two
  // same-company bills docked separately). The weighbridge weighs the whole truck,
  // so the invoice-weight/box comparisons below must span every docking on the
  // arrival, not just the one this entryId resolves to.
  const isMultiDocking = isMultiDockingTruck(entry);
  const arrivalDockings = useArrivalDockings(entry?.arrival, { enabled: isMultiDocking });
  const saveWeighment = useCreateWeighment(vehicleEntryId || 0);
  const saveChallanWeight = useSetSalesDispatchChallanWeight();
  const saveAdditionalWeights = useSetSalesDispatchAdditionalWeights();

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

  // Seed the additional-weight rows from any previously saved line items, once per entry.
  useEffect(() => {
    const items = entry?.additional_weights ?? [];
    const timerId = window.setTimeout(() => {
      setAdditionalRows(
        items.map((item) => ({
          key: `existing-${item.id}`,
          name: item.name,
          weight: String(item.weight ?? ''),
        })),
      );
    }, 0);
    return () => window.clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleAddAdditionalRow = () => {
    rowKeyRef.current += 1;
    setAdditionalRows((rows) => [...rows, { key: `new-${rowKeyRef.current}`, name: '', weight: '' }]);
    setError('');
  };

  const handleAdditionalRowChange = (key: string, field: 'name' | 'weight', value: string) => {
    setAdditionalRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
    setError('');
  };

  const handleRemoveAdditionalRow = (key: string) => {
    setAdditionalRows((rows) => rows.filter((row) => row.key !== key));
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

    const additionalItems = buildAdditionalWeightItems(additionalRows);
    if (additionalItems === null) {
      setError('Each additional weight needs a name and a valid weight (0 or more).');
      return;
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
      const storedAdditional = (entry.additional_weights ?? []).map((item) => ({
        name: item.name,
        weight: Number(item.weight),
      }));
      const additionalChanged =
        JSON.stringify(additionalItems) !== JSON.stringify(storedAdditional);
      if (additionalChanged) {
        await saveAdditionalWeights.mutateAsync({
          id: entry.id,
          data: { items: additionalItems },
        });
      }
      // Gross weighment already saved and unchanged -> skip the redundant save + toast.
      const weighmentChanged =
        !weighment ||
        JSON.stringify(values) !== JSON.stringify(buildValuesFromWeighment(weighment));
      if (weighmentChanged) {
        await saveWeighment.mutateAsync(payload);
      }
      if (challanChanged || additionalChanged || weighmentChanged) {
        await refetchEntry();
        toast.success('Gross weight saved');
      }
      navigate(routes.gatepass(entry.vehicle_entry));
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to save gross weight'));
    }
  };

  // Also wait for the sibling dockings on a multi-docking truck: rendering before
  // they arrive would flash single-bill totals that then jump to the combined load.
  if (isEntryLoading || isWeighmentLoading || (isMultiDocking && arrivalDockings.isLoading)) {
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

  // The whole load on this truck: every docking on the arrival when there are
  // several (their bills all ride out on this one weighbridge pass), else just
  // this docking. All the scan/box/weight numbers below are truck-wide.
  const truckDockings =
    isMultiDocking && arrivalDockings.dockings.length > 1 ? arrivalDockings.dockings : [entry];
  const isCombinedLoad = truckDockings.length > 1;

  const scans = truckDockings.flatMap((docking) => docking.box_scans ?? []);
  // Split the labels the way the bill prints its goods: only FULL boxes are comparable to
  // the expected box count. A bill invoicing 180 pcs of a 16-PCS item prints 11 boxes + 4
  // loose, and those 4 ride out in a 12th carton with its own barcode — counting it as a
  // box is what showed a complete truck as "376 / 375" on the weighbridge screen.
  const scanProgress = mergeScanProgress(
    truckDockings.map((docking) =>
      summarizeScanProgress(getInvoiceItems(docking), docking.box_scans ?? []),
    ),
  );
  const scannedBoxes = scanProgress.fullBoxes;
  const scannedQty = scans.reduce((sum, scan) => sum + parsePositiveNumber(scan.quantity), 0);
  const scannedNetWeight = scans.reduce(
    (sum, scan) => sum + parsePositiveNumber(scan.net_weight),
    0,
  );
  // Boxes/loose the load can physically be scanned as: grouped per (bill, item) and split
  // once, not the sum of the bill's per-line splits -- lines of 13 and 67 pcs of a 16-PCS
  // item print "4 boxes + 16 loose" where the floor packs 5 whole boxes.
  const scanTargets = truckDockings.map((docking) => {
    const items = getInvoiceItems(docking);
    if (items.length) return getScanTargetPacking(items);
    return {
      boxes: getExpectedDispatchBoxes(docking),
      loose: getExpectedDispatchLoose(docking),
    };
  });
  const expectedBoxes = scanTargets.reduce((sum, target) => sum + target.boxes, 0);
  const expectedLoose = scanTargets.reduce((sum, target) => sum + target.loose, 0);
  const scanNote = formatLooseScanNote(scanProgress, expectedLoose);
  const invoiceItems = truckDockings.flatMap((docking) => getInvoiceItems(docking));
  const sapInvoiceWeight = truckDockings.reduce(
    (sum, docking) => sum + parsePositiveNumber(docking.total_weight),
    0,
  );
  const invoiceBoxes = truckDockings.reduce(
    (sum, docking) => sum + parsePositiveNumber(docking.total_boxes),
    0,
  );
  const scanSkipApproved = truckDockings.some((docking) =>
    Boolean(docking.gatepass_readiness?.scan_skip_approved),
  );
  const partialScanApproved = truckDockings.some((docking) =>
    Boolean(docking.gatepass_readiness?.partial_scan_approved),
  );

  // Truck-wide identity fields: on a combined load, name every gatepass/bill/customer
  // on the truck rather than only this docking's.
  const displayGatepassNo = isCombinedLoad
    ? joinUnique(truckDockings.map((docking) => docking.gatepass_no))
    : entry.gatepass_no;
  const displayDocNums = isCombinedLoad
    ? joinUnique(truckDockings.map((docking) => docking.sap_doc_num))
    : entry.sap_doc_num;
  const displayCustomer = isCombinedLoad
    ? joinUnique(truckDockings.map((docking) => docking.customer_name || docking.to_warehouse))
    : entry.customer_name || entry.to_warehouse;

  const enteredChallanWeight = toFiniteNumber(challanWeight);
  const isManualChallanWeight = enteredChallanWeight !== null && enteredChallanWeight > 0;
  // The operator-entered challan weight wins; fall back to the SAP invoice weight when blank.
  const effectiveChallanWeight = isManualChallanWeight ? enteredChallanWeight : sapInvoiceWeight;

  const grossNum = toFiniteNumber(values.grossWeight);
  const tareNum = toFiniteNumber(values.tareWeight);
  const netWeight = grossNum !== null && tareNum !== null ? grossNum - tareNum : null;

  const isSaving =
    saveWeighment.isPending || saveChallanWeight.isPending || saveAdditionalWeights.isPending;

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={1}
        totalSteps={GATE_OUT_WEIGHMENT_TOTAL_STEPS}
        title="Sales Dispatch Out"
        error={error || contextError || null}
      />

      <ScanApprovalNotice
        scanSkipApproved={scanSkipApproved}
        partialScanApproved={partialScanApproved}
        scannedBoxes={scannedBoxes}
        expectedBoxes={expectedBoxes}
      />

      {isCombinedLoad ? <CombinedLoadNotice dockings={truckDockings} currentId={entry.id} /> : null}

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
          <InfoItem
            label={isCombinedLoad ? 'Gatepass Nos.' : 'Gatepass No.'}
            value={displayGatepassNo}
          />
          <InfoItem
            label={
              entry.document_type === 'STOCK_TRANSFER'
                ? 'SAP Document'
                : isCombinedLoad
                  ? 'Invoices'
                  : 'Invoice'
            }
            value={displayDocNums}
          />
          <InfoItem label="Customer / Destination" value={displayCustomer} />
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
        scanNote={scanNote}
        scannedQty={scannedQty}
        scannedNetWeight={scannedNetWeight}
        expectedBoxes={expectedBoxes}
        expectedLoose={expectedLoose}
        invoiceItems={invoiceItems}
        invoiceWeight={sapInvoiceWeight}
        invoiceBoxes={invoiceBoxes}
        scanSkipApproved={scanSkipApproved}
      />

      <AdditionalWeightCard
        rows={additionalRows}
        net={netWeight}
        invoiceWeight={sapInvoiceWeight}
        challanWeight={effectiveChallanWeight}
        disabled={isSaving}
        onAdd={handleAddAdditionalRow}
        onChange={handleAdditionalRowChange}
        onRemove={handleRemoveAdditionalRow}
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

// Tell the gate, before it records the gross weight and dispatches, that this vehicle is
// leaving with an admin-approved scan waiver: a full skip ("fully approved on request" —
// no boxes scanned) or a partial scan ("partially approved" — some boxes scanned, the
// shortfall waived). Read from the same gatepass_readiness flags the scan gate enforces.
function ScanApprovalNotice({
  scanSkipApproved,
  partialScanApproved,
  scannedBoxes,
  expectedBoxes,
}: {
  scanSkipApproved: boolean;
  partialScanApproved: boolean;
  scannedBoxes: number;
  expectedBoxes: number;
}) {
  if (!scanSkipApproved && !partialScanApproved) return null;
  const isFullSkip = scanSkipApproved && scannedBoxes === 0;
  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-medium">
          {isFullSkip ? 'Box scan waived — approved' : 'Partial dispatch — approved'}
        </p>
        <p className="text-sm">
          {isFullSkip
            ? 'This vehicle is dispatching without box scanning, approved by admin on request. No boxes were scanned for this load.'
            : `This vehicle is dispatching with a partial box scan${
                expectedBoxes > 0 ? ` (${scannedBoxes} of ${formatNumber(expectedBoxes)} boxes)` : ''
              }, approved by admin on request.`}
        </p>
      </div>
    </div>
  );
}

// One physical truck, several dockings (multi-company or a same-company split load):
// tell the weighbridge operator up front that every number on this page is truck-wide,
// and list the bills/gatepasses riding on this load so none is missed at the gate.
function CombinedLoadNotice({
  dockings,
  currentId,
}: {
  dockings: SalesDispatchGateOut[];
  currentId: number;
}) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <div className="flex items-start gap-3">
        <Boxes className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-2">
          <p className="font-medium">
            One truck, {dockings.length} dockings — comparing against the combined load
          </p>
          <p>
            The weighbridge weighs the whole vehicle, so the invoice weight, box, and scan totals on
            this page cover every bill on this truck, not just this docking&apos;s.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {dockings.map((docking) => {
              const weight = parsePositiveNumber(docking.total_weight);
              return (
                <li key={docking.id}>
                  <span className="font-medium">{docking.sap_doc_num || docking.entry_no}</span>
                  {' — '}
                  {docking.customer_name || docking.to_warehouse || 'Unknown customer'}
                  {docking.gatepass_no ? ` · ${docking.gatepass_no}` : ''}
                  {weight > 0 ? ` · ${formatKg(weight)}` : ''}
                  {docking.id === currentId ? ' (this page)' : ''}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Join distinct, non-empty values with ", " (mirrors the backend header aggregate). */
function joinUnique(values: Array<string | null | undefined>) {
  const result: string[] = [];
  for (const value of values) {
    const trimmed = (value ?? '').trim();
    if (trimmed && !result.includes(trimmed)) result.push(trimmed);
  }
  return result.join(', ');
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
  scanNote,
  scannedQty,
  scannedNetWeight,
  expectedBoxes,
  expectedLoose,
  invoiceItems,
  invoiceWeight,
  invoiceBoxes,
  scanSkipApproved,
}: {
  scans: SalesDispatchBoxScan[];
  /** FULL boxes scanned — the only figure comparable to the expected box count. */
  scannedBoxes: number;
  /** "+ 20 / 40 pcs loose (in 17 boxes)" — the goods the box count leaves out. */
  scanNote: string;
  scannedQty: number;
  scannedNetWeight: number;
  expectedBoxes: number;
  /** Invoiced pieces that ride out loose rather than in a full box. */
  expectedLoose: number;
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
                ? `${formatNumber(scannedBoxes)} / ${formatNumber(expectedBoxes)}`
                : formatNumber(scannedBoxes)
            }
            hint={scanNote || 'Boxes scanned at docking'}
          />
          <MetricTile label="Scanned Qty" value={scannedQty > 0 ? formatNumber(scannedQty) : '—'} />
          <MetricTile
            label="Scanned Net Weight"
            value={scannedNetWeight > 0 ? formatKg(scannedNetWeight) : '—'}
            hint="Sum of scanned box weights"
          />
          <MetricTile
            label="Invoice Boxes"
            value={invoiceBoxes > 0 ? formatNumber(invoiceBoxes) : '—'}
            // The bill prints boxes AND a loose remainder; naming it here stops "375
            // boxes" reading as the whole shipment when 4 pcs ship loose in a part box.
            hint={expectedLoose > 0 ? `+ ${formatNumber(expectedLoose)} pcs loose` : ''}
          />
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

interface AdditionalWeightRow {
  key: string;
  name: string;
  weight: string;
}

/**
 * Validates and normalises the additional-weight rows for saving. Drops fully
 * blank rows; returns null if any row is partially filled or has an invalid
 * weight, so the caller can show a validation error.
 */
function buildAdditionalWeightItems(
  rows: AdditionalWeightRow[],
): { name: string; weight: number }[] | null {
  const items: { name: string; weight: number }[] = [];
  for (const row of rows) {
    const name = row.name.trim();
    const weightStr = row.weight.trim();
    if (name === '' && weightStr === '') continue;
    const weight = Number(weightStr);
    if (name === '' || weightStr === '' || !Number.isFinite(weight) || weight < 0) {
      return null;
    }
    items.push({ name, weight });
  }
  return items;
}

function AdditionalWeightCard({
  rows,
  net,
  invoiceWeight,
  challanWeight,
  disabled,
  onAdd,
  onChange,
  onRemove,
}: {
  rows: AdditionalWeightRow[];
  net: number | null;
  invoiceWeight: number;
  challanWeight: number;
  disabled?: boolean;
  onAdd: () => void;
  onChange: (key: string, field: 'name' | 'weight', value: string) => void;
  onRemove: (key: string) => void;
}) {
  const additionalTotal = rows.reduce((sum, row) => sum + (toFiniteNumber(row.weight) ?? 0), 0);
  const goodsWeight = net !== null ? net - additionalTotal : null;
  const reference = challanWeight > 0 ? challanWeight : invoiceWeight;
  const hasReference = reference > 0;
  const variance = goodsWeight !== null && hasReference ? goodsWeight - reference : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5" />
          Additional Weight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Record the weight of non-goods items loaded to secure the shipment (cardboard, pallets,
          straps, dunnage). These are subtracted from the net loaded weight to estimate the actual
          goods weight, making it easier to match against the invoice weight. This does not change
          the gross, tare, or net weighbridge weights.
        </p>

        {rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  className="sm:flex-1"
                  placeholder="Item name (e.g. Cardboard, Pallet)"
                  value={row.name}
                  disabled={disabled}
                  onChange={(event) => onChange(row.key, 'name', event.target.value)}
                />
                <Input
                  className="sm:w-40"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="Weight (kg)"
                  value={row.weight}
                  disabled={disabled}
                  onChange={(event) => onChange(row.key, 'weight', event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => onRemove(row.key)}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No additional weights added.</p>
        )}

        <Button type="button" variant="outline" disabled={disabled} onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Additional Weight
        </Button>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricTile
            label="Net Loaded Weight"
            value={net !== null ? formatKg(net) : '—'}
            hint="Gross − Tare"
          />
          <MetricTile
            label="Additional Weight"
            value={additionalTotal > 0 ? formatKg(additionalTotal) : '—'}
            hint="Sum of items above"
          />
          <MetricTile
            label="Estimated Goods Weight"
            value={goodsWeight !== null ? formatKg(goodsWeight) : '—'}
            hint="Net − Additional"
            emphasis
          />
        </div>

        {goodsWeight !== null && hasReference ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Estimated goods {formatKg(goodsWeight)} vs {challanWeight > 0 ? 'challan' : 'invoice'}{' '}
            {formatKg(reference)} ·{' '}
            <span className="font-semibold">
              {variance !== null && variance >= 0 ? '+' : ''}
              {variance !== null ? formatKg(variance) : '—'}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
