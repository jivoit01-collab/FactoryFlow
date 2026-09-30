/**
 * The licence register: every Advance Authorisation and DFIA the company holds.
 *
 * EXIM kept the two on separate pages; here they are two tabs of one register,
 * because they are one job — tracking a duty-free import scheme until its
 * obligation is met — read in opposite directions. The tab and the filters live
 * in the URL, so a filtered register is a link somebody can send.
 */
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileBadge,
  Pencil,
  Plus,
  Scale,
  Search,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { licenceRight } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  confirmDialog,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Input } from '@/shared/components/ui';
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import { useDeleteLicence, useLicence, useLicences } from '../api';
import { KIND_COPY, LicenceFormDialog, LicenceStatusPill, ValidityCell } from '../components';
import type { Licence, LicenceKind, LicenceStatus } from '../types';
import { daysUntil, fmtMoney, fmtQty } from '../utils';

const KINDS: LicenceKind[] = ['ADVANCE', 'DFIA'];

const STATUS_TABS: { key: string; label: string; status?: LicenceStatus }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open', status: 'OPEN' },
  { key: 'closed', label: 'Closed', status: 'CLOSED' },
];

type SortKey =
  | 'number'
  | 'status'
  | 'issue_date'
  | 'import_validity'
  | 'export_validity'
  | 'cif_value_inr'
  | 'fob_value_inr'
  | 'authorised_qty_mts'
  | 'obligation_mts'
  | 'balance_mts';

const NUMERIC: SortKey[] = [
  'cif_value_inr',
  'fob_value_inr',
  'authorised_qty_mts',
  'obligation_mts',
  'balance_mts',
];

const COLUMNS = 12;

/** The date an open licence runs out on first, of its two validities still ahead. */
function nextValidity(licence: Licence): number | null {
  const days = [daysUntil(licence.import_validity), daysUntil(licence.export_validity)].filter(
    (d): d is number => d !== null && d >= 0,
  );
  return days.length ? Math.min(...days) : null;
}

/** A value in rupees, with the dollars it was converted to beneath it. */
function MoneyPair({ inr, usd }: { inr: string; usd: string }) {
  return (
    <span className="block leading-tight">
      <span className="block whitespace-nowrap">₹ {fmtMoney(inr)}</span>
      <span className="block whitespace-nowrap text-xs text-muted-foreground">
        $ {fmtMoney(usd)}
      </span>
    </span>
  );
}

/** A header that sorts the register by its column; a second click reverses it. */
function SortTh({
  column,
  children,
  align,
  sort,
  onSort,
}: {
  column: SortKey;
  children: ReactNode;
  align?: 'right';
  sort: { key: SortKey | null; dir: 'asc' | 'desc' };
  onSort: (column: SortKey) => void;
}) {
  const Icon = sort.key !== column ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <Th align={align}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {children}
        <Icon className={cn('h-3 w-3', sort.key !== column && 'opacity-40')} />
      </button>
    </Th>
  );
}

