import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  FileText,
  Lock,
  Printer,
  Scale,
  Send,
  Truck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type SalesDispatchGateOut,
  type SalesDispatchGateOutDocument,
  type SalesDispatchBoxScan,
  type SalesDispatchItem,
  useCommitSalesDispatchPrint,
  useMarkSalesDispatchDispatched,
  usePreviewSalesDispatchGatepass,
  usePrintSalesDispatchGatepass,
  useSalesDispatchByVehicleEntry,
  useSalesDispatchLock,
} from '@/modules/gate/api';
import {
  GateStatusBadge,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
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
  DOCKING_TOTAL_STEPS,
  formatDateTime,
  formatDocumentType,
  formatTimestamp,
  formatValue,
} from './salesDispatchFlow.helpers';
import { getSalesDispatchRoutes, isSalesDispatchOutPath } from './salesDispatchRoutes';
import {
  SAP_GATEPASS_PRINT_PAGE_STYLE,
  SalesDispatchSapGatepassPrint,
} from './SalesDispatchSapGatepassPrint';

interface GatepassDraft {
  uom: string;
  physicalQuantity: string;
  sealNumber: string;
  pgiReference: string;
  ewayBill: string;
}

function buildDraft(entry?: SalesDispatchGateOut | null): GatepassDraft {
  const scannedQuantity = getScannedQuantity(entry);

  return {
    uom: entry?.uom || getScannedUom(entry) || getSingleItemUom(entry) || '',
    physicalQuantity:
      toDraftString(entry?.physical_quantity) ||
      (scannedQuantity > 0 ? formatDraftNumber(scannedQuantity) : ''),
    sealNumber: entry?.seal_number || '',
    pgiReference: entry?.pgi_reference || '',
    ewayBill: entry?.eway_bill || getFirstDocumentValue(entry, 'eway_bill') || '',
  };
}

interface GatepassReferenceField {
  label: string;
  value?: string | number | null;
}

interface PrintableGatepassDocument extends SalesDispatchGateOutDocument {
  key: string;
  items: SalesDispatchItem[];
}

interface ItemScanStats {
  boxes: number;
  quantity: number;
  uom: string;
}

