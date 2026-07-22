import { addDays,format, subDays } from 'date-fns';
import {
  AlertTriangle,
  ArrowRightLeft,
  LogOut,
  PackagePlus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { useAuth } from '@/core/auth';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useDispatchBills, useLookupDispatchBill } from '@/modules/dashboards/dispatch-plans/api';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import {
  type InsideDispatchVehicle,
  type InsideVehicleBill,
  useAddBillToInsideVehicle,
  useAddBillToTruck,
  useInsideDispatchVehicles,
  useMoveBillBetweenVehicles,
  useRemoveBillFromInsideVehicle,
  useUnlinkAllBills,
} from '@/modules/gate/api';
import { SearchableSelect } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils/error';

function compact(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

function formatNumber(value: number, fractionDigits = 2) {
  return value.toLocaleString('en-IN', { maximumFractionDigits: fractionDigits });
}

function billLabel(bill: DispatchBill) {
  return [bill.doc_num, bill.card_name].filter(Boolean).join(' - ');
}

/** A bill can be added only if it isn't already linked and is still open. */
function isBillAddable(bill: DispatchBill) {
  return (
    !bill.plan.linked_vehicle_entry_id &&
    (bill.plan.booking_status === 'PENDING' || bill.plan.booking_status === 'BOOKED')
  );
}

function formatEntryDateTime(date: string | null, time: string | null) {
  if (!date) return '-';
  return [date, time ? time.slice(0, 5) : ''].filter(Boolean).join(' ');
}

/**
 * One physical truck's gate-ins, folded across companies by their shared
 * arrival, so a truck inside under several companies shows as ONE card carrying
 * every company's bills (matching the docking board) instead of one card per
 * company gate-in. Each company keeps its own `InsideDispatchVehicle` entry
 * underneath (actions stay per-gate-in / per-company).
 */
interface VehicleGroup {
  key: string;
  vehicleNumber: string;
  arrivalNo: string | null;
  gateInDate: string | null;
  inTime: string | null;
  driverName: string;
  driverMobile: string;
  companies: string[];
  totalBills: number;
  entries: InsideDispatchVehicle[];
}

function buildVehicleGroups(vehicles: InsideDispatchVehicle[]): VehicleGroup[] {
  const groups = new Map<string, VehicleGroup>();
  const order: string[] = [];
  for (const v of vehicles) {
    // Fold by the shared arrival; fall back to the physical vehicle (NOT the
    // per-company gate-in) so that if the arrival is ever missing, two companies
    // on the same truck still land on one card instead of splitting. Safe here
    // because this feed is inside-only (no departed rows to over-merge).
    const key = v.arrival != null ? `arv:${v.arrival}` : `veh:${v.vehicle_id}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        vehicleNumber: v.vehicle_number,
        arrivalNo: v.arrival_no,
        gateInDate: v.gate_in_date,
        inTime: v.in_time,
        driverName: v.driver_name,
        driverMobile: v.driver_mobile,
        companies: [],
        totalBills: 0,
        entries: [],
      };
      groups.set(key, group);
      order.push(key);
    }
    group.entries.push(v);
    group.totalBills += v.bills.length;
    if (v.company_name && !group.companies.includes(v.company_name)) {
      group.companies.push(v.company_name);
    }
  }
  return order.map((key) => groups.get(key)!);
}

/** A destination truck option for the Move action. */
interface MoveTarget {
  vehicleId: number;
  label: string;
}

/** A risky, in-place mutation awaiting confirmation in the popup. */
type PendingConfirm =
  | { kind: 'remove'; entry: InsideDispatchVehicle; bill: InsideVehicleBill }
  | { kind: 'unlinkAll'; entry: InsideDispatchVehicle }
  | {
      kind: 'move';
      entry: InsideDispatchVehicle;
      bill: InsideVehicleBill;
      targetVehicleId: number;
      targetLabel: string;
    };

function getConfirmCopy(pending: PendingConfirm | null) {
  if (!pending) return null;
  if (pending.kind === 'remove') {
    return {
      title: 'Remove this bill?',
      description: `Remove ${pending.bill.sap_doc_num} from ${pending.entry.company_name} on ${pending.entry.vehicle_number}. The bill goes back to Pending for re-planning.`,
      confirmLabel: 'Remove bill',
      destructive: true,
    };
  }
  if (pending.kind === 'unlinkAll') {
    return {
      title: 'Unlink all bills?',
      description: `Remove all ${pending.entry.bills.length} ${pending.entry.company_name} bill(s) from ${pending.entry.vehicle_number}. Committed (scanned/dispatched) bills are skipped.`,
      confirmLabel: 'Unlink all',
      destructive: true,
    };
  }
  return {
    title: 'Move this bill?',
    description: `Move ${pending.bill.sap_doc_num} to ${pending.targetLabel}.`,
    confirmLabel: 'Move bill',
    destructive: false,
  };
}

/**
 * Inside Vehicle Manager — the dispatch correction console. Fix vehicle/bill
 * issues without touching the database: add, remove, or move bills on a vehicle
 * that is already inside, reset a vehicle's bills, or send it to the empty-out
 * flow. Cross-company: one card per physical truck (grouped by arrival), with a
 * panel per company gate-in on that truck.
 */
export default function InsideVehicleManagerPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  // One permission per action — each button is gated independently.
  const canAdd = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_ADD_BILL);
  const canRemove = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_REMOVE_BILL);
  const canMove = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_MOVE_BILL);
  const canUnlink = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_UNLINK_ALL);
  const canMarkOut = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_MARK_OUT);

  const [search, setSearch] = useState('');
  const [addForVehicleEntryId, setAddForVehicleEntryId] = useState<number | null>(null);
  // The debounced search term of the open "Add a bill" picker, used to look a
  // bill up by number on the server when it falls outside the 500-row feed.
  const [addSearch, setAddSearch] = useState('');
  // Truck-level "add a bill of another company" form: which truck (group key) is
  // open, the chosen company, and its own picker search term.
  const [addTruckKey, setAddTruckKey] = useState<string | null>(null);
  const [addTruckCompany, setAddTruckCompany] = useState<string | null>(null);
  const [addTruckSearch, setAddTruckSearch] = useState('');
  const [movingBill, setMovingBill] = useState<{ vehicleEntryId: number; docEntry: number } | null>(
    null,
  );
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const vehiclesQuery = useInsideDispatchVehicles();
  const billFilters = useMemo(
    () => ({
      date_from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      date_to: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      limit: 500,
      // Cross-company feed so a bill can be added to any inside vehicle, tagged
      // with company_code to scope the picker to each vehicle's own company.
      all_companies: true,
    }),
    [],
  );
  const billsQuery = useDispatchBills(billFilters);

  const addBill = useAddBillToInsideVehicle();
  const addBillToTruck = useAddBillToTruck();
  const removeBill = useRemoveBillFromInsideVehicle();
  const moveBill = useMoveBillBetweenVehicles();
  const unlinkAll = useUnlinkAllBills();
  const { companies } = useAuth();

  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter((v) =>
      [
        v.vehicle_number,
        v.entry_no,
        v.arrival_no,
        v.company_name,
        v.driver_name,
        ...v.bills.map((b) => b.sap_doc_num),
      ].some((value) => String(value || '').toLowerCase().includes(query)),
    );
  }, [vehicles, search]);
  const groups = useMemo(() => buildVehicleGroups(filteredVehicles), [filteredVehicles]);

  // Distinct physical trucks currently inside — a bill can be moved to any of
  // them (trucks are not company-scoped; the bill's company chain is created on
  // the destination truck's trip if needed).
  const insideTrucks = useMemo(() => {
    const seen = new Map<number, { vehicleId: number; label: string }>();
    for (const v of vehicles) {
      if (!seen.has(v.vehicle_id)) {
        seen.set(v.vehicle_id, {
          vehicleId: v.vehicle_id,
          label: v.arrival_no ? `${v.vehicle_number} — ${v.arrival_no}` : v.vehicle_number,
        });
      }
    }
    return Array.from(seen.values());
  }, [vehicles]);

  const addableBills = useMemo(
    () => (billsQuery.data?.data ?? []).filter(isBillAddable),
    [billsQuery.data],
  );

  // The panel whose "Add a bill" picker is open. Its company scopes the by-number
  // lookup below, so a bill older than the 500-row feed is still findable by
  // typing its full number (the feed can't reach that far in high-volume companies).
  const openEntry = useMemo(
    () => vehicles.find((v) => v.vehicle_entry_id === addForVehicleEntryId) ?? null,
    [vehicles, addForVehicleEntryId],
  );
  const billLookupQuery = useLookupDispatchBill(addSearch, openEntry?.company_code ?? undefined);
  const lookedUpBill =
    billLookupQuery.data && isBillAddable(billLookupQuery.data) ? billLookupQuery.data : null;

  // Same by-number lookup, scoped to the company chosen in the truck-level
  // "add another company's bill" form, so its picker also reaches past the feed.
  const truckBillLookupQuery = useLookupDispatchBill(
    addTruckSearch,
    addTruckCompany ?? undefined,
  );
  const truckLookedUpBill =
    truckBillLookupQuery.data && isBillAddable(truckBillLookupQuery.data)
      ? truckBillLookupQuery.data
      : null;
  const truckAddableBills = useMemo(() => {
    if (!addTruckCompany) return [];
    const feed = addableBills.filter((b) => b.company_code === addTruckCompany);
    if (truckLookedUpBill && !feed.some((b) => b.doc_entry === truckLookedUpBill.doc_entry)) {
      return [{ ...truckLookedUpBill, company_code: addTruckCompany }, ...feed];
    }
    return feed;
  }, [addTruckCompany, addableBills, truckLookedUpBill]);

  const handleAdd = async (entry: InsideDispatchVehicle, bill: DispatchBill) => {
    try {
      const res = await addBill.mutateAsync({
        vehicle_entry_id: entry.vehicle_entry_id,
        sap_doc_entry: bill.doc_entry,
      });
      toast.success(res.detail || 'Bill added');
      setAddForVehicleEntryId(null);
      setAddSearch('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add the bill'));
    }
  };

  const handleAddToTruck = async (
    vehicleId: number,
    companyCode: string,
    bill: DispatchBill,
  ) => {
    try {
      const res = await addBillToTruck.mutateAsync({
        vehicle_id: vehicleId,
        company_code: companyCode,
        sap_doc_entry: bill.doc_entry,
      });
      toast.success(res.detail || 'Bill added');
      setAddTruckKey(null);
      setAddTruckCompany(null);
      setAddTruckSearch('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add the bill'));
    }
  };

  const handleRemove = async (entry: InsideDispatchVehicle, bill: InsideVehicleBill) => {
    try {
      const res = await removeBill.mutateAsync({
        vehicle_entry_id: entry.vehicle_entry_id,
        sap_doc_entry: bill.sap_doc_entry,
      });
      toast.success(res.detail || 'Bill removed');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove the bill'));
    }
  };

  const handleMove = async (
    fromVehicleEntryId: number,
    toVehicleId: number,
    docEntry: number,
  ) => {
    try {
      const res = await moveBill.mutateAsync({
        from_vehicle_entry_id: fromVehicleEntryId,
        to_vehicle_id: toVehicleId,
        sap_doc_entry: docEntry,
      });
      toast.success(res.detail || 'Bill moved');
      setMovingBill(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to move the bill'));
    }
  };

  const handleUnlinkAll = async (entry: InsideDispatchVehicle) => {
    try {
      const res = await unlinkAll.mutateAsync({ vehicle_entry_id: entry.vehicle_entry_id });
      toast.success(res.detail || 'Bills removed');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reset the vehicle'));
    }
  };

  const confirmLoading = removeBill.isPending || moveBill.isPending || unlinkAll.isPending;
  const runPendingConfirm = async () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === 'remove') {
      await handleRemove(pendingConfirm.entry, pendingConfirm.bill);
    } else if (pendingConfirm.kind === 'unlinkAll') {
      await handleUnlinkAll(pendingConfirm.entry);
    } else {
      await handleMove(
        pendingConfirm.entry.vehicle_entry_id,
        pendingConfirm.targetVehicleId,
        pendingConfirm.bill.sap_doc_entry,
      );
    }
    setPendingConfirm(null);
  };
  const confirmCopy = getConfirmCopy(pendingConfirm);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Inside Vehicle Manager"
        description="Fix dispatch issues on vehicles that are already inside — add, remove, or move bills, reset, or mark a vehicle out (no database edits)."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => vehiclesQuery.refetch()}
          disabled={vehiclesQuery.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="relative w-full lg:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search vehicle, entry, arrival, company, driver, bill"
          className="pl-9"
        />
      </div>

      {vehiclesQuery.isLoading ? (
        <EmptyState text="Loading inside vehicles..." />
      ) : vehicles.length === 0 ? (
        <EmptyState text="No dispatch vehicles are currently inside." />
      ) : groups.length === 0 ? (
        <EmptyState text="No inside vehicles match this search." />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const truckVehicleId = group.entries[0]?.vehicle_id;
            const onTruckCompanyCodes = new Set(group.entries.map((e) => e.company_code));
            const candidateCompanies = companies.filter(
              (c) => !onTruckCompanyCodes.has(c.company_code),
            );
            const isTruckAddOpen = addTruckKey === group.key;
            return (
            <Card key={group.key}>
              <CardContent className="space-y-4 p-4">
                {/* Physical-truck header + vehicle-level actions */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold">{group.vehicleNumber}</span>
                      {group.arrivalNo ? (
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          {group.arrivalNo}
                        </Badge>
                      ) : null}
                      {group.companies.map((company) => (
                        <Badge key={company} variant="outline">
                          {company}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      In {formatEntryDateTime(group.gateInDate, group.inTime)} · Driver{' '}
                      {compact(group.driverName)} · {compact(group.driverMobile)} ·{' '}
                      {group.totalBills} bill(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canAdd && candidateCompanies.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAddTruckCompany(null);
                          setAddTruckSearch('');
                          setAddTruckKey(isTruckAddOpen ? null : group.key);
                        }}
                      >
                        <PackagePlus className="mr-2 h-4 w-4" />
                        Add other bill
                      </Button>
                    )}
                    {canMarkOut && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/gate/empty-vehicle-out/new?entry=${group.entries[0].vehicle_entry_id}`,
                          )
                        }
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Mark Out
                      </Button>
                    )}
                  </div>
                </div>

                {/* Truck-level add: a bill of a company with no gate-in here yet. */}
                {isTruckAddOpen && (
                  <div className="space-y-3 rounded-md border border-dashed p-3">
                    <p className="text-sm font-medium">Add a bill from another company</p>
                    <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
                      <Label htmlFor={`add-truck-company-${group.key}`} className="text-xs">
                        Company
                      </Label>
                      <Select
                        id={`add-truck-company-${group.key}`}
                        value={addTruckCompany ?? ''}
                        onChange={(event) => {
                          setAddTruckCompany(event.target.value || null);
                          setAddTruckSearch('');
                        }}
                      >
                        <SelectOption value="">Select a company…</SelectOption>
                        {candidateCompanies.map((c) => (
                          <SelectOption key={c.company_code} value={c.company_code}>
                            {c.company_name}
                          </SelectOption>
                        ))}
                      </Select>
                    </div>
                    {addTruckCompany && (
                      <div className="rounded-md border bg-muted/30 p-3">
                        <SearchableSelect<DispatchBill>
                          inputId={`add-truck-bill-${group.key}`}
                          label="Add a bill"
                          value=""
                          items={truckAddableBills}
                          isLoading={
                            billsQuery.isLoading ||
                            billsQuery.isFetching ||
                            truckBillLookupQuery.isFetching
                          }
                          isError={billsQuery.isError}
                          placeholder="Search a booked/pending bill by number or customer"
                          getItemKey={(bill) => bill.doc_entry}
                          getItemLabel={billLabel}
                          filterFn={(bill, query) =>
                            billLabel(bill).toLowerCase().includes(query.trim().toLowerCase())
                          }
                          onSearchChange={setAddTruckSearch}
                          loadingText="Loading bills..."
                          emptyText="Search a bill to add"
                          notFoundText="No addable bills found"
                          errorText="Failed to load bills"
                          onClear={() => undefined}
                          onItemSelect={(bill) => {
                            if (truckVehicleId != null) {
                              void handleAddToTruck(truckVehicleId, addTruckCompany, bill);
                            }
                          }}
                          renderItem={(bill) => (
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                {bill.doc_num} - {compact(bill.card_name)}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {formatNumber(bill.total_weight, 3)} kg · {bill.plan.booking_status}
                              </div>
                            </div>
                          )}
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Adds the bill to this truck under a new gate-in for the selected
                          company. Type a full bill number to find one outside the recent list.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* One panel per company gate-in on this truck */}
                {group.entries.map((entry) => {
                  const isAddOpen = addForVehicleEntryId === entry.vehicle_entry_id;
                  const feedAddableBills = addableBills.filter(
                    (b) => b.company_code === entry.company_code,
                  );
                  // When this panel's picker is open, fold in the server-looked-up
                  // bill (scoped to this company) if it isn't already in the feed —
                  // this is what lets a bill outside the 500-row window be added.
                  const vehicleAddableBills =
                    isAddOpen &&
                    lookedUpBill &&
                    !feedAddableBills.some((b) => b.doc_entry === lookedUpBill.doc_entry)
                      ? [{ ...lookedUpBill, company_code: entry.company_code }, ...feedAddableBills]
                      : feedAddableBills;
                  const moveTargets = insideTrucks.filter(
                    (t) => t.vehicleId !== entry.vehicle_id,
                  );
                  return (
                    <div
                      key={entry.vehicle_entry_id}
                      className="space-y-3 rounded-md border p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{entry.company_name}</Badge>
                        <span className="text-xs text-muted-foreground">{entry.entry_no}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.bills.length} bill(s)
                        </span>
                        <div className="ml-auto flex gap-2">
                          {canAdd && (
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setAddSearch('');
                                setAddForVehicleEntryId(
                                  addForVehicleEntryId === entry.vehicle_entry_id
                                    ? null
                                    : entry.vehicle_entry_id,
                                );
                              }}
                            >
                              <PackagePlus className="mr-2 h-4 w-4" />
                              Add Bill
                            </Button>
                          )}
                          {canUnlink && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={entry.bills.length === 0}
                              onClick={() => setPendingConfirm({ kind: 'unlinkAll', entry })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Unlink All
                            </Button>
                          )}
                        </div>
                      </div>

                      {entry.bills.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No bills on this company.</p>
                      ) : (
                        <div className="divide-y rounded-md border">
                          {entry.bills.map((bill) => {
                            const isMoving =
                              movingBill?.vehicleEntryId === entry.vehicle_entry_id &&
                              movingBill?.docEntry === bill.sap_doc_entry;
                            return (
                              <div key={bill.sap_doc_entry} className="space-y-2 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-sm font-medium">
                                    {bill.sap_doc_num}
                                  </span>
                                  {bill.booking_status ? (
                                    <Badge variant="outline">{bill.booking_status}</Badge>
                                  ) : null}
                                  {bill.duplicate_on.length > 0 ? (
                                    <Badge
                                      variant="outline"
                                      className="border-red-300 text-red-700"
                                      title={`Also on: ${bill.duplicate_on.join(', ')}`}
                                    >
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Duplicate cover ({bill.duplicate_on.length})
                                    </Badge>
                                  ) : null}
                                  {!bill.removable && bill.not_removable_reason ? (
                                    <span className="text-xs text-muted-foreground">
                                      Locked — {bill.not_removable_reason}
                                    </span>
                                  ) : null}

                                  <div className="ml-auto flex gap-2">
                                    {canMove && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={!bill.removable || moveTargets.length === 0}
                                        title={
                                          moveTargets.length === 0
                                            ? 'No other inside truck to move to'
                                            : undefined
                                        }
                                        onClick={() =>
                                          setMovingBill(
                                            isMoving
                                              ? null
                                              : {
                                                  vehicleEntryId: entry.vehicle_entry_id,
                                                  docEntry: bill.sap_doc_entry,
                                                },
                                          )
                                        }
                                      >
                                        <ArrowRightLeft className="mr-1 h-4 w-4" />
                                        Move
                                      </Button>
                                    )}
                                    {canRemove && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700"
                                        disabled={!bill.removable || removeBill.isPending}
                                        title={
                                          bill.removable
                                            ? undefined
                                            : bill.not_removable_reason ?? 'Cannot remove'
                                        }
                                        onClick={() =>
                                          setPendingConfirm({ kind: 'remove', entry, bill })
                                        }
                                      >
                                        <Trash2 className="mr-1 h-4 w-4" />
                                        Remove
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {isMoving && (
                                  <div className="max-w-md rounded-md border bg-muted/30 p-3">
                                    <SearchableSelect<MoveTarget>
                                      inputId={`move-${entry.vehicle_entry_id}-${bill.sap_doc_entry}`}
                                      label="Move to truck"
                                      value=""
                                      items={moveTargets}
                                      isLoading={false}
                                      isError={false}
                                      placeholder="Search a truck by number or arrival"
                                      getItemKey={(t) => t.vehicleId}
                                      getItemLabel={(t) => t.label}
                                      filterFn={(t, query) =>
                                        t.label.toLowerCase().includes(query.trim().toLowerCase())
                                      }
                                      loadingText=""
                                      emptyText="Search a destination truck"
                                      notFoundText="No matching inside truck"
                                      errorText=""
                                      onClear={() => undefined}
                                      onItemSelect={(t) =>
                                        setPendingConfirm({
                                          kind: 'move',
                                          entry,
                                          bill,
                                          targetVehicleId: t.vehicleId,
                                          targetLabel: t.label,
                                        })
                                      }
                                      renderItem={(t) => (
                                        <div className="min-w-0 flex-1 truncate text-sm">
                                          {t.label}
                                        </div>
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {addForVehicleEntryId === entry.vehicle_entry_id && (
                        <div className="rounded-md border bg-muted/30 p-3">
                          <SearchableSelect<DispatchBill>
                            inputId={`add-bill-${entry.vehicle_entry_id}`}
                            label="Add a bill"
                            value=""
                            items={vehicleAddableBills}
                            isLoading={
                              billsQuery.isLoading ||
                              billsQuery.isFetching ||
                              billLookupQuery.isFetching
                            }
                            isError={billsQuery.isError}
                            placeholder="Search a booked/pending bill by number or customer"
                            getItemKey={(bill) => bill.doc_entry}
                            getItemLabel={billLabel}
                            filterFn={(bill, query) =>
                              billLabel(bill).toLowerCase().includes(query.trim().toLowerCase())
                            }
                            onSearchChange={setAddSearch}
                            loadingText="Loading bills..."
                            emptyText="Search a bill to add"
                            notFoundText="No addable bills found"
                            errorText="Failed to load bills"
                            onClear={() => undefined}
                            onItemSelect={(bill) => handleAdd(entry, bill)}
                            renderItem={(bill) => (
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">
                                  {bill.doc_num} - {compact(bill.card_name)}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {formatNumber(bill.total_weight, 3)} kg ·{' '}
                                  {bill.plan.booking_status}
                                </div>
                              </div>
                            )}
                          />
                          <p className="mt-2 text-xs text-muted-foreground">
                            Only booked/pending, not-yet-linked bills for {entry.company_name} are
                            addable. The list shows recent bills; type a full bill number to find an
                            older one. Adding is blocked once the truck photo is taken at docking.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmCopy?.title}</DialogTitle>
            <DialogDescription>{confirmCopy?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingConfirm(null)}
              disabled={confirmLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmCopy?.destructive ? 'destructive' : 'default'}
              onClick={runPendingConfirm}
              disabled={confirmLoading}
            >
              {confirmCopy?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