export default function LicencesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();

  const viewable = KINDS.filter((k) => hasPermission(licenceRight('view', k)));
  const requested = searchParams.get('kind') as LicenceKind | null;
  const kind: LicenceKind =
    requested && viewable.includes(requested) ? requested : (viewable[0] ?? 'ADVANCE');
  const statusKey = searchParams.get('status') || 'all';
  const status = STATUS_TABS.find((t) => t.key === statusKey)?.status;
  const copy = KIND_COPY[kind];

  const canAdd = hasPermission(licenceRight('add', kind));
  const canChange = hasPermission(licenceRight('change', kind));
  const canDelete = hasPermission(licenceRight('delete', kind));

  // The whole register for the kind, filtered here: the tiles above the table
  // count open licences whichever status the table is showing.
  const { data: licences, isLoading, isFetching, isError, error } = useLicences(kind);
  const remove = useDeleteLicence();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  // The edit dialog corrects the licence as the server has it now, lines and
  // all, rather than the register's row, which is a summary of it.
  const { data: editing } = useLicence(editingId ?? 0);

  function setParam(key: string, value: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
    setPage(1);
  }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const found = (licences ?? []).filter(
      (l) => (!status || l.status === status) && (!term || l.number.toLowerCase().includes(term)),
    );
    if (!sortKey) return found;
    return [...found].sort((a, b) => {
      const cmp = NUMERIC.includes(sortKey)
        ? Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)
        : String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [licences, status, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  const open = (licences ?? []).filter((l) => l.status === 'OPEN');
  const endingSoon = open.filter((l) => {
    const days = nextValidity(l);
    return days !== null && days <= 30;
  }).length;
  const openBalance = open.reduce((sum, l) => sum + Math.max(0, Number(l.balance_mts ?? 0)), 0);

  const sort = { key: sortKey, dir: sortDir };

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function onDelete(licence: Licence) {
    const confirmed = await confirmDialog({
      title: `Delete ${licence.number}?`,
      description: 'The licence and every bill of entry and shipping bill on it are removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(licence.id);
      toast.success(`${licence.number} deleted`);
    } catch {
      // The API client has already shown why.
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Licences"
        icon={FileBadge}
        accent="teal"
      >
        {canAdd && (
          <Button
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New {copy.title}
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {viewable.length > 1 ? (
          <div className="flex rounded-lg border bg-card p-0.5 shadow-sm">
            {viewable.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setParam('kind', k === viewable[0] ? null : k)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  kind === k
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {KIND_COPY[k].plural}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium">{copy.plural}</p>
        )}
        <p className="text-sm text-muted-foreground">{copy.blurb}</p>
      </div>

      <StatTileRow>
        <StatTile label="Open" value={open.length} sub="licences" icon={FileBadge} accent="teal" />
        <StatTile
          label="Validity ending"
          value={endingSoon}
          sub="open, within 30 days"
          icon={AlertTriangle}
          accent={endingSoon ? 'amber' : 'slate'}
        />
        <StatTile
          label="Open balance"
          value={fmtQty(openBalance)}
          sub={kind === 'ADVANCE' ? 'MT still to export' : 'MT still to import'}
          icon={Scale}
          accent="indigo"
        />
      </StatTileRow>

      <TableCard
        summary={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border p-0.5">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setParam('status', t.key === 'all' ? null : t.key)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    statusKey === t.key
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span>
              {rows.length} licence{rows.length === 1 ? '' : 's'}
              {isFetching && !isLoading ? ' · refreshing…' : ''}
            </span>
          </div>
        }
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={`Search ${copy.numberLabel.toLowerCase()}`}
              className="h-9 w-56 pl-8"
            />
          </div>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th className="w-10">#</Th>
              <SortTh column="number" sort={sort} onSort={sortBy}>
                {copy.numberLabel}
              </SortTh>
              <SortTh column="status" sort={sort} onSort={sortBy}>
                Status
              </SortTh>
              <SortTh column="issue_date" sort={sort} onSort={sortBy}>
                Issued
              </SortTh>
              <SortTh column="import_validity" sort={sort} onSort={sortBy}>
                Import validity
              </SortTh>
              <SortTh column="export_validity" sort={sort} onSort={sortBy}>
                Export validity
              </SortTh>
              <SortTh column="cif_value_inr" align="right" sort={sort} onSort={sortBy}>
                CIF
              </SortTh>
              <SortTh column="fob_value_inr" align="right" sort={sort} onSort={sortBy}>
                FOB
              </SortTh>
              <SortTh column="authorised_qty_mts" align="right" sort={sort} onSort={sortBy}>
                {kind === 'ADVANCE' ? 'Valid import' : 'Valid export'}
              </SortTh>
              <SortTh column="obligation_mts" align="right" sort={sort} onSort={sortBy}>
                {kind === 'ADVANCE' ? 'To export' : 'To import'}
              </SortTh>
              <SortTh column="balance_mts" align="right" sort={sort} onSort={sortBy}>
                Balance
              </SortTh>
              {/* Labelled rather than holding an sr-only span: that span is absolutely
                  positioned, escapes the scrolling table, and widens the whole page. */}
              <Th align="right" className="w-24" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Loading the register…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The register could not be loaded"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : shown.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={FileBadge}
                message={search ? 'No licence matches that number' : `No ${copy.plural} yet`}
                hint={canAdd && !search ? `Add the first with New ${copy.title}.` : undefined}
              />
            ) : (
              shown.map((licence, index) => (
                <tr
                  key={licence.id}
                  className={cn(ROW_CLASSES, 'cursor-pointer')}
                  onClick={() => navigate(`/exim/licences/${licence.id}`)}
                >
                  <Td className="text-muted-foreground tabular-nums">
                    {(page - 1) * pageSize + index + 1}
                  </Td>
                  <Td className="font-mono font-medium text-primary">{licence.number}</Td>
                  <Td>
                    <LicenceStatusPill status={licence.status} />
                  </Td>
                  <Td className="whitespace-nowrap">{formatDay(licence.issue_date)}</Td>
                  <Td>
                    <ValidityCell date={licence.import_validity} status={licence.status} />
                  </Td>
                  <Td>
                    <ValidityCell date={licence.export_validity} status={licence.status} />
                  </Td>
                  <Td numeric>
                    <MoneyPair inr={licence.cif_value_inr} usd={licence.cif_value_usd} />
                  </Td>
                  <Td numeric>
                    <MoneyPair inr={licence.fob_value_inr} usd={licence.fob_value_usd} />
                  </Td>
                  <Td numeric>{fmtQty(licence.authorised_qty_mts)}</Td>
                  <Td numeric>{fmtQty(licence.obligation_mts)}</Td>
                  <Td
                    numeric
                    className={cn(
                      'font-medium',
                      Number(licence.balance_mts) < 0 && 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {fmtQty(licence.balance_mts)}
                  </Td>
                  <Td align="right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {canChange && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${licence.number}`}
                          onClick={() => {
                            setEditingId(licence.id);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${licence.number}`}
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10"
                          onClick={() => onDelete(licence)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {rows.length > pageSize && (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={rows.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </TableCard>

      <LicenceFormDialog
        open={formOpen && (editingId === null || !!editing)}
        onOpenChange={(value) => {
          setFormOpen(value);
          if (!value) setEditingId(null);
        }}
        kind={kind}
        licence={editingId ? editing : null}
        onCreated={(created) => navigate(`/exim/licences/${created.id}`)}
      />
    </div>
  );
}
