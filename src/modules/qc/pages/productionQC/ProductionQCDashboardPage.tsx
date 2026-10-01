import { addDays, format, parseISO } from 'date-fns';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Plus,
  RefreshCw,
  Search,
  ShieldX,
  Table2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { cn } from '@/shared/utils';

import {
  useProductionParameterTypes,
  useProductionQCEntries,
  useProductionQCEntryCounts,
  useProductionQCSheetEntries,
} from '../../api/productionQC/productionQC.queries';
import { ProductionQCTabs } from '../../components/qcSections';
import {
  PRODUCTION_QC_STATUS_FILTERS,
  type ProductionQCStatusFilter,
} from '../../constants/productionQC';
import type {
  ProductionQCEntry,
  ProductionQCEntryListParams,
} from '../../types/productionQC.types';
import { formatDateTime } from '../../utils/productionQCFormat';
import { NewProductionQCEntryDialog } from './NewProductionQCEntryDialog';
import { ProductionQCSheet } from './ProductionQCSheet';
import { ProductionQCStatusBadge } from './ProductionQCStatusBadge';

const STATUS_KEYS = PRODUCTION_QC_STATUS_FILTERS.map((filter) => filter.key);

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => format(new Date(), 'yyyy-MM-dd');
const shiftDay = (day: string, by: number) => format(addDays(parseISO(day), by), 'yyyy-MM-dd');
const dayLabel = (day: string) => format(parseISO(day), 'd MMM yyyy');

type View = 'list' | 'sheet';

function readStatus(value: string | null): ProductionQCStatusFilter {
  return STATUS_KEYS.includes(value as ProductionQCStatusFilter)
    ? (value as ProductionQCStatusFilter)
    : 'ALL';
}

