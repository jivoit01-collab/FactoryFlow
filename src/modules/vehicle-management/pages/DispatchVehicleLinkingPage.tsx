import { addDays, format, subDays } from 'date-fns';
import {
  AlertTriangle,
  ArrowRightLeft,
  Link2,
  LogOut,
  MoonStar,
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
import { type LateDispatchApproval, useLateDispatchApprovals } from '@/modules/admin/api';
import { useDispatchBills, useLookupDispatchBill } from '@/modules/dashboards/dispatch-plans/api';
import { StatusBadge } from '@/modules/dashboards/dispatch-plans/components';
import type { DispatchBill, DispatchPlanFilters } from '@/modules/dashboards/dispatch-plans/types';
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
import { EmptyPanel, FilterBar, FilterField, PageHeader } from '@/shared/components/page';
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

import {
  useLinkDispatchVehicle,
  useLookupDispatchBillAcrossCompanies,
  useUnlinkDispatchVehicle,
} from '../api';
import {
  DispatchLinkingSheet,
  LateDispatchApprovalDialog,
  type LateDispatchApprovalTarget,
  LinkVehicleBillsDialog,
  type LinkVehicleBillsSelection,
} from '../components';
import type { DispatchVehicleLinkPayload } from '../types';
import { invoiceFieldsFromBill } from '../utils/dispatchLinkPayload';

/** How far the one shared SAP bills read reaches by default. The operator can
 *  widen it on the page -- a bill invoiced months ago can still be the one
 *  going out today, and outside the window it is missing from its truck card. */
const BILL_LOOKBACK_DAYS = 60;
const BILL_LOOKAHEAD_DAYS = 30;

/** The date range the board reads SAP bills over, as `yyyy-MM-dd` strings. */
type BillWindow = { from: string; to: string };

function defaultBillWindow(): BillWindow {
  return {
    from: format(subDays(new Date(), BILL_LOOKBACK_DAYS), 'yyyy-MM-dd'),
    to: format(addDays(new Date(), BILL_LOOKAHEAD_DAYS), 'yyyy-MM-dd'),
  };
}

/** Both ends present, and in order. Plain string compare: ISO dates sort by date. */
function isUsableBillWindow(window: BillWindow) {
  return !!window.from && !!window.to && window.from <= window.to;
}

function compact(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

function formatNumber(value: number, fractionDigits = 2) {
  return value.toLocaleString('en-IN', { maximumFractionDigits: fractionDigits });
}

function billLabel(bill: DispatchBill) {
  return [bill.doc_num, bill.card_name].filter(Boolean).join(' - ');
}

/** A bill can be attached to a gate-in only if it isn't already, and is still open. */
function isBillAddable(bill: DispatchBill) {
  return (
    !bill.plan.linked_vehicle_entry_id &&
    (bill.plan.booking_status === 'PENDING' || bill.plan.booking_status === 'BOOKED')
  );
}

/** A bill can be linked to a truck only while no vehicle holds it and it isn't frozen. */
function isBillLinkable(bill: DispatchBill) {
  return (
    !bill.plan.vehicle_id &&
    !bill.plan.is_vehicle_link_locked &&
    (bill.plan.booking_status === 'PENDING' || bill.plan.booking_status === 'BOOKED')
  );
}

/** A bill counts as booked onto a truck once planning has linked a master vehicle. */
function isBillLinkedToVehicle(bill: DispatchBill) {
  return (
    bill.plan.vehicle_id !== null &&
    bill.plan.booking_status !== 'CANCELLED' &&
    bill.plan.booking_status !== 'DISPATCHED'
  );
}

/**
 * How a late gate-in request reads on the truck card.
 *
 * An APPROVED row that has been spent is deliberately not "Approved": the
 * clearance is gone, used by the entry it let through, and showing it as live
 * would have dispatch believe the truck can still get in on it.
 */
function lateApprovalBadgeLabel(approval: LateDispatchApproval) {
  if (approval.status === 'PENDING') return 'Late entry: awaiting approval';
  if (approval.status === 'REJECTED') return 'Late entry: refused';
  return approval.consumed_at ? 'Late entry: approval used' : 'Late entry: approved';
}

function lateApprovalBadgeClass(status: LateDispatchApproval['status']) {
  if (status === 'PENDING') {
    return 'border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400';
  }
  if (status === 'REJECTED') {
    return 'border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400';
  }
  return 'border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400';
}

function formatEntryDateTime(date: string | null, time: string | null) {
  if (!date) return '-';
  return [date, time ? time.slice(0, 5) : ''].filter(Boolean).join(' ');
}

/**
 * One physical truck, at whatever stage it has reached.
 *
 * `entries` are its gate-ins (one per company) once it is inside — the truck is
 * folded across companies, so a truck inside under several companies is ONE card
 * carrying every company's bills (matching the docking board). `bookedBills` are
 * bills linked to the vehicle that no gate-in on this truck carries yet: the whole
 * load while the truck is still expected, and the not-yet-attached remainder once
 * it is inside.
 */
interface TruckCard {
  vehicleId: number;
  vehicleNumber: string;
  arrivalNo: string | null;
  gateInDate: string | null;
  inTime: string | null;
  driverName: string;
  driverMobile: string;
  companies: string[];
  entries: InsideDispatchVehicle[];
  bookedBills: DispatchBill[];
  attachedBillCount: number;
  isInside: boolean;
  /** Any booked bill is frozen by a completed empty-vehicle gate-in. */
  isLinkLocked: boolean;
}

/**
 * Fold the inside feed and the linked-bills feed into one card per truck.
 *
 * Inside gate-ins fold on the physical vehicle (a truck can only be inside once,
 * so this matches the arrival fold and lets the booked half merge onto the same
 * card). Vehicle Master is global — one row per registration number, no company
 * column — so `vehicle_id` is a safe cross-company key.
 */
function buildTruckCards(
  vehicles: InsideDispatchVehicle[],
  linkedBills: DispatchBill[],
  companyNameByCode: Map<string, string>,
) {
  const cards = new Map<number, TruckCard>();
  const order: number[] = [];

  for (const vehicle of vehicles) {
    let card = cards.get(vehicle.vehicle_id);
    if (!card) {
      card = {
        vehicleId: vehicle.vehicle_id,
        vehicleNumber: vehicle.vehicle_number,
        arrivalNo: vehicle.arrival_no,
        gateInDate: vehicle.gate_in_date,
        inTime: vehicle.in_time,
        driverName: vehicle.driver_name,
        driverMobile: vehicle.driver_mobile,
        companies: [],
        entries: [],
        bookedBills: [],
        attachedBillCount: 0,
        isInside: true,
        isLinkLocked: false,
      };
      cards.set(vehicle.vehicle_id, card);
      order.push(vehicle.vehicle_id);
    }
    card.entries.push(vehicle);
    card.attachedBillCount += vehicle.bills.length;
    if (vehicle.company_name && !card.companies.includes(vehicle.company_name)) {
      card.companies.push(vehicle.company_name);
    }
  }

  for (const bill of linkedBills) {
    const vehicleId = bill.plan.vehicle_id as number;
    let card = cards.get(vehicleId);
    if (!card) {
      card = {
        vehicleId,
        vehicleNumber: bill.plan.vehicle_no || bill.sap_vehicle_no || '',
        arrivalNo: null,
        gateInDate: null,
        inTime: null,
        driverName: bill.plan.driver_name || '',
        driverMobile: bill.plan.driver_mobile_no || '',
        companies: [],
        entries: [],
        bookedBills: [],
        attachedBillCount: 0,
        isInside: false,
        isLinkLocked: false,
      };
      cards.set(vehicleId, card);
      order.push(vehicleId);
    }
    // Already on one of this truck's gate-ins? Then the gate-in panel owns it.
    const isAttached = card.entries.some((entry) =>
      entry.bills.some((entryBill) => entryBill.sap_doc_entry === bill.doc_entry),
    );
    if (isAttached) continue;

    card.bookedBills.push(bill);
    if (bill.plan.is_vehicle_link_locked) card.isLinkLocked = true;
    if (!card.vehicleNumber) card.vehicleNumber = bill.plan.vehicle_no || '';
    if (!card.driverName) card.driverName = bill.plan.driver_name || '';
    // Name, not code, so a booked card badges its company the way an inside one does.
    const companyName = bill.company_code
      ? (companyNameByCode.get(bill.company_code) ?? bill.company_code)
      : '';
    if (companyName && !card.companies.includes(companyName)) {
      card.companies.push(companyName);
    }
  }

  // Trucks at the gate first — they are the ones a user is standing next to.
  return order
    .map((vehicleId) => cards.get(vehicleId)!)
    .sort((a, b) => Number(b.isInside) - Number(a.isInside));
}

function matchesSearch(card: TruckCard, query: string) {
  if (!query) return true;
  return [
    card.vehicleNumber,
    card.arrivalNo,
    card.driverName,
    card.driverMobile,
    ...card.companies,
    ...card.entries.flatMap((entry) => [
      entry.entry_no,
      entry.company_name,
      ...entry.bills.map((bill) => bill.sap_doc_num),
    ]),
    ...card.bookedBills.flatMap((bill) => [bill.doc_num, bill.card_name, bill.company_code]),
  ].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(query),
  );
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
    }
  | { kind: 'unlinkBooked'; card: TruckCard; bill: DispatchBill }
  | { kind: 'unlinkBookedAll'; card: TruckCard };

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
  if (pending.kind === 'unlinkBooked') {
    return {
      title: 'Take this bill off the vehicle?',
      description: `${pending.bill.doc_num} goes back to Pending and can be linked to another vehicle.`,
      confirmLabel: 'Unlink bill',
      destructive: true,
    };
  }
  if (pending.kind === 'unlinkBookedAll') {
    return {
      title: 'Unlink every booked bill on this vehicle?',
      description: `All ${pending.card.bookedBills.length} bill(s) booked onto ${compact(
        pending.card.vehicleNumber,
      )} go back to Pending. Bills frozen by a completed gate-in are skipped.`,
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
 * Vehicle Linking — the truck-shaped view of dispatch, from booking to the gate.
 *
 * One card per physical truck: the bills booked onto it, the bills its gate-ins
 * actually carry once it is inside, and every correction in place — link a new
 * truck, add bills, attach a booked bill to a gate-in, move a bill to another
 * truck, unlink, or send the truck to the empty-out flow. Merges what used to be
 * two pages (Vehicle Linking + Inside Vehicle Manager), because they were the same
 * board at two stages. Cross-company throughout: the bills feed spans every
 * company the user belongs to and each write is addressed to the owning company.
 * Bill-by-bill linking still lives on the Bills Linking page.
 */
export default function DispatchVehicleLinkingPage() {
  const navigate = useNavigate();
  const { companies } = useAuth();
  const { hasPermission } = usePermission();
  // One permission per action — each button is gated independently, as on the
  // Inside Vehicle Manager. The booked (pre-gate-in) half writes dispatch plans
  // instead of gate records, so it answers to the linking permission.
  //
  // The route opens on LINK_VEHICLE *or* INSIDE_VEHICLE_VIEW, so a linking-only
  // user gets here without the second one. The inside-the-gate feed is gated on
  // it too — asking for it regardless is a guaranteed 403 (twice, with the
  // client's one retry) and an empty board with no explanation.
  const canViewInside = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_VIEW);
  const canAdd = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_ADD_BILL);
  const canRemove = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_REMOVE_BILL);
  const canMove = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_MOVE_BILL);
  const canUnlink = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_UNLINK_ALL);
  const canMarkOut = hasPermission(DISPATCH_PERMISSIONS.INSIDE_VEHICLE_MARK_OUT);
  const canLink = hasPermission(DISPATCH_PERMISSIONS.LINK_VEHICLE);

  const [search, setSearch] = useState('');
  const [addForVehicleEntryId, setAddForVehicleEntryId] = useState<number | null>(null);
  // The debounced search term of the open "Add a bill" picker, used to look a
  // bill up by number on the server when it falls outside the feed.
  const [addSearch, setAddSearch] = useState('');
  // Truck-level "add a bill of another company" form: which truck is open, the
  // chosen company, and its own picker search term.
  const [addTruckId, setAddTruckId] = useState<number | null>(null);
  const [addTruckCompany, setAddTruckCompany] = useState<string | null>(null);
  const [addTruckSearch, setAddTruckSearch] = useState('');
  const [movingBill, setMovingBill] = useState<{ vehicleEntryId: number; docEntry: number } | null>(
    null,
  );
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  // Linking flow: the bill/vehicle picker, then the transport sheet.
  const [pickerFor, setPickerFor] = useState<
    { mode: 'new' } | { mode: 'add'; card: TruckCard } | null
  >(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [sheetBills, setSheetBills] = useState<DispatchBill[] | null>(null);
  const [sheetVehicle, setSheetVehicle] = useState<{ id: number; number: string } | null>(null);
  // The truck whose late gate-in approval is open in the dialog.
  const [approvalTarget, setApprovalTarget] = useState<LateDispatchApprovalTarget | null>(null);

  const vehiclesQuery = useInsideDispatchVehicles({ enabled: canViewInside });

  // The window the bills feed covers. `windowDraft` is what the two date boxes
  // hold; `billWindow` is the last pair worth reading SAP over, so a half-typed
  // date never empties the board or fires a doomed request.
  const [startingWindow] = useState(defaultBillWindow);
  const [windowDraft, setWindowDraft] = useState<BillWindow>(startingWindow);
  const [billWindow, setBillWindow] = useState<BillWindow>(startingWindow);
  const changeWindow = (patch: Partial<BillWindow>) => {
    const next = { ...windowDraft, ...patch };
    setWindowDraft(next);
    if (isUsableBillWindow(next)) setBillWindow(next);
  };
  const isWindowDefault =
    windowDraft.from === startingWindow.from && windowDraft.to === startingWindow.to;

  // One cross-company SAP read serves every list on the page: the booked trucks,
  // the gate-in pickers, and the linking picker.
  //
  // Only live bills are asked for. Every list here drops the dispatched and
  // cancelled ones anyway -- a truck card shows PENDING and BOOKED bills, and
  // both pickers offer nothing else -- but over a two-month window those are
  // the bulk of the feed, and fetching them made this one call a multi-megabyte
  // response the browser spent longer parsing than the server spent building.
  // Narrowing it here is not a display filter; it is the difference between a
  // feed that arrives and one that times out.
  const billFilters = useMemo<DispatchPlanFilters>(
    () => ({
      date_from: billWindow.from,
      date_to: billWindow.to,
      booking_statuses: ['PENDING', 'BOOKED'],
      limit: 2000,
      all_companies: true,
    }),
    [billWindow],
  );
  // Widening the window is the operator's move, so hold the bills already on
  // screen while the wider read runs rather than blanking the board.
  const billsQuery = useDispatchBills(billFilters, { keepPrevious: true });

  // Every late gate-in request raised for today, in one call rather than one per
  // expected truck. Cross-company for the same reason the bills feed is: a truck's
  // request is filed under whichever company's bills it carries, which need not be
  // the header this page is being read under. Only fetched for users who can raise
  // one -- for anyone else it is a guaranteed 403 and a badge they cannot act on.
  const today = format(new Date(), 'yyyy-MM-dd');
  const approvalsQuery = useLateDispatchApprovals(
    { gate_in_date: today, all_companies: true },
    { enabled: canLink },
  );
  // Latest request per vehicle; the feed is newest-first, so the first wins.
  const approvalByVehicle = useMemo(() => {
    const map = new Map<number, LateDispatchApproval>();
    for (const approval of approvalsQuery.data ?? []) {
      if (!map.has(approval.vehicle)) map.set(approval.vehicle, approval);
    }
    return map;
  }, [approvalsQuery.data]);

  const addBill = useAddBillToInsideVehicle();
  const addBillToTruck = useAddBillToTruck();
  const removeBill = useRemoveBillFromInsideVehicle();
  const moveBill = useMoveBillBetweenVehicles();
  const unlinkAll = useUnlinkAllBills();
  const linkMutation = useLinkDispatchVehicle();
  const unlinkPlan = useUnlinkDispatchVehicle();

  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const feedBills = useMemo(() => billsQuery.data?.data ?? [], [billsQuery.data]);
  const linkedBills = useMemo(() => feedBills.filter(isBillLinkedToVehicle), [feedBills]);
  const addableBills = useMemo(() => feedBills.filter(isBillAddable), [feedBills]);
  const linkableBills = useMemo(() => feedBills.filter(isBillLinkable), [feedBills]);

  const companyNameByCode = useMemo(
    () => new Map(companies.map((c) => [c.company_code, c.company_name])),
    [companies],
  );
  const cards = useMemo(
    () => buildTruckCards(vehicles, linkedBills, companyNameByCode),
    [companyNameByCode, linkedBills, vehicles],
  );
  const query = search.trim().toLowerCase();
  const visibleCards = useMemo(
    () => cards.filter((card) => matchesSearch(card, query)),
    [cards, query],
  );
  const insideCount = cards.filter((card) => card.isInside).length;

  // Distinct physical trucks currently inside — a bill can be moved to any of
  // them (trucks are not company-scoped; the bill's company chain is created on
  // the destination truck's trip if needed).
  const insideTrucks = useMemo(() => {
    const seen = new Map<number, MoveTarget>();
    for (const vehicle of vehicles) {
      if (!seen.has(vehicle.vehicle_id)) {
        seen.set(vehicle.vehicle_id, {
          vehicleId: vehicle.vehicle_id,
          label: vehicle.arrival_no
            ? `${vehicle.vehicle_number} — ${vehicle.arrival_no}`
            : vehicle.vehicle_number,
        });
      }
    }
    return Array.from(seen.values());
  }, [vehicles]);

  // The panel whose "Add a bill" picker is open. Its company scopes the by-number
  // lookup below, so a bill older than the feed window is still findable by
  // typing its full number.
  const openEntry = useMemo(
    () => vehicles.find((v) => v.vehicle_entry_id === addForVehicleEntryId) ?? null,
    [vehicles, addForVehicleEntryId],
  );
  const billLookupQuery = useLookupDispatchBill(addSearch, openEntry?.company_code ?? undefined);
  const lookedUpBill =
    billLookupQuery.data && isBillAddable(billLookupQuery.data) ? billLookupQuery.data : null;

  // Same by-number lookup, scoped to the company chosen in the truck-level
  // "add another company's bill" form.
  const truckBillLookupQuery = useLookupDispatchBill(addTruckSearch, addTruckCompany ?? undefined);
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

  // The linking picker does not know which company a typed bill number belongs
  // to, so it asks every company the user belongs to.
  const companyCodes = useMemo(() => companies.map((c) => c.company_code), [companies]);
  const linkLookup = useLookupDispatchBillAcrossCompanies(pickerSearch, companyCodes);
  const pickerBills = useMemo(() => {
    const extra = linkLookup.bills.filter(
      (looked) =>
        isBillLinkable(looked) && !linkableBills.some((b) => b.doc_entry === looked.doc_entry),
    );
    return extra.length > 0 ? [...extra, ...linkableBills] : linkableBills;
  }, [linkableBills, linkLookup.bills]);

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

  const handleAddToTruck = async (vehicleId: number, companyCode: string, bill: DispatchBill) => {
    try {
      const res = await addBillToTruck.mutateAsync({
        vehicle_id: vehicleId,
        company_code: companyCode,
        sap_doc_entry: bill.doc_entry,
      });
      toast.success(res.detail || 'Bill added');
      setAddTruckId(null);
      setAddTruckCompany(null);
      setAddTruckSearch('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add the bill'));
    }
  };

  /**
   * Put a bill that is already booked onto this truck on one of its gate-ins —
   * the late-booked-bill case. Goes to that company's gate-in when the truck has
   * one, otherwise creates the company's chain on the truck.
   */
  const handleAttachBooked = async (card: TruckCard, bill: DispatchBill) => {
    const entry = card.entries.find((item) => item.company_code === bill.company_code);
    try {
      if (entry) {
        const res = await addBill.mutateAsync({
          vehicle_entry_id: entry.vehicle_entry_id,
          sap_doc_entry: bill.doc_entry,
        });
        toast.success(res.detail || 'Bill attached to the gate-in');
        return;
      }
      if (!bill.company_code) {
        toast.error('This bill has no company tag — reload the page and try again.');
        return;
      }
      const res = await addBillToTruck.mutateAsync({
        vehicle_id: card.vehicleId,
        company_code: bill.company_code,
        sap_doc_entry: bill.doc_entry,
      });
      toast.success(res.detail || 'Bill attached to the truck');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to attach the bill'));
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

  const handleMove = async (fromVehicleEntryId: number, toVehicleId: number, docEntry: number) => {
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

  const handleUnlinkBooked = async (bill: DispatchBill) => {
    try {
      await unlinkPlan.mutateAsync({
        docEntry: bill.doc_entry,
        companyCode: bill.company_code ?? undefined,
      });
      toast.success('Bill taken off the vehicle. The booking is back to Pending.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to unlink the bill'));
    }
  };

  const handleUnlinkBookedAll = async (card: TruckCard) => {
    // Sequential, not parallel: each plan write re-reads SAP, and a partial
    // failure should be reported rather than hidden behind the last one.
    const removable = card.bookedBills.filter((bill) => !bill.plan.is_vehicle_link_locked);
    let done = 0;
    const failures: string[] = [];
    for (const bill of removable) {
      try {
        await unlinkPlan.mutateAsync({
          docEntry: bill.doc_entry,
          companyCode: bill.company_code ?? undefined,
        });
        done += 1;
      } catch (error) {
        failures.push(`${bill.doc_num}: ${getErrorMessage(error, 'unlink failed')}`);
      }
    }
    if (failures.length === 0) {
      toast.success(`${done} bill(s) taken off ${compact(card.vehicleNumber)}`);
    } else {
      toast.error(`Unlinked ${done} of ${removable.length}. Failed — ${failures.join('; ')}`);
    }
  };

  const handlePickerConfirm = (selection: LinkVehicleBillsSelection) => {
    setSheetVehicle({ id: selection.vehicleId, number: selection.vehicleNumber });
    setSheetBills(selection.bills);
    setPickerFor(null);
    setPickerSearch('');
  };

  /**
   * Save the linking sheet. One PATCH per company on the truck: a plan write
   * resolves its company from the request, and the batch endpoint re-derives
   * invoice fields per bill only when that company's batch holds more than one —
   * so every call re-seeds them from its own primary bill.
   */
  const handleLinkSave = async (docEntry: number, payload: DispatchVehicleLinkPayload) => {
    const targetBills = sheetBills ?? [];
    if (targetBills.length === 0) return;

    const perCompany = new Map<string, DispatchBill[]>();
    for (const bill of targetBills) {
      const code = bill.company_code ?? '';
      const existing = perCompany.get(code);
      if (existing) existing.push(bill);
      else perCompany.set(code, [bill]);
    }

    const linked: string[] = [];
    const failures: string[] = [];
    for (const [companyCode, companyBills] of perCompany) {
      const primary = companyBills[0];
      try {
        await linkMutation.mutateAsync({
          docEntry: primary.doc_entry,
          companyCode: companyCode || undefined,
          payload: {
            ...payload,
            // The sheet's payload describes its own primary bill; another
            // company's call must describe its own.
            ...(primary.doc_entry === docEntry ? {} : invoiceFieldsFromBill(primary)),
            linked_invoice_doc_entries: companyBills.map((bill) => bill.doc_entry),
          },
        });
        linked.push(`${companyBills.length} in ${companyCode || 'the selected company'}`);
      } catch (error) {
        failures.push(
          `${companyCode || 'selected company'}: ${getErrorMessage(error, 'link failed')}`,
        );
      }
    }

    if (failures.length === 0) {
      toast.success(`Linked ${linked.join(', ')} to ${payload.vehicle_no || 'the vehicle'}`);
      setSheetBills(null);
      setSheetVehicle(null);
      return;
    }
    // Partial success is real here — say what landed and what did not.
    toast.error(
      [linked.length > 0 ? `Linked ${linked.join(', ')}.` : '', `Failed — ${failures.join('; ')}`]
        .filter(Boolean)
        .join(' '),
    );
  };

  const handleUnlinkFromSheet = async (docEntry: number) => {
    const bill = sheetBills?.find((item) => item.doc_entry === docEntry);
    if (!bill) return;
    await handleUnlinkBooked(bill);
    setSheetBills(null);
    setSheetVehicle(null);
  };

  const confirmLoading =
    removeBill.isPending || moveBill.isPending || unlinkAll.isPending || unlinkPlan.isPending;
  const runPendingConfirm = async () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === 'remove') {
      await handleRemove(pendingConfirm.entry, pendingConfirm.bill);
    } else if (pendingConfirm.kind === 'unlinkAll') {
      await handleUnlinkAll(pendingConfirm.entry);
    } else if (pendingConfirm.kind === 'unlinkBooked') {
      await handleUnlinkBooked(pendingConfirm.bill);
    } else if (pendingConfirm.kind === 'unlinkBookedAll') {
      await handleUnlinkBookedAll(pendingConfirm.card);
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

  // The board renders as soon as the trucks land. The bills feed is a
  // cross-company SAP read and an order of magnitude slower, and waiting on it
  // too left "Loading trucks..." on screen for half a minute -- then a client
  // timeout -- over trucks that had arrived in milliseconds. Wait only when
  // there is nothing at all to show yet: without the inside view, the feed is
  // the only source of trucks there is.
  const isLoading = canViewInside ? vehiclesQuery.isLoading : billsQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        accent="violet"
        title="Dispatch Vehicle Linking"
        description="One card per truck, from booking to the gate — link a vehicle, add or move bills, unlink, or mark a truck out (no database edits)"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate('/dispatch/vehicle-linking/previously-registered')}
        >
          <Truck className="mr-2 h-4 w-4" />
          Previously Registered Vehicle
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void vehiclesQuery.refetch();
            void billsQuery.refetch();
          }}
          disabled={vehiclesQuery.isFetching || billsQuery.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        {canLink && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setPickerSearch('');
              setPickerFor({ mode: 'new' });
            }}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Link New Vehicle
          </Button>
        )}
      </PageHeader>

      <FilterBar
        label="Search"
        isFetching={isLoading}
        onReset={search ? () => setSearch('') : undefined}
        actions={
          <span className="text-sm text-muted-foreground">
            {cards.length} truck(s)
            {canViewInside ? ` · ${insideCount} at the gate` : ''}
            {query ? ` · ${visibleCards.length} matching` : ''}
          </span>
        }
      >
        <FilterField
          label="Find a truck"
          htmlFor="vehicle-linking-search"
          className="sm:min-w-[320px] sm:flex-1"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="vehicle-linking-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vehicle, entry, arrival, company, driver, bill"
              className="pl-9"
            />
          </div>
        </FilterField>
      </FilterBar>

      <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="bill-window-from" className="text-xs text-muted-foreground">
            Bills from
          </Label>
          <Input
            id="bill-window-from"
            type="date"
            value={windowDraft.from}
            onChange={(event) => changeWindow({ from: event.target.value })}
            className="w-full sm:w-44"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bill-window-to" className="text-xs text-muted-foreground">
            Bills to
          </Label>
          <Input
            id="bill-window-to"
            type="date"
            value={windowDraft.to}
            onChange={(event) => changeWindow({ to: event.target.value })}
            className="w-full sm:w-44"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setWindowDraft(startingWindow);
            setBillWindow(startingWindow);
          }}
          disabled={isWindowDefault}
        >
          Reset
        </Button>
        <p className="text-xs text-muted-foreground sm:min-w-[16rem] sm:flex-1">
          Invoice dates this board reads from SAP — the bills booked onto the trucks below and both
          bill pickers come from it. For an old bill going out today, move the window to around its
          invoice date: a read returns a bounded number of bills, newest first, so simply reaching
          further back drops the oldest end (you will be told when that happens). Booked and pending
          bills only, whatever the window.
        </p>
      </div>

      {billsQuery.data?.meta?.window_truncated ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          This window holds more bills than one read returns, and SAP is read newest-first — so the{' '}
          <strong>oldest</strong> bills in it are missing. To reach an old bill, move both dates to
          around its own invoice date rather than reaching further back from today.
        </div>
      ) : null}

      {!isUsableBillWindow(windowDraft) ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          Enter both dates, with “from” on or before “to”. Still showing {billWindow.from} to{' '}
          {billWindow.to}.
        </div>
      ) : null}

      {!canViewInside ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
          Showing booked trucks only — you do not have the Inside Vehicle Manager view permission,
          so trucks already inside the gate and the bills on their gate-ins are hidden. A truck that
          is at the gate still shows here as “Booked”. Ask an administrator for
          &ldquo;can_view_inside_vehicle_manager&rdquo; to see the full board.
        </div>
      ) : null}

      {canViewInside && vehiclesQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load the trucks inside the gate. Booked trucks below are still accurate.
        </div>
      ) : null}

      {billsQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load dispatch bills. Booked trucks and the bill pickers are unavailable.
        </div>
      ) : null}

      {!isLoading && billsQuery.isLoading ? (
        <div className="rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground">
          Still loading dispatch bills — trucks that are only booked, the bills booked onto the
          trucks below, and the bill pickers will fill in a moment.
        </div>
      ) : billsQuery.isPlaceholderData && billsQuery.isFetching ? (
        <div className="rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground">
          Reading {billWindow.from} to {billWindow.to} from SAP — the bills below are the previous
          window until it lands.
        </div>
      ) : null}

      {isLoading ? (
        <EmptyState text="Loading trucks..." />
      ) : cards.length === 0 ? (
        <EmptyState text="No truck is booked or inside. Use Link New Vehicle to start one." />
      ) : visibleCards.length === 0 ? (
        <EmptyState text="No truck matches this search." />
      ) : (
        <div className="space-y-3">
          {visibleCards.map((card) => {
            const onTruckCompanyCodes = new Set(card.entries.map((e) => e.company_code));
            const candidateCompanies = companies.filter(
              (c) => !onTruckCompanyCodes.has(c.company_code),
            );
            const isTruckAddOpen = addTruckId === card.vehicleId;
            const totalBills = card.attachedBillCount + card.bookedBills.length;
            const lateApproval = approvalByVehicle.get(card.vehicleId) ?? null;

            return (
              <Card key={card.vehicleId}>
                <CardContent className="space-y-4 p-4">
                  {/* Physical-truck header + vehicle-level actions */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">{compact(card.vehicleNumber)}</span>
                        <Badge
                          variant="outline"
                          className={
                            card.isInside
                              ? 'border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                              : 'border-slate-300 dark:border-border text-slate-600 dark:text-muted-foreground'
                          }
                        >
                          {card.isInside ? 'At the gate' : 'Booked'}
                        </Badge>
                        {card.arrivalNo ? (
                          <Badge
                            variant="outline"
                            className="border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
                          >
                            {card.arrivalNo}
                          </Badge>
                        ) : null}
                        {card.companies.map((company) => (
                          <Badge key={company} variant="outline">
                            {company}
                          </Badge>
                        ))}
                        {lateApproval ? (
                          <Badge
                            variant="outline"
                            className={lateApprovalBadgeClass(lateApproval.status)}
                          >
                            {lateApprovalBadgeLabel(lateApproval)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {card.isInside
                          ? `In ${formatEntryDateTime(card.gateInDate, card.inTime)} · `
                          : ''}
                        Driver {compact(card.driverName)} · {compact(card.driverMobile)} ·{' '}
                        {totalBills} bill(s)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {card.isInside && canAdd && candidateCompanies.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddTruckCompany(null);
                            setAddTruckSearch('');
                            setAddTruckId(isTruckAddOpen ? null : card.vehicleId);
                          }}
                        >
                          <PackagePlus className="mr-2 h-4 w-4" />
                          Add other bill
                        </Button>
                      )}
                      {!card.isInside && canLink && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={card.isLinkLocked}
                          title={
                            card.isLinkLocked
                              ? 'Empty vehicle gate-in is complete. To re-plan, complete an empty-vehicle-out for this vehicle first.'
                              : undefined
                          }
                          onClick={() => {
                            setPickerSearch('');
                            setPickerFor({ mode: 'add', card });
                          }}
                        >
                          <PackagePlus className="mr-2 h-4 w-4" />
                          Add Bills
                        </Button>
                      )}
                      {!card.isInside && canLink && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setApprovalTarget({
                              vehicleId: card.vehicleId,
                              vehicleNumber: compact(card.vehicleNumber),
                              billDocNums: card.bookedBills.map((bill) => bill.doc_num),
                              customers: Array.from(
                                new Set(
                                  card.bookedBills
                                    .map((bill) => bill.card_name)
                                    .filter((name): name is string => Boolean(name)),
                                ),
                              ),
                            })
                          }
                        >
                          <MoonStar className="mr-2 h-4 w-4" />
                          {lateApproval ? 'Late Gate-In' : 'Late Gate-In Approval'}
                        </Button>
                      )}
                      {!card.isInside && canUnlink && card.bookedBills.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={card.isLinkLocked || unlinkPlan.isPending}
                          onClick={() => setPendingConfirm({ kind: 'unlinkBookedAll', card })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Unlink All
                        </Button>
                      )}
                      {card.isInside && canMarkOut && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(
                              `/gate/empty-vehicle-out/new?entry=${card.entries[0].vehicle_entry_id}`,
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
                        <Label htmlFor={`add-truck-company-${card.vehicleId}`} className="text-xs">
                          Company
                        </Label>
                        <Select
                          id={`add-truck-company-${card.vehicleId}`}
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
                            inputId={`add-truck-bill-${card.vehicleId}`}
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
                            filterFn={(bill, term) =>
                              billLabel(bill).toLowerCase().includes(term.trim().toLowerCase())
                            }
                            onSearchChange={setAddTruckSearch}
                            loadingText="Loading bills..."
                            emptyText="Search a bill to add"
                            notFoundText="No addable bills found"
                            errorText="Failed to load bills"
                            onClear={() => undefined}
                            onItemSelect={(bill) =>
                              void handleAddToTruck(card.vehicleId, addTruckCompany, bill)
                            }
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
                            Adds the bill to this truck under a new gate-in for the selected
                            company. Type a full bill number to find one outside the recent list.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* One panel per company gate-in on this truck */}
                  {card.entries.map((entry) => {
                    const isAddOpen = addForVehicleEntryId === entry.vehicle_entry_id;
                    const feedAddableBills = addableBills.filter(
                      (b) => b.company_code === entry.company_code,
                    );
                    // When this panel's picker is open, fold in the server-looked-up
                    // bill (scoped to this company) if it isn't already in the feed —
                    // this is what lets a bill outside the window be added.
                    const vehicleAddableBills =
                      isAddOpen &&
                      lookedUpBill &&
                      !feedAddableBills.some((b) => b.doc_entry === lookedUpBill.doc_entry)
                        ? [
                            { ...lookedUpBill, company_code: entry.company_code },
                            ...feedAddableBills,
                          ]
                        : feedAddableBills;
                    const moveTargets = insideTrucks.filter(
                      (t) => t.vehicleId !== entry.vehicle_id,
                    );

                    return (
                      <div key={entry.vehicle_entry_id} className="space-y-3 rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{entry.company_name}</Badge>
                          <span className="text-xs text-muted-foreground">{entry.entry_no}</span>
                          <span className="text-xs text-muted-foreground">
                            {entry.bills.length} bill(s)
                          </span>
                          <div className="ml-auto flex flex-wrap gap-2">
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
                                        className="border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400"
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

                                    <div className="ml-auto flex flex-wrap gap-2">
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
                                          className="text-red-600 hover:text-red-700 dark:hover:text-red-400"
                                          disabled={!bill.removable || removeBill.isPending}
                                          title={
                                            bill.removable
                                              ? undefined
                                              : (bill.not_removable_reason ?? 'Cannot remove')
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
                                        filterFn={(t, term) =>
                                          t.label.toLowerCase().includes(term.trim().toLowerCase())
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

                        {isAddOpen && (
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
                              filterFn={(bill, term) =>
                                billLabel(bill).toLowerCase().includes(term.trim().toLowerCase())
                              }
                              onSearchChange={setAddSearch}
                              loadingText="Loading bills..."
                              emptyText="Search a bill to add"
                              notFoundText="No addable bills found"
                              errorText="Failed to load bills"
                              onClear={() => undefined}
                              onItemSelect={(bill) => void handleAdd(entry, bill)}
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
                              Only booked/pending, not-yet-attached bills for {entry.company_name}{' '}
                              are addable. The list shows recent bills; type a full bill number to
                              find an older one. Adding is blocked once the truck photo is taken at
                              docking.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Bills booked onto the truck that no gate-in carries yet */}
                  {card.bookedBills.length > 0 && (
                    <div className="space-y-3 rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {card.isInside ? 'Booked, not on a gate-in yet' : 'Booked bills'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {card.bookedBills.length} bill(s)
                        </span>
                      </div>

                      <div className="divide-y rounded-md border">
                        {card.bookedBills.map((bill) => (
                          <div
                            key={`${bill.company_code ?? ''}-${bill.doc_entry}`}
                            className="flex flex-wrap items-center gap-2 p-3 text-sm"
                          >
                            <span className="font-mono font-medium">{bill.doc_num}</span>
                            {bill.company_code ? (
                              <Badge variant="secondary">{bill.company_code}</Badge>
                            ) : null}
                            <span className="max-w-[220px] truncate" title={bill.card_name}>
                              {compact(bill.card_name)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {compact(bill.city)} {compact(bill.state)}
                            </span>
                            <StatusBadge status={bill.plan.booking_status} />
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {formatNumber(bill.total_litres, 2)} L ·{' '}
                              {formatNumber(bill.total_weight, 3)} kg
                            </span>
                            {bill.plan.is_vehicle_link_locked ? (
                              <span className="text-xs text-muted-foreground">
                                Locked — gate-in complete
                              </span>
                            ) : null}

                            <div className="ml-auto flex flex-wrap gap-2">
                              {card.isInside && canAdd && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={addBill.isPending || addBillToTruck.isPending}
                                  title="Put this bill on the truck's gate-in"
                                  onClick={() => void handleAttachBooked(card, bill)}
                                >
                                  <PackagePlus className="mr-1 h-4 w-4" />
                                  Attach
                                </Button>
                              )}
                              {canRemove && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 dark:hover:text-red-400"
                                  disabled={
                                    bill.plan.is_vehicle_link_locked || unlinkPlan.isPending
                                  }
                                  title={
                                    bill.plan.is_vehicle_link_locked
                                      ? 'Empty vehicle gate-in is complete — unlink is blocked.'
                                      : undefined
                                  }
                                  onClick={() =>
                                    setPendingConfirm({ kind: 'unlinkBooked', card, bill })
                                  }
                                >
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Unlink
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {card.isInside && (
                        <p className="text-xs text-muted-foreground">
                          These bills name this truck but are not on any of its gate-ins. Attach
                          puts one on its company&apos;s gate-in (creating that company&apos;s chain
                          if the truck has none).
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LateDispatchApprovalDialog
        // Keyed on the truck so each truck opens with a fresh, empty form.
        key={approvalTarget?.vehicleId ?? 'none'}
        target={approvalTarget}
        existing={approvalTarget ? (approvalByVehicle.get(approvalTarget.vehicleId) ?? null) : null}
        today={today}
        onClose={() => setApprovalTarget(null)}
      />

      <LinkVehicleBillsDialog
        open={pickerFor !== null}
        mode={pickerFor?.mode === 'add' ? 'add' : 'new'}
        vehicle={
          pickerFor?.mode === 'add'
            ? { id: pickerFor.card.vehicleId, number: pickerFor.card.vehicleNumber }
            : null
        }
        bills={pickerBills}
        isLoading={billsQuery.isLoading || linkLookup.isFetching}
        isError={billsQuery.isError}
        onSearchChange={setPickerSearch}
        onOpenChange={(open) => {
          if (!open) {
            setPickerFor(null);
            setPickerSearch('');
          }
        }}
        onConfirm={handlePickerConfirm}
      />

      <DispatchLinkingSheet
        key={sheetBills?.map((bill) => bill.doc_entry).join('-') ?? 'empty'}
        bill={sheetBills?.[0] ?? null}
        selectedBills={sheetBills ?? []}
        vehicleSeed={
          sheetVehicle
            ? {
                vehicle_id: sheetVehicle.id,
                vehicle_no: sheetVehicle.number,
                // Transporter fills itself in from Vehicle Master once the sheet
                // resolves the vehicle id.
                transporter_id: null,
                transporter_name: '',
                transporter_gstin: '',
                contact_person: '',
                mobile_no: '',
              }
            : null
        }
        open={sheetBills !== null}
        isSaving={linkMutation.isPending}
        isUnlinking={unlinkPlan.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSheetBills(null);
            setSheetVehicle(null);
          }
        }}
        onSave={handleLinkSave}
        onUnlink={handleUnlinkFromSheet}
      />

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

/** Thin wrapper so the page's many call sites keep reading `<EmptyState text=… />`. */
function EmptyState({ text }: { text: string }) {
  return <EmptyPanel message={text} loading={/loading/i.test(text)} />;
}