export default function SalesDispatchGatepassPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCompany, hasPermission } = usePermission();
  const routes = getSalesDispatchRoutes(location.pathname);
  const isGateOutMode = isSalesDispatchOutPath(location.pathname);
  const { entryId, entryIdNumber } = useEntryId();
  const [draft, setDraft] = useState<GatepassDraft>(() => buildDraft());
  const [error, setError] = useState('');
  const sapPrintRef = useRef<HTMLDivElement>(null);
  const [entryToPrint, setEntryToPrint] = useState<SalesDispatchGateOut | null>(null);
  const [pendingFrontendPrint, setPendingFrontendPrint] = useState(false);

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const { data: dispatchLock } = useSalesDispatchLock();
  const previewGatepass = usePreviewSalesDispatchGatepass();
  const printGatepass = usePrintSalesDispatchGatepass();
  const commitPrint = useCommitSalesDispatchPrint();
  const markDispatched = useMarkSalesDispatchDispatched();
  const printFrontendGatepass = useReactToPrint({
    contentRef: sapPrintRef,
    documentTitle: buildFrontendGatepassDocumentTitle(entryToPrint || entry),
    pageStyle: SAP_GATEPASS_PRINT_PAGE_STYLE,
  });

  useEffect(() => {
    if (!entry) return;

    const timerId = window.setTimeout(() => {
      setDraft(buildDraft(entry));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [entry]);

  useEffect(() => {
    if (!pendingFrontendPrint || !entryToPrint) return;

    setPendingFrontendPrint(false);
    window.setTimeout(() => {
      printFrontendGatepass();
    }, 0);
  }, [entryToPrint, pendingFrontendPrint, printFrontendGatepass]);

  const isSaving =
    previewGatepass.isPending ||
    printGatepass.isPending ||
    commitPrint.isPending ||
    markDispatched.isPending;
  const readiness = entry?.gatepass_readiness;
  const action = useMemo(() => getNextAction(entry, isGateOutMode), [entry, isGateOutMode]);
  const isGatepassPrintLocked = Boolean(dispatchLock?.is_locked);
  const canPrintGatepass = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.PRINT_GATEPASS);
  const canCommitGatepassPrint = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.COMMIT_PRINT);
  const canDispatchGatepass = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.DISPATCH);
  const canReprintGatepass = hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS);
  const canEditGatepassDetails = Boolean(
    !isGateOutMode &&
    entry &&
    ['READY_FOR_GATEPASS', 'PHOTO_ATTACHED', 'DOCKED'].includes(entry.status),
  );

  const updateDraft = <K extends keyof GatepassDraft>(key: K, value: GatepassDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const handlePreview = async () => {
    if (!entry) return;

    try {
      await previewGatepass.mutateAsync(entry.id);
      await refetch();
      toast.success('Gatepass readiness refreshed');
    } catch (previewError) {
      setError(getErrorMessage(previewError, 'Failed to refresh gatepass readiness'));
    }
  };

  const handlePrintGatepass = async () => {
    if (!entry) return;

    if (isGatepassPrintLocked) {
      setError(buildLockError(dispatchLock?.reason));
      return;
    }

    if (!canPrintGatepass) {
      setError('You do not have permission to print Docking gatepasses.');
      return;
    }

    if (!entry.gatepass_readiness.ready) {
      setError(buildReadinessError(entry));
      return;
    }

    try {
      const printedEntry = await printGatepass.mutateAsync({
        id: entry.id,
        data: {
          uom: draft.uom,
          physical_quantity: draft.physicalQuantity || null,
          seal_number: draft.sealNumber,
          pgi_reference: draft.pgiReference,
          eway_bill: draft.ewayBill,
        },
      });
      await refetch();
      setEntryToPrint(printedEntry);
      setPendingFrontendPrint(true);
      toast.success('Gatepass created. Opening print dialog...');
    } catch (printError) {
      setError(getErrorMessage(printError, 'Failed to create gatepass print'));
    }
  };

  const handleCommitPrint = async () => {
    if (!entry) return;

    if (isGatepassPrintLocked) {
      setError(buildLockError(dispatchLock?.reason));
      return;
    }

    if (!canCommitGatepassPrint) {
      setError('You do not have permission to commit Docking gatepass prints.');
      return;
    }

    try {
      await commitPrint.mutateAsync(entry.id);
      await refetch();
      toast.success('Gatepass print committed');
    } catch (commitError) {
      setError(getErrorMessage(commitError, 'Failed to commit gatepass print'));
    }
  };

  const handleMarkDispatched = async () => {
    if (!entry) return;
    if (!isGateOutMode) {
      setError('Dispatch can only be marked from the Gate module.');
      return;
    }

    if (!canDispatchGatepass) {
      setError('You do not have permission to mark this vehicle as dispatched.');
      return;
    }

    try {
      await markDispatched.mutateAsync(entry.id);
      toast.success('Entry marked as dispatched');
      navigate(routes.dashboard);
    } catch (dispatchError) {
      setError(getErrorMessage(dispatchError, 'Failed to mark entry as dispatched'));
    }
  };

  const handleNextAction = async () => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }

    if (isGateOutMode && action !== 'dispatch' && action !== 'done') {
      if (action === 'weighment') {
        navigate(routes.weighment(entry.vehicle_entry));
        return;
      }
      setError('This entry can be marked out after Docking commits the gatepass print.');
      return;
    }

    if (action === 'print') {
      await handlePrintGatepass();
    } else if (action === 'commit') {
      await handleCommitPrint();
    } else if (action === 'weighment') {
      navigate(routes.weighment(entry.vehicle_entry));
    } else if (action === 'dispatch') {
      await handleMarkDispatched();
    } else {
      navigate(routes.dashboard);
    }
  };

  if (isEntryLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={4}
          totalSteps={DOCKING_TOTAL_STEPS}
          title="Docking"
          error={
            error || (entryError ? getErrorMessage(entryError, 'Docking details not found') : null)
          }
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Docking details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(routes.newEntry)}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  const companyName =
    currentCompany?.company_name || entry.sap_branch_name || String(entry.company);
  const gatepassDocuments = getGatepassDocuments(entry);
  const gatepassReferenceFields = buildGatepassReferenceFields(entry, draft);
  const gatepassSummaryFields = buildGatepassSummaryFields(entry);
  const pageTitle = getGatepassPageTitle(entry, isGateOutMode);

  return (
    <>
      <div className="sales-dispatch-gatepass-page space-y-6 pb-6">
        <div className="print-hide">
          <StepHeader
            currentStep={4}
            totalSteps={DOCKING_TOTAL_STEPS}
            title={pageTitle}
            error={error || null}
          />
        </div>

        {!isGateOutMode && isGatepassPrintLocked ? (
          <div className="print-hide flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <Lock className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">Gate pass printing is locked</p>
              <p className="mt-1">
                {dispatchLock?.reason || 'Gatepass print and commit are temporarily held.'}
              </p>
            </div>
          </div>
        ) : null}

        <Card className="sales-dispatch-gatepass-summary print-no-break">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {pageTitle} Gatepass
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{companyName}</p>
            </div>
            <div className="print-hide">
              <GateStatusBadge status={entry.status} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            {gatepassSummaryFields.map((field) => (
              <InfoItem key={field.label} label={field.label} value={field.value} />
            ))}
          </CardContent>
        </Card>

        {isGateOutMode ? (
          <GateOutWeighmentPanel
            entry={entry}
            onEdit={() => navigate(routes.weighment(entry.vehicle_entry))}
          />
        ) : null}

        <GatepassDocumentsPanel documents={gatepassDocuments} />

        <GatepassItemsPanel documents={gatepassDocuments} scans={entry.box_scans || []} />

        <div className="sales-dispatch-gatepass-grid grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <Card className="sales-dispatch-gatepass-print-card print-no-break">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Gatepass Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="sales-dispatch-gatepass-fields print-hide grid gap-4 md:grid-cols-2">
                <TextField
                  id="sales-dispatch-uom"
                  label="UOM"
                  value={draft.uom}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('uom', value)}
                  placeholder="Example: BOX"
                />
                <TextField
                  id="sales-dispatch-physical-quantity"
                  label="Physical Quantity"
                  type="number"
                  value={draft.physicalQuantity}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('physicalQuantity', value)}
                />
                <TextField
                  id="sales-dispatch-seal"
                  label="Seal No."
                  value={draft.sealNumber}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('sealNumber', value)}
                />
                <TextField
                  id="sales-dispatch-pgi-reference"
                  label="PGI / Goods Issue Doc No."
                  value={draft.pgiReference}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('pgiReference', value)}
                />
                <TextField
                  id="sales-dispatch-eway-bill"
                  label="E-way Bill"
                  value={draft.ewayBill}
                  disabled={!canEditGatepassDetails}
                  onChange={(value) => updateDraft('ewayBill', value)}
                />
              </div>

              {entry.gatepass_no ? (
                <div className="rounded-md border p-4">
                  {gatepassReferenceFields.length ? (
                    <div className="sales-dispatch-gatepass-reference grid gap-3 text-sm md:grid-cols-2">
                      {gatepassReferenceFields.map((field) => (
                        <InfoItem key={field.label} label={field.label} value={field.value} />
                      ))}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      'print-hide rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900',
                      gatepassReferenceFields.length && 'mt-4',
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">Original gatepass print is already recorded</p>
                        <p className="mt-1">
                          Reprints must use the audited Dispatch reprint workflow.
                        </p>
                      </div>
                      {!isGateOutMode && entry.printed_at && canReprintGatepass ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(routes.reprint(entry.id))}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Reprint Gatepass
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="print-hide">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Readiness
              </CardTitle>
              {!isGateOutMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={isSaving}
                >
                  Refresh
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <ReadinessItem
                label="Truck Photo Location"
                ready={Boolean(readiness?.has_truck_photo_geolocation)}
              />
              <ReadinessItem
                label="Box Scanning"
                ready={Boolean(readiness?.has_box_scans)}
                detail={
                  readiness?.box_scan_optional && !entry.box_scans?.length
                    ? 'Not required'
                    : readiness?.scan_skip_approved && !entry.box_scans?.length
                      ? 'Skipped (approved)'
                      : `${entry.box_scans?.length || 0} boxes`
                }
              />
              <ReadinessItem label="SAP Items" ready={Boolean(readiness?.has_items)} />

              {readiness && !readiness.ready ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Missing: {readiness.missing.join(', ')}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready for gatepass
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="print-hide flex flex-wrap justify-end gap-3">
          {!isGateOutMode && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintGatepass}
                disabled={
                  isSaving || isGatepassPrintLocked || action !== 'print' || !canPrintGatepass
                }
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Gatepass
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCommitPrint}
                disabled={
                  isSaving ||
                  isGatepassPrintLocked ||
                  action !== 'commit' ||
                  !canCommitGatepassPrint
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                Commit Print
              </Button>
            </>
          )}
          {isGateOutMode && (
            <>
              {entry.status === 'PRINT_COMMITTED' ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(routes.weighment(entry.vehicle_entry))}
                  disabled={isSaving}
                >
                  <Scale className="mr-2 h-4 w-4" />
                  {hasCompleteGateOutWeighment(entry) ? 'Edit Weighment' : 'Record Weighment'}
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={handleMarkDispatched}
                disabled={isSaving || action !== 'dispatch' || !canDispatchGatepass}
              >
                <Send className="mr-2 h-4 w-4" />
                Mark Dispatched
              </Button>
            </>
          )}
        </div>

        <div className="print-hide">
          <StepFooter
            onPrevious={() => navigate(routes.attachments(entryId || entry.vehicle_entry))}
            onCancel={() => navigate(routes.dashboard)}
            onNext={handleNextAction}
            showPrevious={!isGateOutMode}
            isSaving={isSaving}
            isNextDisabled={
              isGateOutMode && action !== 'weighment' && action !== 'dispatch' && action !== 'done'
            }
            nextLabel={
              isGateOutMode
                ? getGateOutActionLabel(entry, isSaving)
                : getNextActionLabel(entry, isSaving)
            }
          />
        </div>
      </div>
      <div className="sales-dispatch-gatepass-print-blocked">
        Gatepass browser printing is blocked from this screen. Use the audited reprint workflow.
      </div>
      <div className="sap-gatepass-print-host" aria-hidden>
        <SalesDispatchSapGatepassPrint
          ref={sapPrintRef}
          entry={entryToPrint || entry}
          companyName={companyName}
        />
      </div>
    </>
  );
}

function buildFrontendGatepassDocumentTitle(entry?: SalesDispatchGateOut | null) {
  return ['gatepass', entry?.gatepass_no || entry?.sap_doc_num || entry?.entry_no]
    .filter(Boolean)
    .join('_');
}

function getGatepassPageTitle(entry: SalesDispatchGateOut, isGateOutMode: boolean) {
  if (!isGateOutMode) return 'Docking';
  return entry.document_type === 'STOCK_TRANSFER' ? 'BST Out' : 'Sales Dispatch Out';
}

function getNextAction(entry?: SalesDispatchGateOut | null, isGateOutMode = false) {
  if (!entry) return 'done';
  if (entry.status === 'GATEPASS_PRINTED') return isGateOutMode ? 'waiting' : 'commit';
  if (entry.status === 'PRINT_COMMITTED') {
    if (!isGateOutMode) return 'done';
    return hasCompleteGateOutWeighment(entry) ? 'dispatch' : 'weighment';
  }
  if (entry.status === 'DISPATCHED') return 'done';
  if (entry.status === 'CANCELLED' || entry.status === 'REJECTED') return 'done';
  return isGateOutMode ? 'waiting' : 'print';
}

function getNextActionLabel(entry: SalesDispatchGateOut, isSaving: boolean) {
  if (isSaving) return 'Saving...';
  const action = getNextAction(entry);
  if (action === 'commit') return 'Commit Print';
  if (action === 'dispatch') return 'Mark Dispatched';
  if (action === 'done') return 'Back to Dashboard';
  return 'Print Gatepass';
}

function getGateOutActionLabel(entry: SalesDispatchGateOut, isSaving: boolean) {
  if (isSaving) return 'Saving...';
  const action = getNextAction(entry, true);
  if (action === 'weighment') return 'Record Gross Weight';
  if (action === 'dispatch') return 'Mark Dispatched';
  if (action === 'done') return 'Back to Dashboard';
  return 'Waiting for Docking';
}

function hasCompleteGateOutWeighment(entry: SalesDispatchGateOut) {
  const gross = toFiniteNumber(entry.gross_weight);
  const tare = toFiniteNumber(entry.tare_weight);
  return gross !== null && gross > 0 && tare !== null && tare >= 0 && gross >= tare;
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function buildReadinessError(entry: SalesDispatchGateOut) {
  const missing = entry.gatepass_readiness.missing.join(', ');
  return missing ? `Gatepass is not ready. Missing: ${missing}.` : 'Gatepass is not ready.';
}

function buildLockError(reason?: string) {
  return reason
    ? `Gate pass printing is locked. Reason: ${reason}`
    : 'Gate pass printing is locked.';
}

function getScannedQuantity(entry?: SalesDispatchGateOut | null) {
  return (entry?.box_scans || []).reduce((total, scan) => {
    const quantity = Number(scan.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? total + quantity : total;
  }, 0);
}

function getScannedUom(entry?: SalesDispatchGateOut | null) {
  const uoms = new Set(
    (entry?.box_scans || []).map((scan) => String(scan.uom || '').trim()).filter(Boolean),
  );
  return uoms.size === 1 ? Array.from(uoms)[0] : '';
}

function getSingleItemUom(entry?: SalesDispatchGateOut | null) {
  const items = entry?.items?.length
    ? entry.items
    : entry?.documents?.flatMap((document) => document.items || []) || [];
  const uoms = new Set(items.map((item) => String(item.uom || '').trim()).filter(Boolean));
  return uoms.size === 1 ? Array.from(uoms)[0] : '';
}

function getFirstDocumentValue<K extends keyof SalesDispatchGateOutDocument>(
  entry: SalesDispatchGateOut | null | undefined,
  key: K,
) {
  const value = entry?.documents?.find((document) => hasDisplayValue(document[key]))?.[key];
  return hasDisplayValue(value as string | number | null) ? String(value) : '';
}

function toDraftString(value?: string | number | null) {
  return hasDisplayValue(value) ? String(value) : '';
}

function formatDraftNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function buildGatepassSummaryFields(entry: SalesDispatchGateOut): GatepassReferenceField[] {
  return [
    { label: 'Gatepass No.', value: entry.gatepass_no },
    {
      label: entry.document_type === 'STOCK_TRANSFER' ? 'SAP Document' : 'Invoice No.',
      value: entry.sap_doc_num,
    },
    { label: 'Customer / Destination', value: entry.customer_name || entry.to_warehouse },
    { label: 'Vehicle', value: entry.vehicle_no },
    { label: 'Driver', value: entry.driver_name },
    { label: 'Driver Contact', value: entry.driver_mobile_no },
    { label: 'Actual Gate Out', value: formatActualGateOut(entry) },
    { label: 'Printed At', value: formatTimestamp(entry.printed_at) },
  ];
}

function formatActualGateOut(entry: SalesDispatchGateOut) {
  if (entry.status !== 'DISPATCHED') return '-';
  return entry.gate_out_date || entry.out_time
    ? formatDateTime(entry.gate_out_date, entry.out_time)
    : formatTimestamp(entry.dispatched_at);
}

function GateOutWeighmentPanel({
  entry,
  onEdit,
}: {
  entry: SalesDispatchGateOut;
  onEdit: () => void;
}) {
  const hasWeighment = hasCompleteGateOutWeighment(entry);
  const canEdit = entry.status === 'PRINT_COMMITTED';

  return (
    <Card className="print-hide">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Gate Out Weighment
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Gross minus tare is used as the vehicle net weight before dispatch out.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" variant="outline" onClick={onEdit}>
            <Scale className="mr-2 h-4 w-4" />
            {hasWeighment ? 'Edit Weighment' : 'Record Weighment'}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="Gross Weight" value={formatWeightValue(entry.gross_weight)} />
        <InfoItem label="Tare Weight" value={formatWeightValue(entry.tare_weight)} />
        <InfoItem label="Net Weight" value={formatWeightValue(entry.net_weight)} />
        <InfoItem label="Weighbridge Ticket No." value={entry.weighbridge_slip_no} />
        <InfoItem
          label="First Weighment Time"
          value={formatTimestamp(entry.first_weighment_time)}
        />
        <InfoItem
          label="Second Weighment Time"
          value={formatTimestamp(entry.second_weighment_time)}
        />
      </CardContent>
    </Card>
  );
}

function buildGatepassReferenceFields(
  entry: SalesDispatchGateOut,
  draft: GatepassDraft,
): GatepassReferenceField[] {
  const ewayBill = draft.ewayBill || entry.eway_bill;
  const sealNumber = draft.sealNumber || entry.seal_number;
  const pgiReference = draft.pgiReference || entry.pgi_reference;
  const physicalQuantity = formatPhysicalQuantity(entry, draft);

  return filterVisibleFields([
    { label: 'Address', value: entry.ship_to_address || entry.place_of_supply },
    { label: 'Invoice Date', value: entry.sap_doc_date },
    { label: 'Total Amount', value: entry.sap_doc_total },
    { label: 'Transporter', value: entry.transporter_name },
    { label: 'Bilty / LR', value: entry.bilty_no },
    { label: 'E-way Bill', value: ewayBill },
    { label: 'Seal No.', value: sealNumber },
    { label: 'PGI / Goods Issue Doc No.', value: pgiReference },
    { label: 'Physical Quantity', value: physicalQuantity },
  ]);
}

function filterVisibleFields(fields: GatepassReferenceField[]) {
  return fields.filter((field) => hasDisplayValue(field.value));
}

function hasDisplayValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== '' && text !== '-';
}

function formatPhysicalQuantity(entry: SalesDispatchGateOut, draft: GatepassDraft) {
  const quantity = draft.physicalQuantity || entry.physical_quantity;
  if (!hasDisplayValue(quantity)) return '';

  const uom = draft.uom || entry.uom;
  return [quantity, uom].filter(hasDisplayValue).join(' ');
}

function formatWeightValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value);
  return /\b(kg|mt|ton|tons)\b/i.test(text) ? text : `${text} kg`;
}

function getGatepassDocuments(entry: SalesDispatchGateOut): PrintableGatepassDocument[] {
  if (entry.documents?.length) {
    return entry.documents.map((document) => ({
      ...document,
      key: String(document.id),
      items: getDocumentItems(entry, document),
    }));
  }

  return [
    {
      id: entry.sap_doc_entry,
      key: `${entry.document_type}:${entry.sap_doc_entry}`,
      document_type: entry.document_type,
      sap_doc_entry: entry.sap_doc_entry,
      sap_doc_num: entry.sap_doc_num,
      sap_doc_date: entry.sap_doc_date,
      sap_doc_total: entry.sap_doc_total,
      sap_branch_id: entry.sap_branch_id,
      sap_branch_name: entry.sap_branch_name,
      sap_reference: entry.sap_reference,
      sap_comments: entry.sap_comments,
      customer_code: entry.customer_code,
      customer_name: entry.customer_name,
      ship_to_code: entry.ship_to_code,
      ship_to_address: entry.ship_to_address,
      place_of_supply: entry.place_of_supply,
      bp_gstin: entry.bp_gstin,
      eway_bill: entry.eway_bill,
      from_warehouse: entry.from_warehouse,
      to_warehouse: entry.to_warehouse,
      warehouses: entry.warehouses,
      item_summary: entry.item_summary,
      base_refs: entry.base_refs,
      total_quantity: entry.total_quantity,
      total_litres: entry.total_litres,
      total_boxes: entry.total_boxes,
      total_weight: entry.total_weight,
      items: entry.items,
    },
  ];
}

function getDocumentItems(
  entry: SalesDispatchGateOut,
  document: SalesDispatchGateOutDocument,
): SalesDispatchItem[] {
  if (document.items?.length) return document.items;

  const matchedItems = entry.items.filter(
    (item) =>
      (item.document && item.document === document.id) ||
      (item.document_sap_doc_num && item.document_sap_doc_num === document.sap_doc_num),
  );
  if (matchedItems.length) return matchedItems;

  return entry.documents?.length ? [] : entry.items;
}

function GatepassDocumentsPanel({ documents }: { documents: PrintableGatepassDocument[] }) {
  const showEwayBill = documents.some((document) => hasDisplayValue(document.eway_bill));
  const showAmount = documents.some((document) => hasDisplayValue(document.sap_doc_total));
  const showWeight = documents.some((document) => hasDisplayValue(document.total_weight));

  return (
    <Card className="sales-dispatch-gatepass-documents print-no-break">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          SAP Documents
        </CardTitle>
        <div className="text-sm text-muted-foreground">{formatDocumentLineCount(documents)}</div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-muted/60">
                <tr>
                  <th className="w-[180px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                    Document
                  </th>
                  <th className="w-[260px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                    Customer / Destination
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                    Address / Warehouse
                  </th>
                  {showEwayBill ? (
                    <th className="w-[150px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      E-way Bill
                    </th>
                  ) : null}
                  {showAmount ? (
                    <th className="w-[120px] p-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                      Amount
                    </th>
                  ) : null}
                  {showWeight ? (
                    <th className="w-[130px] p-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                      SAP Weight
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.key} className="border-t align-top">
                    <td className="p-3 text-sm">
                      <div className="font-semibold">{formatValue(document.sap_doc_num)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDocumentType(document.document_type)}
                        {document.sap_doc_date ? ` - ${document.sap_doc_date}` : ''}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="font-medium">{formatValue(document.customer_name)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatValue(document.customer_code || document.place_of_supply)}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {formatValue(formatDocumentDestination(document))}
                    </td>
                    {showEwayBill ? (
                      <td className="whitespace-nowrap p-3 text-sm">
                        {formatValue(document.eway_bill)}
                      </td>
                    ) : null}
                    {showAmount ? (
                      <td className="whitespace-nowrap p-3 text-right text-sm tabular-nums">
                        {formatValue(document.sap_doc_total)}
                      </td>
                    ) : null}
                    {showWeight ? (
                      <td className="whitespace-nowrap p-3 text-right text-sm tabular-nums">
                        {formatValue(formatWeightValue(document.total_weight))}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GatepassItemsPanel({
  documents,
  scans,
}: {
  documents: PrintableGatepassDocument[];
  scans: SalesDispatchBoxScan[];
}) {
  const itemGroups = documents.filter((document) => document.items.length > 0);
  const totalItemCount = itemGroups.reduce((total, document) => total + document.items.length, 0);
  const scanStatsByItem = buildScanStatsByItem(scans);

  return (
    <Card className="sales-dispatch-gatepass-items print-no-break">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          SAP Items
        </CardTitle>
        <div className="text-sm text-muted-foreground">{formatItemLineCount(totalItemCount)}</div>
      </CardHeader>
      <CardContent>
        {itemGroups.length === 0 ? (
          <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No document lines found
          </div>
        ) : (
          <div className="space-y-3">
            {itemGroups.map((document) => (
              <DocumentItemsTable
                key={document.key}
                document={document}
                scanStatsByItem={scanStatsByItem}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentItemsTable({
  document,
  scanStatsByItem,
}: {
  document: PrintableGatepassDocument;
  scanStatsByItem: Map<string, ItemScanStats>;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-col gap-1 border-b bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold">
          {formatDocumentType(document.document_type)} {formatValue(document.sap_doc_num)}
        </div>
        <div className="text-muted-foreground">
          {document.customer_name || formatDocumentDestination(document)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-muted/60">
            <tr>
              <th className="w-[150px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Item Code
              </th>
              <th className="p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Item Name
              </th>
              <th className="w-[130px] p-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                SAP Qty
              </th>
              <th className="w-[130px] p-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                Actual Qty
              </th>
              <th className="w-[90px] p-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                Boxes
              </th>
              <th className="w-[100px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                UOM
              </th>
              <th className="w-[160px] p-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Warehouse
              </th>
            </tr>
          </thead>
          <tbody>
            {document.items.map((item, index) => {
              const scanStats = scanStatsByItem.get(normalizeItemCode(item.item_code));
              const actualUom = scanStats?.uom || item.uom;
              return (
                <tr key={item.id || `${item.item_code}-${index}`} className="border-t align-top">
                  <td className="whitespace-nowrap p-3 text-sm font-semibold">
                    {formatValue(item.item_code)}
                  </td>
                  <td className="p-3">
                    <div className="text-sm font-medium leading-5">
                      {formatValue(item.item_name)}
                    </div>
                    {item.base_ref ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Base Ref: {item.base_ref}
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right text-sm tabular-nums">
                    {formatValue(item.quantity)}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right text-sm font-semibold tabular-nums">
                    {scanStats ? formatQuantityNumber(scanStats.quantity) : '-'}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right text-sm tabular-nums">
                    {scanStats?.boxes ? scanStats.boxes : '-'}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">{formatValue(actualUom)}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{formatItemWarehouse(item)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildScanStatsByItem(scans: SalesDispatchBoxScan[]) {
  return scans.reduce((map, scan) => {
    const itemCode = normalizeItemCode(scan.item_code);
    if (!itemCode) return map;

    const current = map.get(itemCode) || { boxes: 0, quantity: 0, uom: '' };
    const quantity = Number(scan.quantity);
    current.boxes += 1;
    current.quantity += Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    current.uom = current.uom || scan.uom || '';
    map.set(itemCode, current);
    return map;
  }, new Map<string, ItemScanStats>());
}

function normalizeItemCode(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function formatQuantityNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function formatDocumentLineCount(documents: PrintableGatepassDocument[]) {
  if (documents.length === 0) return 'No SAP documents';
  return documents.length === 1 ? '1 SAP document' : `${documents.length} SAP documents`;
}

function formatItemLineCount(count: number) {
  if (count === 0) return 'No item lines';
  return count === 1 ? '1 item line' : `${count} item lines`;
}

function formatDocumentDestination(document: SalesDispatchGateOutDocument) {
  const warehouses = [document.from_warehouse, document.to_warehouse]
    .filter(hasDisplayValue)
    .join(' -> ');
  return document.ship_to_address || document.warehouses || warehouses || document.place_of_supply;
}

function formatItemWarehouse(item: SalesDispatchItem) {
  const from = item.from_warehouse;
  const to = item.to_warehouse;
  if (from && to && from !== to) return `${from} -> ${to}`;
  return item.warehouse_code || from || to || '-';
}

function TextField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ReadinessItem({
  label,
  ready,
  detail,
}: {
  label: string;
  ready: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <CheckCircle2
        className={`mt-0.5 h-4 w-4 ${ready ? 'text-emerald-600' : 'text-muted-foreground'}`}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {ready ? detail || 'Complete' : detail || 'Pending'}
        </p>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{formatValue(value)}</p>
    </div>
  );
}