export default function ProductionQCDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = usePermission();
  const canFill = hasPermission(QC_PERMISSIONS.PRODUCTION_QC.FILL);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const [paging, setPaging] = useState({ key: '', page: 1 });
  const [pageSize, setPageSize] = useState(25);
  // The page is one day at a time, like the paper record; the day and the view
  // live in the address, so a link or a refresh opens the same sheet.
  const requestedDay = searchParams.get('date') ?? '';
  const day = DAY_RE.test(requestedDay) ? requestedDay : today();
  const isToday = day === today();
  const view: View = searchParams.get('view') === 'sheet' ? 'sheet' : 'list';

  const statusFilter = readStatus(searchParams.get('status'));
  const docFilter = searchParams.get('doc') ?? '';

  const listParams = useMemo<ProductionQCEntryListParams>(() => {
    const params: ProductionQCEntryListParams = { date: day };
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [day, statusFilter, debouncedSearch]);

  const {
    data: entries = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProductionQCEntries(listParams);
  const { data: counts, refetch: refetchCounts } = useProductionQCEntryCounts({ date: day });
  const {
    data: sheetEntries = [],
    isLoading: sheetLoading,
    refetch: refetchSheet,
  } = useProductionQCSheetEntries({ date: day }, view === 'sheet');
  const { data: types = [] } = useProductionParameterTypes(undefined, view === 'sheet');
  // The day's counts: "All" is their sum, the same entries the day lists.
  const statusCounts: Partial<Record<ProductionQCStatusFilter, number>> = counts
    ? {
        ALL: counts.pending + counts.sent_back + counts.approved,
        PENDING: counts.pending,
        SENT_BACK: counts.sent_back,
        APPROVED: counts.approved,
      }
    : {};

  // The document filter runs here rather than on the server, so its options are
  // the documents in the list the other filters give — and never go stale.
  const docOptions = useMemo(() => {
    const byId = new Map<number, string>();
    (view === 'sheet' ? sheetEntries : entries).forEach((entry) =>
      byId.set(entry.parameter_type.id, entry.parameter_type.name),
    );
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, sheetEntries, view]);
  const filteredEntries = useMemo(
    () =>
      docFilter
        ? entries.filter((entry) => String(entry.parameter_type.id) === docFilter)
        : entries,
    [entries, docFilter],
  );

  // Any change of filter starts again from the first page.
  const filterKey = [statusFilter, docFilter, debouncedSearch, day, pageSize].join('|');
  const page = paging.key === filterKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: filterKey, page: next });

  const totalItems = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedEntries = useMemo(
    () => filteredEntries.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredEntries, safePage, pageSize],
  );

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  const updateParam = (key: 'status' | 'doc' | 'date' | 'view', value: string) => {
    const next = new URLSearchParams(searchParams);
    const isDefault =
      !value ||
      (key === 'status' && value === 'ALL') ||
      (key === 'date' && value === today()) ||
      (key === 'view' && value === 'list');
    if (isDefault) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const handleRefresh = () => {
    refetch();
    refetchCounts();
    if (view === 'sheet') refetchSheet();
  };

  // One sheet per document — each is its own paper form — with the day's entries
  // as its columns.
  const sheets = useMemo(() => {
    const byType = new Map<number, ProductionQCEntry[]>();
    sheetEntries
      .filter((entry) => !docFilter || String(entry.parameter_type.id) === docFilter)
      .forEach((entry) => {
        const list = byType.get(entry.parameter_type.id) ?? [];
        list.push(entry);
        byType.set(entry.parameter_type.id, list);
      });
    return [...byType.entries()]
      .map(([typeId, list]) => {
        const type = types.find((candidate) => candidate.id === typeId);
        return {
          typeId,
          title: list[0].parameter_type.name,
          description: type?.description ?? '',
          documentCode: type?.print_document_id ?? '',
          revision: type?.revision ?? '',
          revisionDate: type?.revision_date ?? null,
          entries: list,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [sheetEntries, docFilter, types]);

  const waitingElsewhere = counts?.waiting_elsewhere ?? 0;
  const firstWaitingDay = counts?.waiting_elsewhere_first_date ?? null;

  const statusLabel =
    PRODUCTION_QC_STATUS_FILTERS.find((filter) => filter.key === statusFilter)?.label ?? 'All';

  return (
    <div className="space-y-6">
      <ProductionQCTabs />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mb-1 text-3xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">The records QC maintains, approved by a QC lead</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              aria-label="Previous day"
              onClick={() => updateParam('date', shiftDay(day, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              aria-label="Day"
              value={day}
              max={today()}
              onChange={(event) => {
                if (DAY_RE.test(event.target.value)) updateParam('date', event.target.value);
              }}
              className="h-9 w-40"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              aria-label="Next day"
              disabled={isToday}
              onClick={() => updateParam('date', shiftDay(day, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => updateParam('date', today())}>
                Today
              </Button>
            )}
          </div>
          <div
            role="group"
            aria-label="View"
            className="inline-flex items-center rounded-md border p-0.5"
          >
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              aria-pressed={view === 'list'}
              onClick={() => updateParam('view', 'list')}
            >
              <List className="mr-1.5 h-4 w-4" />
              List
            </Button>
            <Button
              variant={view === 'sheet' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              aria-pressed={view === 'sheet'}
              onClick={() => updateParam('view', 'sheet')}
            >
              <Table2 className="mr-1.5 h-4 w-4" />
              Sheet
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="w-full sm:w-auto">
            <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          {canFill && (
            <Button size="sm" onClick={() => setIsNewOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Checks still waiting on other days: a per-day page must not hide them */}
      {waitingElsewhere > 0 && firstWaitingDay && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">
            {waitingElsewhere} {waitingElsewhere === 1 ? 'entry' : 'entries'} on other days{' '}
            {waitingElsewhere === 1 ? 'is' : 'are'} still waiting for approval or correction — the
            oldest on {dayLabel(firstWaitingDay)}.
          </span>
          <Button variant="outline" size="sm" onClick={() => updateParam('date', firstWaitingDay)}>
            Open {dayLabel(firstWaitingDay)}
          </Button>
        </div>
      )}

      {/* Search */}
      {view === 'list' && (
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search this day by entry no., document, or anything entered..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
            aria-label="Search document entries"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {view === 'list' &&
            PRODUCTION_QC_STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.key;
              const count = statusCounts[filter.key];
              return (
                <Button
                  key={filter.key}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => updateParam('status', filter.key)}
                >
                  {filter.label}
                  {count !== undefined && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-xs font-semibold tabular-nums',
                        active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}
        </div>
        <select
          aria-label="Filter by document"
          value={docFilter}
          onChange={(event) => updateParam('doc', event.target.value)}
          className="h-8 max-w-[260px] rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All documents</option>
          {docOptions.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
          {docFilter && !docOptions.some((doc) => String(doc.id) === docFilter) && (
            <option value={docFilter}>Document #{docFilter}</option>
          )}
        </select>
      </div>

      {/* Permission Error */}
      {isPermissionError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <ShieldX className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {apiError?.message || 'You do not have permission to view document entries.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* General Error */}
      {error && !isPermissionError && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-500/10">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {apiError?.message || 'An error occurred while loading document entries.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sheet view: the day's record, one sheet per parameter type */}
      {view === 'sheet' &&
        (sheetLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : sheets.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
            {sheetEntries.length > 0
              ? 'No entries of this document on this day'
              : `No document entries on ${dayLabel(day)}`}
          </div>
        ) : (
          <div className="space-y-6">
            {sheets.map((sheet) => (
              <ProductionQCSheet
                key={sheet.typeId}
                title={sheet.title}
                description={sheet.description}
                documentCode={sheet.documentCode}
                revision={sheet.revision}
                revisionDate={sheet.revisionDate}
                day={day}
                entries={sheet.entries}
              />
            ))}
          </div>
        ))}

      {/* Loading */}
      {view === 'list' && isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {view === 'list' && !isLoading && !error && filteredEntries.length === 0 && (
        <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
          {debouncedSearch
            ? `No entries on this day match "${debouncedSearch}"`
            : entries.length > 0
              ? 'No entries of this document'
              : statusFilter === 'ALL'
                ? `No document entries on ${dayLabel(day)}`
                : `No ${statusLabel.toLowerCase()} entries on ${dayLabel(day)}`}
        </div>
      )}

      {/* Entries */}
      {view === 'list' && !isLoading && !error && filteredEntries.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {statusLabel} ({filteredEntries.length})
          </h3>
          <div className="overflow-hidden rounded-md border">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      '#',
                      'Checked At',
                      'Document',
                      'Status',
                      'Out of Spec',
                      'Submitted By',
                      'Approved By',
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap p-3 text-left text-sm font-medium"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/qc/documents/entries/${entry.id}`)}
                    >
                      <td className="whitespace-nowrap p-3 text-sm font-medium">#{entry.id}</td>
                      <td className="whitespace-nowrap p-3 text-sm text-muted-foreground">
                        {formatDateTime(entry.checked_at)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm">
                        {entry.parameter_type.name}
                        <div className="font-mono text-xs text-muted-foreground">
                          {entry.parameter_type.code}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <ProductionQCStatusBadge status={entry.status} label={entry.status_label} />
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap p-3 text-sm',
                          entry.out_of_spec_count > 0
                            ? 'font-semibold text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {entry.out_of_spec_count}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm">
                        {entry.submitted_by_name || '-'}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm">
                        {entry.approved_by_name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={safePage}
              pageSize={pageSize}
              total={totalItems}
              totalPages={totalPages}
              isLoading={isLoading}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {canFill && <NewProductionQCEntryDialog open={isNewOpen} onOpenChange={setIsNewOpen} />}
    </div>
  );
}
