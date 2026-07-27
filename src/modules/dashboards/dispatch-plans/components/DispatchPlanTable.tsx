import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  SquarePen,
} from 'lucide-react';
import { type KeyboardEvent, useMemo, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  Checkbox,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 50;

import type { DispatchBill } from '../types';
import { StatusBadge } from './StatusBadge';

interface DispatchPlanTableProps {
  bills: DispatchBill[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (bill: DispatchBill) => void;
  /** Doc entries currently ticked for the bulk dispatch-date action. */
  selected?: Set<number>;
  onToggle?: (docEntry: number) => void;
  /** Select/clear every selectable bill in the current filtered set. */
  onToggleAll?: (selectableDocEntries: number[]) => void;
}

// Only bills still being planned can be bulk re-dated; already-dispatched or
// cancelled bills are left out (re-dating them makes no sense).
function isBulkSelectable(bill: DispatchBill): boolean {
  const status = bill.plan.booking_status;
  return status === 'PENDING' || status === 'BOOKED';
}

type SortCol =
  | 'create_date'
  | 'doc_num'
  | 'card_name'
  | 'doc_total'
  | 'total_litres'
  | 'booking_status';

interface SortState {
  col: SortCol;
  dir: 'asc' | 'desc';
}

function SortIcon({ col, sort }: { col: SortCol; sort: SortState }) {
  if (sort.col !== col) {
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
  }
  return sort.dir === 'asc' ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return value;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: fractionDigits,
  });
}

function compactText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback;
}

