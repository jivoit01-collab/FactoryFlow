import { ArrowLeft, FileText, LogOut, Printer, ScanLine, Send, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  useArrivalWorkspace,
  useCommitArrivalGatepass,
  useDepartArrival,
  useDispatchArrival,
  usePrintArrivalGatepass,
} from '@/modules/gate/api';
import { GateStatusBadge, StepLoadingSpinner } from '@/modules/gate/components';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { formatValue } from './salesDispatchFlow.helpers';

const MISSING_LABELS: Record<string, string> = {
  truck_photo_geolocation: 'truck photo + GPS',
  box_scans: 'box scans',
  document_items: 'items',
  bilty_no: 'bilty no',
  bilty_date: 'bilty date',
  bilty_attachment: 'bilty attachment',
  eway_bill: 'e-way bill',
  eway_bill_attachment: 'e-way bill attachment',
};

/**
 * One physical truck as a single page. A truck carrying bills for several
 * companies / SAP branches is several dockings under the hood (each keeps its own
 * SAP + gate-pass record for tax), but the operator works from one screen: every
 * bill in one table, one combined gross weight, one ARV gate pass, one dispatch,
 * one departure. Box scanning stays per-company (boxes belong to a company's WMS).
 */
export function UnifiedTruckView({
  arrivalId,
  scanBasePath,
}: {
  arrivalId: number;
  /** e.g. '/dispatch/docking' — used to build each docking's box-scan link. */
  scanBasePath: string;
}) {
  const navigate = useNavigate();
  const { data: ws, isLoading, error, refetch } = useArrivalWorkspace(arrivalId);
  const printGatepass = usePrintArrivalGatepass();
  const commitGatepass = useCommitArrivalGatepass();
  const dispatchTruck = useDispatchArrival();
  const departTruck = useDepartArrival();

  if (isLoading) return <StepLoadingSpinner />;
  if (error || !ws) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Could not load this truck.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const { arrival, gatepass, dockings } = ws;
  const activeDockings = dockings.filter(
    (docking) => docking.status !== 'REJECTED' && docking.status !== 'CANCELLED',
  );
  const allBills = activeDockings.flatMap((docking) =>
    (docking.documents ?? []).map((document) => ({ docking, document })),
  );
  const scannedBoxes = activeDockings.reduce(
    (sum, docking) => sum + (docking.box_scans?.length ?? 0),
    0,
  );
  const grossWeight = activeDockings.find((docking) => docking.gross_weight)?.gross_weight;

  const run = async (
    action: () => Promise<unknown>,
    ok: string,
    fallback: string,
  ) => {
    try {
      await action();
      toast.success(ok);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, fallback));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Truck className="h-6 w-6" />
              {arrival.vehicle_no}
            </h1>
            <p className="text-sm text-muted-foreground">
              {arrival.arrival_no} · {activeDockings.length} dockings · {allBills.length} bills ·{' '}
              {new Set(activeDockings.map((docking) => docking.company_code)).size} companies
            </p>
          </div>
        </div>
        <GateStatusBadge status={arrival.status} />
      </div>

      {/* Truck-level summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Truck
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Driver" value={arrival.driver_name} />
          <Field label="Gross weight" value={grossWeight ? `${grossWeight} kg` : '—'} />
          <Field
            label="Tare weight"
            value={arrival.tare_weight ? `${arrival.tare_weight} kg` : '—'}
          />
          <Field label="Boxes scanned" value={String(scannedBoxes)} />
        </CardContent>
      </Card>

      {/* All bills across every docking, one table */}
      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Bills on this truck
          </CardTitle>
          <span className="text-sm text-muted-foreground">{allBills.length} bills</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-muted/50">
                <tr>
                  <Th>Company</Th>
                  <Th>SAP Document</Th>
                  <Th>Customer</Th>
                  <Th>Docking</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {allBills.map(({ docking, document }) => (
                  <tr key={`${docking.id}-${document.sap_doc_entry}`} className="border-t">
                    <Td>
                      <span className="inline-flex whitespace-nowrap rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
                        {docking.company_name || docking.company_code}
                      </span>
                    </Td>
                    <Td className="font-medium">{document.sap_doc_num}</Td>
                    <Td>{formatValue(document.customer_name)}</Td>
                    <Td className="text-muted-foreground">{docking.entry_no}</Td>
                    <Td className="text-right">{formatValue(document.sap_doc_total)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Per-company work + readiness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScanLine className="h-5 w-5" />
            Per-company dockings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Box scanning and the SAP gate pass are per company/branch. Open a docking to scan its
            boxes; the combined truck gate pass below covers them all.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeDockings.map((docking) => {
            const readiness = gatepass.companies.find((c) => c.docking_id === docking.id);
            return (
              <div key={docking.id} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex whitespace-nowrap rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
                    {docking.company_name || docking.company_code}
                  </span>
                  <span className="text-sm font-medium">{docking.entry_no}</span>
                  <GateStatusBadge status={docking.status} />
                  <span className="text-xs text-muted-foreground">
                    {docking.box_scans?.length ?? 0} boxes scanned
                  </span>
                  {readiness && !readiness.ready && readiness.missing.length ? (
                    <span className="text-xs text-amber-600">
                      needs: {readiness.missing.map((m) => MISSING_LABELS[m] || m).join(', ')}
                    </span>
                  ) : null}
                  {readiness?.ready ? (
                    <span className="text-xs text-emerald-600">ready</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/dispatch/docking/new/barcode-scan?entryId=${docking.vehicle_entry}`,
                      )
                    }
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    Scan boxes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`${scanBasePath}/${docking.id}`)}
                  >
                    Open docking
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Combined truck actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5" />
            Truck actions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {gatepass.arrival_gatepass_no
              ? `Combined gate pass ${gatepass.arrival_gatepass_no}`
              : gatepass.ready
                ? 'All companies are ready — print the combined gate pass.'
                : 'Finish each company above, then print the combined gate pass.'}
            {gatepass.locked_companies.length
              ? ` · locked: ${gatepass.locked_companies.join(', ')}`
              : ''}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            disabled={!gatepass.ready || printGatepass.isPending}
            onClick={() =>
              run(
                () => printGatepass.mutateAsync({ id: arrivalId }),
                'Combined gate pass printed',
                'Failed to print the combined gate pass',
              )
            }
          >
            <Printer className="mr-2 h-4 w-4" />
            {gatepass.arrival_gatepass_no ? 'Reprint gate pass' : 'Print combined gate pass'}
          </Button>
          <Button
            variant="outline"
            disabled={!gatepass.arrival_gatepass_no || commitGatepass.isPending}
            onClick={() =>
              run(
                () => commitGatepass.mutateAsync(arrivalId),
                'Gate pass committed',
                'Failed to commit the gate pass',
              )
            }
          >
            Commit print
          </Button>
          <Button
            variant="outline"
            disabled={!ws.can_dispatch || dispatchTruck.isPending}
            onClick={() =>
              run(
                () => dispatchTruck.mutateAsync(arrivalId),
                'Whole truck dispatched',
                'Failed to dispatch the truck',
              )
            }
          >
            <Send className="mr-2 h-4 w-4" />
            Dispatch whole truck
          </Button>
          <Button
            variant="outline"
            disabled={!ws.can_depart || departTruck.isPending}
            onClick={() =>
              run(
                () => departTruck.mutateAsync({ id: arrivalId }),
                'Truck departed',
                'Failed to record departure',
              )
            }
          >
            <LogOut className="mr-2 h-4 w-4" />
            Depart truck
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('p-3 text-left text-sm font-medium', className)}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('p-3 text-sm', className)}>{children}</td>;
}
