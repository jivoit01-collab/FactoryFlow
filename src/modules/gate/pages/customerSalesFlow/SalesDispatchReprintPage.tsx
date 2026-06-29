import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  FileText,
  History,
  Printer,
  Search,
  Truck,
} from 'lucide-react';
import type { Ref } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  type SalesDispatchBoxScan,
  type SalesDispatchGateOut,
  type SalesDispatchGateOutDocument,
  type SalesDispatchGatepassPrintLog,
  type SalesDispatchItem,
  useReprintSalesDispatchGatepass,
  useSalesDispatch,
  useSalesDispatchEntries,
  useSalesDispatchGatepassPrintHistory,
  useSalesDispatchLock,
} from '@/modules/gate/api';
import { GateStatusBadge, StepLoadingSpinner } from '@/modules/gate/components';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  formatDateTime,
  formatDocumentType,
  formatTimestamp,
  formatValue,
} from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';
import {
  SAP_GATEPASS_PRINT_PAGE_STYLE,
  SalesDispatchSapGatepassPrint,
} from './SalesDispatchSapGatepassPrint';

interface PrintableDocument {
  key: string;
  document_type: string;
  sap_doc_num?: string;
  customer_name?: string;
  eway_bill?: string;
  items?: SalesDispatchItem[];
}

interface ItemScanStats {
  boxes: number;
  quantity: number;
  uom: string;
}

