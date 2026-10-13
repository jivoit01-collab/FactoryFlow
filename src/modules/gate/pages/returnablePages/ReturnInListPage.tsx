import { AlertTriangle, CalendarClock, CheckCircle2, Eye, PackageOpen, Search, Undo2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  useGateInMaterialIndent,
  useMaterialIndents,
  useUploadMaterialIndentAttachment,
} from '@/modules/maintenance/api';
import {
  arrivalCountsError,
  arrivalPayloadItems,
  fullArrivalCounts,
  isPartArrival,
  MaterialIndentArrivalLines,
  MaterialIndentStatusBadge,
} from '@/modules/maintenance/components';
import { ReturnableStatusBadge } from '@/modules/maintenance/components/returnable';
import type { MaterialIndent } from '@/modules/maintenance/types';
import { DashboardHeader } from '@/shared/components/dashboard';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useReturnableGatePasses } from '../../api/returnable';

const GATE_IN_VISIBLE_STATUSES = 'OUT,PARTIALLY_RETURNED,RETURNED,CLOSED';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OUT', label: 'Out with Party' },
  { value: 'PARTIALLY_RETURNED', label: 'Partially Returned' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CLOSED', label: 'Closed' },
];

const OUTSTANDING: string[] = ['OUT', 'PARTIALLY_RETURNED'];

// The material-indent statuses that concern the gate's inbound screen.
const INDENT_GATE_STATUSES = 'PURCHASED,PARTIALLY_ARRIVED,GATE_IN,RECEIVED';
// A purchase the gate is still expecting (some or all of it).
const INDENT_EXPECTED: string[] = ['PURCHASED', 'PARTIALLY_ARRIVED'];

/** "2 items still to come": the bought lines the gate is still waiting for. */
function indentArrivalProgress(indent: MaterialIndent) {
  const left = indent.items.filter((item) => Number(item.pending_arrival_quantity) > 0).length;
  return `${left} item${left === 1 ? '' : 's'} still to come`;
}

type TypeFilter = 'ALL' | 'RETURNABLE' | 'MATERIAL_INDENT';

/**
 * Gate-in dialog for a purchased material indent: what this vehicle brought,
 * the vehicle, and the invoice/bill. A part delivery leaves the rest open here
 * for the next vehicle.
 */
