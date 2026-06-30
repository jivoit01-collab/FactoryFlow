import { useQueries } from '@tanstack/react-query';
import { CheckCircle2, Lock, Printer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import {
  SALES_DISPATCH_QUERY_KEYS,
  salesDispatchApi,
  type SalesDispatchGateOut,
} from '@/modules/gate/api';
import type { ArrivalGatepassCompany } from '@/modules/gate/api/arrivals/arrivals.api';
import {
  useArrivalGatepassReadiness,
  useArrivals,
  useCommitArrivalGatepass,
  usePrintArrivalGatepass,
  useReprintArrivalGatepass,
} from '@/modules/gate/api/arrivals/arrivals.queries';
import {
  Badge,
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
  SalesDispatchSapGatepassPrint,
  SAP_GATEPASS_PRINT_PAGE_STYLE,
} from './SalesDispatchSapGatepassPrint';

/**
 * The one ARV/... combined gatepass for a multi-company truck: per-company
 * readiness, print (assigns the combined number and each company's DCK/... number),
 * commit, and audited reprint, with an off-screen print host that renders one
 * arrival header followed by a SAP bill-summary section per company.
 *
 * Self-contained (fetches arrival + readiness + each docking by id) so it can be
 * dropped INLINE on the per-docking gatepass screen and reused on the standalone
 * Arrivals page -- the combined print never needs a separate page. Dispatch and
 * depart are deliberately NOT here; the host screen owns those.
 */
export function ArrivalCombinedGatepassPanel({ arrivalId }: { arrivalId: number }) {
  const validId = Number.isFinite(arrivalId) && arrivalId > 0;
  const arrivalsQuery = useArrivals(false, { enabled: validId });
  const arrival = arrivalsQuery.data?.find((a) => a.id === arrivalId);
  const readinessQuery = useArrivalGatepassReadiness(arrivalId, { enabled: validId });
  const readiness = readinessQuery.data;

  const printArrival = usePrintArrivalGatepass();
  const commitArrival = useCommitArrivalGatepass();
  const reprintArrival = useReprintArrivalGatepass();

  const [reprintReason, setReprintReason] = useState('');
  // Bumped after a print assigns numbers + the dockings refetch; the effect fires
  // the browser print once per new token (deduped via a ref).
  const [printToken, setPrintToken] = useState(0);
  const lastPrintedToken = useRef(0);

  const companies = useMemo(() => readiness?.companies ?? [], [readiness]);

  // Each company's full docking, so the print host renders a SAP gatepass section
  // per company inside the single printed document.
  const dockingQueries = useQueries({
    queries: companies.map((company) => ({
      queryKey: SALES_DISPATCH_QUERY_KEYS.detail(company.docking_id),
      queryFn: () => salesDispatchApi.get(company.docking_id),
      enabled: !!company.docking_id,
      staleTime: 15 * 1000,
    })),
  });
  const dockings = dockingQueries
    .map((query) => query.data)
    .filter((entry): entry is SalesDispatchGateOut => Boolean(entry));
  const dockingsFetching = dockingQueries.some((query) => query.isFetching);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: ['gatepass', readiness?.arrival_gatepass_no || arrival?.arrival_no]
      .filter(Boolean)
      .join('_'),
    pageStyle: SAP_GATEPASS_PRINT_PAGE_STYLE,
  });

  const isPrinted = Boolean(readiness?.arrival_gatepass_no);
  const isCommitted = Boolean(arrival?.gatepass_committed_at);
  const lockedCompanies = readiness?.locked_companies ?? [];

  useEffect(() => {
    if (printToken === 0 || lastPrintedToken.current === printToken) return;
    if (!isPrinted || dockingsFetching) return;
    if (dockings.length !== companies.length || companies.length === 0) return;
    lastPrintedToken.current = printToken;
    handlePrint();
  }, [printToken, isPrinted, dockingsFetching, dockings.length, companies.length, handlePrint]);

  const handlePrintCombined = async () => {
    try {
      if (!isPrinted) {
        await printArrival.mutateAsync({ id: arrivalId });
      }
      await readinessQuery.refetch();
      await Promise.all(dockingQueries.map((query) => query.refetch()));
      setPrintToken((token) => token + 1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleReprint = async () => {
    if (!reprintReason.trim()) {
      toast.error('Enter a reprint reason.');
      return;
    }
    try {
      await reprintArrival.mutateAsync({ id: arrivalId, reprintReason: reprintReason.trim() });
      setReprintReason('');
      handlePrint();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCommit = async () => {
    try {
      await commitArrival.mutateAsync(arrivalId);
      toast.success('Combined gatepass committed for every company.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (!validId) return null;

  return (
    <div className="space-y-4">
      {lockedCompanies.length > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <Lock className="h-4 w-4" />
          Printing is locked for: {lockedCompanies.join(', ')}. Unlock these companies to
          print the combined gatepass.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Combined gatepass — one pass for the whole truck
            {readiness?.arrival_gatepass_no ? (
              <Badge variant="secondary">{readiness.arrival_gatepass_no}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {readinessQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dockings on this truck yet.</p>
          ) : (
            companies.map((company) => (
              <CompanyReadinessRow key={company.docking_id} company={company} />
            ))
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={handlePrintCombined}
              disabled={
                printArrival.isPending ||
                (!isPrinted && (!readiness?.ready || companies.length === 0))
              }
            >
              <Printer className="mr-1 h-4 w-4" />
              {isPrinted ? 'Reprint dialog' : 'Print Combined Gatepass'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCommit}
              disabled={!isPrinted || isCommitted || commitArrival.isPending}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {isCommitted ? 'Committed' : 'Commit Print'}
            </Button>
          </div>

          {isPrinted ? (
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="arrival-reprint-reason">Audited reprint</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="arrival-reprint-reason"
                  placeholder="Reason for reprint"
                  value={reprintReason}
                  onChange={(event) => setReprintReason(event.target.value)}
                  className="max-w-sm"
                />
                <Button
                  variant="outline"
                  onClick={handleReprint}
                  disabled={reprintArrival.isPending || !reprintReason.trim()}
                >
                  Log Reprint
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Off-screen print host: one arrival header + one SAP bill summary per company. */}
      <div className="sap-gatepass-print-host" aria-hidden>
        <div ref={printRef}>
          <div className="sap-gatepass-arrival-cover" style={{ padding: '8mm 6mm 4mm' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Combined Gatepass {readiness?.arrival_gatepass_no || ''}
            </h2>
            {arrival ? (
              <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
                {arrival.arrival_no} · {arrival.vehicle_no} · {arrival.driver_name} ·{' '}
                {companies.length} compan{companies.length === 1 ? 'y' : 'ies'}
              </p>
            ) : null}
          </div>
          {dockings.map((docking, index) => (
            <div
              key={docking.id}
              style={{ breakBefore: index > 0 ? 'page' : 'auto', breakInside: 'avoid' }}
            >
              <SalesDispatchSapGatepassPrint
                entry={docking}
                companyName={docking.company_name || docking.company_code || ''}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompanyReadinessRow({ company }: { company: ArrivalGatepassCompany }) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <CheckCircle2
        className={cn(
          'mt-0.5 h-4 w-4',
          company.ready ? 'text-emerald-600' : 'text-muted-foreground',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{company.company_name}</span>
          <Badge variant="outline">{company.status}</Badge>
          {company.gatepass_no ? (
            <span className="text-xs text-muted-foreground">{company.gatepass_no}</span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {company.ready
            ? `Ready · ${company.entry_no}`
            : `Pending: ${company.missing.join(', ') || 'not ready'}`}
        </p>
      </div>
    </div>
  );
}

export default ArrivalCombinedGatepassPanel;