export default function SalesDispatchReprintPage() {
  const navigate = useNavigate();
  const { currentCompany, hasPermission } = usePermission();
  const { entryId } = useParams();
  const id = Number(entryId || 0) || null;
  const [reason, setReason] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [latestReprintLog, setLatestReprintLog] = useState<SalesDispatchGatepassPrintLog | null>(
    null,
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const sapPrintRef = useRef<HTMLDivElement>(null);
  const [entryToPrint, setEntryToPrint] = useState<SalesDispatchGateOut | null>(null);
  const [pendingFrontendPrint, setPendingFrontendPrint] = useState(false);

  const { data: entry, isLoading, error, refetch } = useSalesDispatch(id);
  const {
    data: printHistory = [],
    isFetching: isHistoryFetching,
    refetch: refetchPrintHistory,
  } = useSalesDispatchGatepassPrintHistory(id);
  const { data: dispatchLock } = useSalesDispatchLock();
  const reprintGatepass = useReprintSalesDispatchGatepass();
  const printFrontendGatepass = useReactToPrint({
    contentRef: sapPrintRef,
    documentTitle: buildFrontendGatepassDocumentTitle(entryToPrint || entry),
    pageStyle: SAP_GATEPASS_PRINT_PAGE_STYLE,
  });

  const companyName = entry
    ? entry.company_name ||
      entry.sap_branch_name ||
      currentCompany?.company_name ||
      String(entry.company)
    : currentCompany?.company_name || 'Jivo Oil';
  const currentPrintLog = useMemo(
    () =>
      latestReprintLog ||
      printHistory.find((log) => log.print_type === 'REPRINT') ||
      printHistory[0] ||
      null,
    [latestReprintLog, printHistory],
  );
  const isBlockedStatus = entry ? ['CANCELLED', 'REJECTED'].includes(entry.status) : false;
  const canReprint = Boolean(
    entry?.gatepass_no &&
    entry.printed_at &&
    !isBlockedStatus &&
    !dispatchLock?.is_locked &&
    hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS),
  );
  const trimmedReason = reason.trim();
  const isSaving = reprintGatepass.isPending;

  useEffect(() => {
    if (!pendingFrontendPrint || !entryToPrint) return;

    setPendingFrontendPrint(false);
    window.setTimeout(() => {
      printFrontendGatepass();
    }, 0);
  }, [entryToPrint, pendingFrontendPrint, printFrontendGatepass]);

  if (!id) {
    return <SalesDispatchReprintSearchPage />;
  }

  const handleReprint = async () => {
    if (!entry) return;
    if (!trimmedReason) {
      setErrorMessage('Please enter a reprint reason');
      return;
    }

    try {
      setErrorMessage('');
      const updatedEntry = await reprintGatepass.mutateAsync({
        id: entry.id,
        data: {
          reprint_reason: trimmedReason,
          printer_name: printerName.trim() || undefined,
        },
      });
      const newestLog = findNewestReprintLog(updatedEntry, trimmedReason);
      setLatestReprintLog(newestLog);
      setEntryToPrint(updatedEntry);
      setReason('');
      await refetch();
      await refetchPrintHistory();
      setPendingFrontendPrint(true);
      toast.success('Reprint logged. Opening print dialog...');
    } catch (reprintError) {
      setErrorMessage(getErrorMessage(reprintError, 'Failed to log gatepass reprint'));
    }
  };

  if (isLoading) {
    return <StepLoadingSpinner label="Loading Docking entry..." />;
  }

  if (error || !entry) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="ghost" onClick={() => navigate(DOCKING_ROUTES.dashboard)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Docking
        </Button>
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Docking entry not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(DOCKING_ROUTES.detail(entry.id))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Entry
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Reprint Gatepass</h2>
            <p className="text-muted-foreground">
              {entry.entry_no} · {formatValue(entry.gatepass_no)}
            </p>
          </div>
        </div>
        <GateStatusBadge status={entry.status} />
      </div>

      {dispatchLock?.is_locked && (
        <StatusNotice
          tone="danger"
          title="Gate pass printing is locked"
          description={dispatchLock.reason || 'Reprints are blocked until printing is unlocked.'}
        />
      )}
      {!entry.gatepass_no || !entry.printed_at ? (
        <StatusNotice
          tone="warning"
          title="Original print is not recorded"
          description="A gatepass can be reprinted only after the original print is recorded."
        />
      ) : null}
      {isBlockedStatus && (
        <StatusNotice
          tone="danger"
          title="Reprint is not available"
          description="Cancelled and rejected Docking entries cannot be reprinted."
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Gatepass Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <InfoItem label="Entry No." value={entry.entry_no} />
              <InfoItem label="Gatepass No." value={entry.gatepass_no} />
              <InfoItem label="Vehicle" value={entry.vehicle_no} />
              <InfoItem label="Driver" value={entry.driver_name} />
              <InfoItem label="SAP Documents" value={formatDocumentNumbers(entry)} />
              <InfoItem label="Original Printed" value={formatTimestamp(entry.printed_at)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Reprint Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sales-dispatch-reprint-reason">
                  Reprint Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="sales-dispatch-reprint-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Example: Original copy damaged"
                  className="min-h-24"
                  disabled={!canReprint || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-dispatch-reprint-printer">Printer Name</Label>
                <Input
                  id="sales-dispatch-reprint-printer"
                  value={printerName}
                  onChange={(event) => setPrinterName(event.target.value)}
                  placeholder="Security Printer"
                  disabled={!canReprint || isSaving}
                />
              </div>
              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleReprint}
                  disabled={!canReprint || !trimmedReason || isSaving}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {isSaving ? 'Logging...' : 'Log & Print Reprint'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Print History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PrintHistoryTable history={printHistory} isLoading={isHistoryFetching} />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          Reprint Preview
        </h3>
        <PrintableGatepass
          printRef={previewRef}
          entry={entry}
          companyName={companyName}
          printLog={currentPrintLog}
        />
      </section>
      <div className="sap-gatepass-print-host" aria-hidden>
        <SalesDispatchSapGatepassPrint
          ref={sapPrintRef}
          entry={entryToPrint || entry}
          companyName={companyName}
          printLog={currentPrintLog}
        />
      </div>
    </div>
  );
}

function SalesDispatchReprintSearchPage() {
  const navigate = useNavigate();
  const { currentCompany, hasPermission } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [reason, setReason] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [latestReprintLog, setLatestReprintLog] = useState<SalesDispatchGatepassPrintLog | null>(
    null,
  );
  const [entryToPrint, setEntryToPrint] = useState<SalesDispatchGateOut | null>(null);
  const sapPrintRef = useRef<HTMLDivElement>(null);
  const [pendingFrontendPrint, setPendingFrontendPrint] = useState(false);

  const trimmedSearch = searchTerm.trim();
  const shouldSearch = trimmedSearch.length >= 2;
  const {
    data: entries = [],
    isFetching: isSearching,
    isError: isSearchError,
  } = useSalesDispatchEntries(
    shouldSearch
      ? {
          search: trimmedSearch,
          // Reprint searches across every company the user belongs to (the
          // company selector is a decorator); reprint-by-id is record-resolved.
          all_companies: 1,
        }
      : undefined,
    { enabled: shouldSearch },
  );
  const {
    data: selectedEntry,
    isLoading: isEntryLoading,
    refetch: refetchSelectedEntry,
  } = useSalesDispatch(selectedId);
  const {
    data: printHistory = [],
    isFetching: isHistoryFetching,
    refetch: refetchPrintHistory,
  } = useSalesDispatchGatepassPrintHistory(selectedId);
  const { data: dispatchLock } = useSalesDispatchLock();
  const reprintGatepass = useReprintSalesDispatchGatepass();

  const reprintCandidates = useMemo(
    () => entries.filter((entry) => isGatepassReprintCandidate(entry)),
    [entries],
  );
  const companyName = selectedEntry
    ? selectedEntry.company_name ||
      selectedEntry.sap_branch_name ||
      currentCompany?.company_name ||
      String(selectedEntry.company)
    : currentCompany?.company_name || 'Jivo Oil';
  const currentPrintLog = useMemo(
    () =>
      latestReprintLog ||
      printHistory.find((log) => log.print_type === 'REPRINT') ||
      printHistory[0] ||
      null,
    [latestReprintLog, printHistory],
  );
  const printEntry = entryToPrint || selectedEntry || null;
  const printFrontendGatepass = useReactToPrint({
    contentRef: sapPrintRef,
    documentTitle: buildFrontendGatepassDocumentTitle(printEntry),
    pageStyle: SAP_GATEPASS_PRINT_PAGE_STYLE,
  });
  const isBlockedStatus = selectedEntry
    ? ['CANCELLED', 'REJECTED'].includes(selectedEntry.status)
    : false;
  const canReprint = Boolean(
    selectedEntry?.gatepass_no &&
    selectedEntry.printed_at &&
    !isBlockedStatus &&
    !dispatchLock?.is_locked &&
    hasPermission(GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS),
  );
  const trimmedReason = reason.trim();
  const isSaving = reprintGatepass.isPending;

  useEffect(() => {
    if (!pendingFrontendPrint || !printEntry) return;

    setPendingFrontendPrint(false);
    window.setTimeout(() => {
      printFrontendGatepass();
    }, 0);
  }, [pendingFrontendPrint, printEntry, printFrontendGatepass]);

  const handleReprint = async () => {
    if (!selectedEntry) return;
    if (!trimmedReason) {
      setErrorMessage('Please enter a reprint reason');
      return;
    }

    try {
      setErrorMessage('');
      const updatedEntry = await reprintGatepass.mutateAsync({
        id: selectedEntry.id,
        data: {
          reprint_reason: trimmedReason,
          printer_name: printerName.trim() || undefined,
        },
      });
      const newestLog = findNewestReprintLog(updatedEntry, trimmedReason);
      setLatestReprintLog(newestLog);
      setEntryToPrint(updatedEntry);
      setReason('');
      await refetchSelectedEntry();
      await refetchPrintHistory();
      setPendingFrontendPrint(true);
      toast.success('Reprint logged. Opening print dialog...');
    } catch (reprintError) {
      setErrorMessage(getErrorMessage(reprintError, 'Failed to log gatepass reprint'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button type="button" variant="ghost" onClick={() => navigate(DOCKING_ROUTES.dashboard)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Docking
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Reprint Gatepass</h2>
            <p className="text-muted-foreground">
              Search a printed Docking gatepass, log the reprint reason, and print the copy.
            </p>
          </div>
        </div>
      </div>

      {dispatchLock?.is_locked && (
        <StatusNotice
          tone="danger"
          title="Gate pass printing is locked"
          description={dispatchLock.reason || 'Reprints are blocked until printing is unlocked.'}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Gatepass Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SearchableSelect<SalesDispatchGateOut>
                value={selectedId ? String(selectedId) : undefined}
                items={reprintCandidates}
                isLoading={isSearching && shouldSearch}
                isError={isSearchError}
                getItemKey={(entry) => entry.id}
                getItemLabel={formatReprintOptionLabel}
                filterFn={() => true}
                renderItem={(entry) => (
                  <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{formatValue(entry.gatepass_no)}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.entry_no} | {formatDocumentNumbers(entry)}
                      </div>
                    </div>
                    <div className="text-left text-xs text-muted-foreground sm:text-right">
                      <div>{formatValue(entry.vehicle_no)}</div>
                      <div>{formatTimestamp(entry.printed_at)}</div>
                    </div>
                  </div>
                )}
                placeholder="Search gatepass, entry, invoice, customer, or vehicle"
                label="Printed Gatepass"
                required
                inputId="sales-dispatch-reprint-search"
                defaultDisplayText={selectedLabel}
                loadingText="Searching gatepasses..."
                emptyText="Type at least 2 characters"
                notFoundText="No printed gatepasses found"
                onSearchChange={(search) => setSearchTerm(search)}
                onItemSelect={(entry) => {
                  setSelectedId(entry.id);
                  setSelectedLabel(formatReprintOptionLabel(entry));
                  setLatestReprintLog(null);
                  setEntryToPrint(null);
                  setReason('');
                  setErrorMessage('');
                }}
                onClear={() => {
                  setSelectedId(null);
                  setSelectedLabel('');
                  setLatestReprintLog(null);
                  setEntryToPrint(null);
                  setReason('');
                  setErrorMessage('');
                }}
              />

              {isEntryLoading ? (
                <p className="text-sm text-muted-foreground">Loading selected gatepass...</p>
              ) : selectedEntry ? (
                <div className="rounded-md border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Selected Gatepass</div>
                      <div className="text-lg font-semibold">
                        {formatValue(selectedEntry.gatepass_no)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedEntry.entry_no} | {formatDocumentNumbers(selectedEntry)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <GateStatusBadge status={selectedEntry.status} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(DOCKING_ROUTES.detail(selectedEntry.id))}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Entry
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <InfoItem label="Vehicle" value={selectedEntry.vehicle_no} />
                    <InfoItem label="Driver" value={selectedEntry.driver_name} />
                    <InfoItem label="Customer" value={selectedEntry.customer_name} />
                    <InfoItem
                      label="Original Printed"
                      value={formatTimestamp(selectedEntry.printed_at)}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Select a printed gatepass to see its reprint controls and history.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Reprint Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedEntry && !selectedEntry.printed_at ? (
                <p className="text-sm text-amber-700">
                  A gatepass can be reprinted only after the original print is recorded.
                </p>
              ) : null}
              {isBlockedStatus ? (
                <p className="text-sm text-destructive">
                  Cancelled and rejected Docking entries cannot be reprinted.
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="sales-dispatch-reprint-search-reason">
                  Reprint Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="sales-dispatch-reprint-search-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Example: Original copy damaged"
                  className="min-h-24"
                  disabled={!canReprint || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-dispatch-reprint-search-printer">Printer Name</Label>
                <Input
                  id="sales-dispatch-reprint-search-printer"
                  value={printerName}
                  onChange={(event) => setPrinterName(event.target.value)}
                  placeholder="Security Printer"
                  disabled={!canReprint || isSaving}
                />
              </div>
              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleReprint}
                  disabled={!canReprint || !trimmedReason || isSaving}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {isSaving ? 'Logging...' : 'Log & Print Reprint'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Printing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedId ? (
              <PrintHistoryTable history={printHistory} isLoading={isHistoryFetching} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a gatepass to view original print and reprint history.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="sap-gatepass-print-host" aria-hidden>
        {printEntry ? (
          <SalesDispatchSapGatepassPrint
            ref={sapPrintRef}
            entry={printEntry}
            companyName={companyName}
            printLog={currentPrintLog}
          />
        ) : (
          <div ref={sapPrintRef} />
        )}
      </div>
    </div>
  );
}

function buildFrontendGatepassDocumentTitle(entry?: SalesDispatchGateOut | null) {
  return ['gatepass', entry?.gatepass_no || entry?.sap_doc_num || entry?.entry_no]
    .filter(Boolean)
    .join('_');
}

function StatusNotice({
  tone,
  title,
  description,
}: {
  tone: 'danger' | 'warning';
  title: string;
  description: string;
}) {
  const className =
    tone === 'danger'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-amber-300 bg-amber-50 text-amber-900';

  return (
    <div className={`flex items-start gap-3 rounded-md border p-4 ${className}`}>
      <AlertCircle className="mt-0.5 h-5 w-5" />
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm opacity-90">{description}</div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{formatValue(value)}</div>
    </div>
  );
}

function PrintHistoryTable({
  history,
  isLoading,
}: {
  history: SalesDispatchGatepassPrintLog[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading print history...</p>;
  }
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No print history recorded</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Copy</th>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Type</th>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Printed At</th>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Printed By</th>
            <th className="whitespace-nowrap p-3 text-left text-sm font-medium">Printer</th>
            <th className="p-3 text-left text-sm font-medium">Reason</th>
          </tr>
        </thead>
        <tbody>
          {history.map((log) => (
            <tr key={log.id} className="border-t align-top">
              <td className="whitespace-nowrap p-3 text-sm">#{log.copy_number}</td>
              <td className="whitespace-nowrap p-3 text-sm">{formatPrintType(log.print_type)}</td>
              <td className="whitespace-nowrap p-3 text-sm">{formatTimestamp(log.printed_at)}</td>
              <td className="whitespace-nowrap p-3 text-sm">
                {formatValue(log.printed_by_name || log.printed_by)}
              </td>
              <td className="whitespace-nowrap p-3 text-sm">{formatValue(log.printer_name)}</td>
              <td className="p-3 text-sm">{formatValue(log.reprint_reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PrintableGatepass = ({
  printRef,
  entry,
  companyName,
  printLog,
}: {
  printRef: Ref<HTMLDivElement>;
  entry: SalesDispatchGateOut;
  companyName: string;
  printLog?: SalesDispatchGatepassPrintLog | null;
}) => {
  const documents = getPrintableDocuments(entry);
  const scanStatsByItem = buildScanStatsByItem(entry.box_scans || []);
  const showDocumentCustomer = hasDistinctDocumentValues(
    documents.map((document) => document.customer_name),
  );
  const showDocumentEwayBill = hasDistinctDocumentValues(
    documents.map((document) => document.eway_bill),
  );

  return (
    <div
      ref={printRef}
      className="sales-dispatch-reprint-page rounded-md border bg-white p-6 text-black shadow-sm print:border-0 print:p-0 print:shadow-none"
    >
      <div className="space-y-5">
        <div className="sales-dispatch-reprint-header flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">Gatepass Reprint</p>
            <h1 className="text-2xl font-bold">{companyName}</h1>
            <p className="mt-1 text-sm text-slate-600">{formatValue(entry.sap_branch_name)}</p>
          </div>
          <div className="text-sm sm:text-right">
            <div className="font-semibold">{formatValue(entry.gatepass_no)}</div>
            <div>Entry: {entry.entry_no}</div>
            <div>Copy: {printLog ? `#${printLog.copy_number}` : '-'}</div>
            <div>Printed: {formatTimestamp(printLog?.printed_at)}</div>
          </div>
        </div>

        <div className="sales-dispatch-reprint-fields grid gap-3 text-sm md:grid-cols-3">
          <PrintField label="Vehicle" value={entry.vehicle_no} />
          <PrintField label="Driver" value={entry.driver_name} />
          <PrintField label="Transporter" value={entry.transporter_name} />
          <PrintField label="Bilty / LR" value={entry.bilty_no} />
          <PrintField label="Actual Gate Out" value={formatActualGateOut(entry)} />
          <PrintField label="Original Printed" value={formatTimestamp(entry.printed_at)} />
          <PrintField
            label="Customer / Destination"
            value={entry.customer_name || entry.to_warehouse}
          />
          <PrintField label="E-way Bill" value={entry.eway_bill} />
          <PrintField
            label="Seal / PGI"
            value={[entry.seal_number, entry.pgi_reference].filter(Boolean).join(' / ')}
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-600">Loaded Items</h2>
          <div className="space-y-3">
            {documents.map((document) => (
              <PrintableDocumentItemsTable
                key={document.key}
                document={document}
                scanStatsByItem={scanStatsByItem}
                showCustomer={showDocumentCustomer}
                showEwayBill={showDocumentEwayBill}
              />
            ))}
          </div>
        </div>

        <footer className="border-t pt-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <PrintField label="Reprint Reason" value={printLog?.reprint_reason} />
            <PrintField
              label="Printed By"
              value={printLog?.printed_by_name || printLog?.printed_by}
            />
            <PrintField label="Printer" value={printLog?.printer_name} />
          </div>
        </footer>
      </div>
    </div>
  );
};

function formatActualGateOut(entry: SalesDispatchGateOut) {
  if (entry.status !== 'DISPATCHED') return '-';
  return entry.gate_out_date || entry.out_time
    ? formatDateTime(entry.gate_out_date, entry.out_time)
    : formatTimestamp(entry.dispatched_at);
}

function PrintField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div>{formatValue(value)}</div>
    </div>
  );
}

function getPrintableDocuments(entry: SalesDispatchGateOut): PrintableDocument[] {
  if (entry.documents?.length) {
    return entry.documents.map((document) => ({
      key: String(document.id),
      document_type: document.document_type,
      sap_doc_num: document.sap_doc_num,
      customer_name: document.customer_name || document.to_warehouse || document.warehouses,
      eway_bill: document.eway_bill,
      items: getDocumentItems(entry, document),
    }));
  }

  return [
    {
      key: `${entry.document_type}:${entry.sap_doc_entry}`,
      document_type: entry.document_type,
      sap_doc_num: entry.sap_doc_num,
      customer_name: entry.customer_name || entry.to_warehouse || entry.warehouses,
      eway_bill: entry.eway_bill,
      items: entry.items,
    },
  ];
}

function getDocumentItems(entry: SalesDispatchGateOut, document: SalesDispatchGateOutDocument) {
  if (document.items?.length) return document.items;
  return entry.items.filter(
    (item) => item.document === document.id || item.document_sap_doc_num === document.sap_doc_num,
  );
}

function PrintableDocumentItemsTable({
  document,
  scanStatsByItem,
  showCustomer,
  showEwayBill,
}: {
  document: PrintableDocument;
  scanStatsByItem: Map<string, ItemScanStats>;
  showCustomer: boolean;
  showEwayBill: boolean;
}) {
  const items = document.items || [];
  const warehouseSummary = summarizeItemWarehouses(items);
  const showWarehouseColumn = warehouseSummary === null;
  const contextLabels = [
    showEwayBill && hasDisplayValue(document.eway_bill)
      ? `E-way: ${formatValue(document.eway_bill)}`
      : null,
    warehouseSummary ? `Warehouse: ${warehouseSummary}` : null,
  ].filter(Boolean);

  if (!items.length) {
    return (
      <div className="rounded-md border p-3 text-sm text-slate-600">
        No item lines found for {formatDocumentType(document.document_type)}{' '}
        {formatValue(document.sap_doc_num)}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-col gap-1 border-b bg-slate-50 p-2 text-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-semibold">
            {formatDocumentType(document.document_type)} {formatValue(document.sap_doc_num)}
          </div>
          {showCustomer ? (
            <div className="text-xs text-slate-600">{formatValue(document.customer_name)}</div>
          ) : null}
        </div>
        <div className="text-xs text-slate-600">
          {contextLabels.length ? contextLabels.join(' | ') : null}
        </div>
      </div>
      <div className="sales-dispatch-reprint-table-wrap overflow-x-auto">
        <table className="sales-dispatch-reprint-items-table w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="sales-dispatch-reprint-col-code" />
            <col className="sales-dispatch-reprint-col-item" />
            <col className="sales-dispatch-reprint-col-qty" />
            <col className="sales-dispatch-reprint-col-actual" />
            <col className="sales-dispatch-reprint-col-boxes" />
            <col className="sales-dispatch-reprint-col-uom" />
            <col className="sales-dispatch-reprint-col-weight" />
            {showWarehouseColumn ? <col className="sales-dispatch-reprint-col-warehouse" /> : null}
          </colgroup>
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 text-left">Item Code</th>
              <th className="border p-2 text-left">Item</th>
              <th className="border p-2 text-right">SAP Qty</th>
              <th className="border p-2 text-right">Actual Qty</th>
              <th className="border p-2 text-right">Boxes</th>
              <th className="border p-2 text-left">UOM</th>
              <th className="border p-2 text-right">Invoice Weight</th>
              {showWarehouseColumn ? <th className="border p-2 text-left">Warehouse</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const scanStats = scanStatsByItem.get(normalizeItemCode(item.item_code));
              const actualUom = scanStats?.uom || item.uom;

              return (
                <tr key={item.id || `${item.item_code}-${index}`}>
                  <td className="border p-2">{formatValue(item.item_code)}</td>
                  <td className="border p-2">{formatValue(item.item_name || item.item_code)}</td>
                  <td className="whitespace-nowrap border p-2 text-right">
                    {formatValue(item.quantity)}
                  </td>
                  <td className="whitespace-nowrap border p-2 text-right font-semibold">
                    {scanStats ? formatQuantityNumber(scanStats.quantity) : '-'}
                  </td>
                  <td className="whitespace-nowrap border p-2 text-right">
                    {scanStats?.boxes ? scanStats.boxes : '-'}
                  </td>
                  <td className="whitespace-nowrap border p-2">{formatValue(actualUom)}</td>
                  <td className="whitespace-nowrap border p-2 text-right">
                    {formatValue(item.total_weight)}
                  </td>
                  {showWarehouseColumn ? (
                    <td className="whitespace-nowrap border p-2">{formatItemWarehouse(item)}</td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function summarizeItemWarehouses(items: SalesDispatchItem[]) {
  const warehouses = Array.from(
    new Set(items.map(formatItemWarehouse).filter((warehouse) => hasDisplayValue(warehouse))),
  );
  if (warehouses.length === 0) return undefined;
  if (warehouses.length === 1) return warehouses[0];
  return null;
}

function formatItemWarehouse(item: SalesDispatchItem) {
  return item.warehouse_code || item.from_warehouse || item.to_warehouse || '';
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

function hasDisplayValue(value?: string | number | null) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function hasDistinctDocumentValues(values: Array<string | undefined>) {
  return new Set(values.filter((value) => hasDisplayValue(value))).size > 1;
}

function formatDocumentNumbers(entry: SalesDispatchGateOut) {
  const numbers = entry.document_numbers?.length
    ? entry.document_numbers
    : entry.sap_doc_num
      ? [entry.sap_doc_num]
      : [];
  return numbers.join(', ') || '-';
}

function formatPrintType(value: SalesDispatchGatepassPrintLog['print_type']) {
  return value === 'REPRINT' ? 'Reprint' : 'Original';
}

function isGatepassReprintCandidate(entry: SalesDispatchGateOut) {
  return Boolean(
    entry.gatepass_no && entry.printed_at && !['CANCELLED', 'REJECTED'].includes(entry.status),
  );
}

function formatReprintOptionLabel(entry: SalesDispatchGateOut) {
  return [entry.gatepass_no, entry.entry_no, entry.vehicle_no].filter(Boolean).join(' | ');
}

function findNewestReprintLog(entry: SalesDispatchGateOut, reason: string) {
  return (
    entry.gatepass_print_logs?.find(
      (log) => log.print_type === 'REPRINT' && log.reprint_reason === reason,
    ) ||
    entry.gatepass_print_logs?.find((log) => log.print_type === 'REPRINT') ||
    null
  );
}