function IndentGateInDialog({
  indent,
  onOpenChange,
}: {
  indent: MaterialIndent;
  onOpenChange: (open: boolean) => void;
}) {
  const gateIn = useGateInMaterialIndent();
  const uploadAttachment = useUploadMaterialIndentAttachment();
  const [counts, setCounts] = useState<Record<number, string>>(() => fullArrivalCounts(indent));
  const [countsError, setCountsError] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [docType, setDocType] = useState('INVOICE');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gate In — {indent.indent_no}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <MaterialIndentArrivalLines
            indent={indent}
            counts={counts}
            onChange={(next) => {
              setCounts(next);
              setCountsError('');
            }}
            disabled={busy}
          />
          {countsError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {countsError}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Vehicle number</Label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Driver name</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Driver mobile</Label>
              <Input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Document type</Label>
              <NativeSelect value={docType} onChange={(e) => setDocType(e.target.value)}>
                <SelectOption value="INVOICE">Invoice</SelectOption>
                <SelectOption value="BILL">Bill</SelectOption>
                <SelectOption value="OTHER">Other</SelectOption>
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Invoice / bill files</Label>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
              <Upload className="h-4 w-4" />
              Add files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  if (picked.length) setFiles((c) => [...c, ...picked]);
                }}
              />
            </label>
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">{files.length} file(s) selected</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              const problem = arrivalCountsError(indent, counts);
              if (problem) {
                setCountsError(problem);
                return;
              }
              const partial = isPartArrival(indent, counts);
              setBusy(true);
              try {
                for (const file of files) {
                  await uploadAttachment.mutateAsync({
                    indent: indent.id,
                    file,
                    doc_type: docType as 'INVOICE' | 'BILL' | 'OTHER',
                  });
                }
                await gateIn.mutateAsync({
                  indentId: indent.id,
                  payload: {
                    vehicle_number: vehicleNumber.trim(),
                    driver_name: driverName.trim(),
                    driver_mobile: driverMobile.trim(),
                    items: arrivalPayloadItems(indent, counts),
                  },
                });
                toast.success(
                  partial
                    ? 'Part gated in — sent to store. The rest stays open here.'
                    : 'Gated in — sent to store to receive',
                );
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy ? 'Saving…' : isPartArrival(indent, counts) ? 'Gate In Part' : 'Confirm Gate In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReturnInListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canGateIn = hasPermission(MAINTENANCE_PERMISSIONS.GATEIN_MATERIAL_INDENT);
  const canViewIndent = hasPermission(MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [gateInFor, setGateInFor] = useState<MaterialIndent | null>(null);

  const filters = useMemo(
    () => ({
      q: search || undefined,
      status: status === 'ALL' ? GATE_IN_VISIBLE_STATUSES : status,
      is_returnable: true,
      overdue: overdueOnly ? true : undefined,
    }),
    [search, status, overdueOnly],
  );

  const { data: passes, isLoading } = useReturnableGatePasses(filters);
  // Purchased material indents also arrive through this gate screen.
  const { data: indents } = useMaterialIndents(
    { search: search || undefined, status: 'ALL' as const },
    canViewIndent && typeFilter !== 'RETURNABLE',
  );
  const indentArrivals = useMemo(
    () => (indents ?? []).filter((i) => INDENT_GATE_STATUSES.split(',').includes(i.status)),
    [indents],
  );

  const showReturnable = typeFilter !== 'MATERIAL_INDENT';
  const showIndents = typeFilter !== 'RETURNABLE' && !overdueOnly;

  const outstandingCount = passes?.filter((pass) => OUTSTANDING.includes(pass.status)).length ?? 0;
  const overdueCount = passes?.filter((pass) => pass.is_overdue).length ?? 0;
  const arrivingCount = indentArrivals.filter((i) => INDENT_EXPECTED.includes(i.status)).length;

  const empty = (!passes?.length || !showReturnable) && (!indentArrivals.length || !showIndents);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DashboardHeader
        title="Material In"
      />

      {overdueCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm text-rose-900 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {overdueCount} gate pass{overdueCount === 1 ? ' is' : 'es are'} past their expected return
          date.
        </div>
      ) : arrivingCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 p-3 text-sm text-cyan-900 dark:text-cyan-400">
          <PackageOpen className="h-4 w-4 shrink-0" />
          {arrivingCount} purchased material indent{arrivingCount === 1 ? '' : 's'} waiting to be gated
          in.
        </div>
      ) : outstandingCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-3 text-sm text-blue-900 dark:text-blue-400">
          <Undo2 className="h-4 w-4 shrink-0" />
          {outstandingCount} gate pass{outstandingCount === 1 ? '' : 'es'} still outside the gate.
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search pass no, party, item or serial number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <NativeSelect
            className="sm:w-48"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
          >
            <SelectOption value="ALL">All Types</SelectOption>
            <SelectOption value="RETURNABLE">Returnable</SelectOption>
            <SelectOption value="MATERIAL_INDENT">Material Indent</SelectOption>
          </NativeSelect>

          <NativeSelect
            className="sm:w-52"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </NativeSelect>

          <Button
            type="button"
            variant={overdueOnly ? 'default' : 'outline'}
            onClick={() => setOverdueOnly((previous) => !previous)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Overdue only
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">No</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Party / Requester</th>
              <th className="px-3 py-2 text-left font-medium">Items</th>
              <th className="px-3 py-2 text-left font-medium">Expected Back</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  <PackageOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nothing matches these filters.
                </td>
              </tr>
            ) : (
              <>
                {showReturnable &&
                  passes?.map((pass) => {
                    const isOutstanding = OUTSTANDING.includes(pass.status);
                    return (
                      <tr
                        key={`rgp-${pass.id}`}
                        className={cn('border-t hover:bg-muted/30', pass.is_overdue && 'bg-rose-50/60 dark:bg-rose-500/10')}
                      >
                        <td className="px-3 py-2 font-medium">{pass.pass_no}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-muted-foreground">
                            Returnable
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <ReturnableStatusBadge
                            status={pass.status}
                            isOverdue={pass.is_overdue}
                            daysOverdue={pass.days_overdue}
                          />
                          {pass.status === 'PARTIALLY_RETURNED' && pass.items_back !== undefined && (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {pass.item_count - pass.items_back} item
                              {pass.item_count - pass.items_back === 1 ? '' : 's'} still out
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{pass.party_name || '—'}</td>
                        <td className="max-w-[220px] px-3 py-2">
                          <span className="block truncate" title={pass.item_names}>
                            {pass.item_names || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {pass.expected_return_date ? (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                              {new Date(pass.expected_return_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant={isOutstanding ? 'default' : 'outline'}
                            onClick={() => navigate(`/gate/return-in/${pass.id}`)}
                          >
                            {isOutstanding ? (
                              <>
                                <Undo2 className="mr-2 h-4 w-4" />
                                {pass.status === 'PARTIALLY_RETURNED' ? 'Record Rest' : 'Record Return'}
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                {showIndents &&
                  indentArrivals.map((indent) => (
                    <tr key={`mi-${indent.id}`} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{indent.indent_no}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                          Material Indent
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <MaterialIndentStatusBadge status={indent.status} />
                        {indent.status === 'PARTIALLY_ARRIVED' && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {indentArrivalProgress(indent)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {indent.requested_by_name || indent.created_by_name || '—'}
                      </td>
                      <td className="max-w-[220px] px-3 py-2">
                        <span className="block truncate">
                          {indent.items.map((i) => i.particulars).join(', ') || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">—</td>
                      <td className="px-3 py-2 text-right">
                        {INDENT_EXPECTED.includes(indent.status) && canGateIn ? (
                          <Button size="sm" onClick={() => setGateInFor(indent)}>
                            <PackageOpen className="mr-2 h-4 w-4" />
                            {indent.status === 'PARTIALLY_ARRIVED' ? 'Gate In Rest' : 'Gate In'}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {indent.status === 'GATE_IN' ? 'Awaiting store receipt' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {gateInFor && (
        <IndentGateInDialog
          indent={gateInFor}
          onOpenChange={(open) => {
            if (!open) setGateInFor(null);
          }}
        />
      )}
    </div>
  );
}