function hasQuantity(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function DispatchPlanTable({
  bills,
  isLoading,
  canEdit,
  onEdit,
  selected,
  onToggle,
  onToggleAll,
}: DispatchPlanTableProps) {
  // Bulk selection is available only with edit rights and wired handlers.
  const bulkEnabled = canEdit && !!selected && !!onToggle && !!onToggleAll;
  const [sort, setSort] = useState<SortState>({
    col: 'create_date',
    dir: 'desc',
  });
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    return [...bills].sort((a, b) => {
      const aVal = sort.col === 'booking_status' ? a.plan.booking_status : a[sort.col];
      const bVal = sort.col === 'booking_status' ? b.plan.booking_status : b[sort.col];
      const cmp = (aVal ?? '') < (bVal ?? '') ? -1 : (aVal ?? '') > (bVal ?? '') ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [bills, sort]);

  // Client-side pagination over the fetched rows. The backend returns the whole
  // fetched set (up to the "Max rows" cap) in one call and computes the summary
  // cards over it, so we page locally. When a new data set arrives (filter or
  // refetch) return to the first page — adjusting state during render is React's
  // recommended alternative to a setState-in-effect. Sort and page-size changes
  // reset the page in their own handlers below.
  const [prevBills, setPrevBills] = useState(bills);
  if (prevBills !== bills) {
    setPrevBills(bills);
    setPage(1);
  }

  function toggleSort(col: SortCol) {
    setPage(1);
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    );
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, bill: DispatchBill) {
    if (!canEdit) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onEdit(bill);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex gap-4 border-b p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">No dispatch bills found.</p>
        </CardContent>
      </Card>
    );
  }

  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(startIndex, startIndex + pageSize);

  // Select-all spans the whole filtered set (across client-side pages), not just
  // the visible page — so a header tick selects every selectable bill.
  const selectableDocEntries = bulkEnabled
    ? sorted.filter(isBulkSelectable).map((bill) => bill.doc_entry)
    : [];
  const allSelected =
    selectableDocEntries.length > 0 && selectableDocEntries.every((de) => selected!.has(de));

  const thClass =
    'cursor-pointer whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground hover:text-foreground';
  const thRightClass =
    'cursor-pointer whitespace-nowrap px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground';

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {bulkEnabled && (
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => onToggleAll!(selectableDocEntries)}
                      aria-label="Select all bills for bulk dispatch date"
                      disabled={selectableDocEntries.length === 0}
                    />
                  </th>
                )}
                <th className={thClass} onClick={() => toggleSort('create_date')}>
                  Created <SortIcon col="create_date" sort={sort} />
                </th>
                <th className={thClass} onClick={() => toggleSort('doc_num')}>
                  Bill <SortIcon col="doc_num" sort={sort} />
                </th>
                <th className={thClass} onClick={() => toggleSort('card_name')}>
                  Party <SortIcon col="card_name" sort={sort} />
                </th>
                <th className={thClass}>Location</th>
                <th className={thRightClass} onClick={() => toggleSort('doc_total')}>
                  Value <SortIcon col="doc_total" sort={sort} />
                </th>
                <th className={thRightClass} onClick={() => toggleSort('total_litres')}>
                  Total Litres <SortIcon col="total_litres" sort={sort} />
                </th>
                <th className={thRightClass}>Load</th>
                <th className={thClass}>SAP Transport</th>
                <th className={thClass} onClick={() => toggleSort('booking_status')}>
                  Status <SortIcon col="booking_status" sort={sort} />
                </th>
                <th className={thClass}>Transport Link</th>
                <th className={thClass}>Planning</th>
                {/* Explicit action button — row-click alone doesn't work on every device. */}
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((bill) => (
                <tr
                  key={bill.doc_entry}
                  className={cn(
                    'border-b transition-colors',
                    canEdit &&
                      'cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    bulkEnabled && selected!.has(bill.doc_entry) && 'bg-primary/5',
                  )}
                  role={canEdit ? 'button' : undefined}
                  tabIndex={canEdit ? 0 : undefined}
                  aria-label={canEdit ? `Open dispatch plan ${bill.doc_num}` : undefined}
                  onClick={canEdit ? () => onEdit(bill) : undefined}
                  onKeyDown={(event) => handleRowKeyDown(event, bill)}
                >
                  {bulkEnabled && (
                    <td
                      className="px-4 py-3 align-top"
                      // Ticking a bill must not open its edit sheet.
                      onClick={(event) => event.stopPropagation()}
                    >
                      {isBulkSelectable(bill) ? (
                        <Checkbox
                          checked={selected!.has(bill.doc_entry)}
                          onCheckedChange={() => onToggle!(bill.doc_entry)}
                          aria-label={`Select bill ${bill.doc_num} for bulk dispatch date`}
                        />
                      ) : null}
                    </td>
                  )}
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{formatDate(bill.create_date)}</div>
                    <div className="text-xs text-muted-foreground">{bill.create_time}</div>
                    <div className="text-xs text-muted-foreground">
                      Inv {formatDate(bill.doc_date)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-xs font-semibold">{bill.doc_num}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{bill.branch_name}</div>
                    <div
                      className="mt-1 max-w-[170px] truncate text-xs text-muted-foreground"
                      title={bill.base_refs}
                    >
                      Ref {compactText(bill.base_refs)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[240px] truncate font-medium" title={bill.card_name}>
                      {compactText(bill.card_name)}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {compactText(bill.card_code)}
                    </div>
                    <div
                      className="mt-1 max-w-[240px] truncate text-xs text-muted-foreground"
                      title={bill.item_summary}
                    >
                      {compactText(bill.item_summary)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div>{compactText(bill.city)}</div>
                    <div className="text-xs text-muted-foreground">{compactText(bill.state)}</div>
                    <div
                      className="mt-1 max-w-[210px] truncate text-xs text-muted-foreground"
                      title={bill.ship_to_address}
                    >
                      {compactText(bill.ship_to_address)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top tabular-nums">
                    <div className="font-medium">{formatNumber(bill.doc_total)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(bill.total_gross_amount)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top tabular-nums">
                    {hasQuantity(bill.total_litres)
                      ? `${formatNumber(bill.total_litres, 2)} L`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right align-top tabular-nums">
                    <div className="text-xs text-muted-foreground">
                      {hasQuantity(bill.total_boxes)
                        ? `${formatNumber(bill.total_boxes, 2)} boxes`
                        : 'Boxes not available'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(bill.total_weight, 3)} kg
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div
                      className="max-w-[190px] truncate font-medium"
                      title={bill.sap_transporter_name}
                    >
                      {compactText(bill.sap_transporter_name)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vehicle {compactText(bill.sap_vehicle_no || bill.gst_vehicle_no)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bilty {compactText(bill.sap_bilty_no || bill.sap_lr_number)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={bill.plan.booking_status} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">Vehicle {compactText(bill.plan.vehicle_no)}</div>
                    <div className="text-xs text-muted-foreground">
                      Driver {compactText(bill.plan.driver_name)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Transporter {compactText(bill.plan.transporter_name)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bilty {compactText(bill.plan.bilty_no)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">
                      Dispatch {compactText(bill.plan.dispatch_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Priority {compactText(bill.plan.priority)}
                    </div>
                    <div
                      className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground"
                      title={bill.plan.remarks}
                    >
                      {compactText(bill.plan.remarks)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        // Stop the row's onClick from firing a second time.
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(bill);
                        }}
                        aria-label={`Open dispatch plan ${bill.doc_num}`}
                      >
                        <SquarePen className="mr-1.5 h-3.5 w-3.5" />
                        Open
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm sm:flex-row">
          <p className="text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startIndex + 1}</span>–
            <span className="font-medium text-foreground">
              {Math.min(startIndex + pageSize, totalRows)}
            </span>{' '}
            of <span className="font-medium text-foreground">{totalRows}</span>
          </p>
          <div className="flex items-center gap-2">
            <label
              htmlFor="dispatch-plan-page-size"
              className="whitespace-nowrap text-xs text-muted-foreground"
            >
              Rows per page
            </label>
            <Select
              id="dispatch-plan-page-size"
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="w-20"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectOption key={size} value={String(size)}>
                  {size}
                </SelectOption>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
