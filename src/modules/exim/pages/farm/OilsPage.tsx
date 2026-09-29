/**
 * The oils the tanks hold and lots are bought in, each with the colour the
 * Tank Farm paints its tanks. EXIM's Tank Items page.
 *
 * An oil still in a tank or on a lot cannot be deleted — the server refuses —
 * so the page says so before trying, and offers to mark it inactive instead,
 * which keeps it on its tanks and lots but out of the lists for new ones.
 */
import {
  AlertTriangle,
  Droplets,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  confirmDialog,
  EmptyPanel,
  PageHeader,
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui';
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import { useDeleteOil, useOils, useSaveOil } from '../../api';
import { ColorPicker } from '../../components/farm/ColorPicker';
import { colorName, resolveColor } from '../../components/farm/farm';
import { OilDot, Segmented } from '../../components/farm/FarmBits';
import { OilFormDialog } from '../../components/farm/OilFormDialog';
import type { Oil } from '../../types';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]['value'];

const VIEWS = [
  { value: 'table' as const, label: 'Table', icon: List },
  { value: 'grid' as const, label: 'Cards', icon: LayoutGrid },
];

function inUse(oil: Oil): boolean {
  return oil.tank_count > 0 || oil.lot_count > 0;
}

function usage(oil: Oil): string {
  const parts = [];
  if (oil.tank_count) parts.push(`${oil.tank_count} tank${oil.tank_count === 1 ? '' : 's'}`);
  if (oil.lot_count) parts.push(`${oil.lot_count} lot${oil.lot_count === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/** The same, as a sentence: "in 2 tanks and on 3 lots". */
function usagePhrase(oil: Oil): string {
  const parts = [];
  if (oil.tank_count) parts.push(`in ${oil.tank_count} tank${oil.tank_count === 1 ? '' : 's'}`);
  if (oil.lot_count) parts.push(`on ${oil.lot_count} lot${oil.lot_count === 1 ? '' : 's'}`);
  return parts.join(' and ');
}

function payloadOf(oil: Oil) {
  return {
    code: oil.code,
    category: oil.category,
    color: oil.color ? resolveColor(oil.color) : '',
    is_active: oil.is_active,
  };
}

/** The oil's colour; with the right to change it, a button that opens the picker. */
function ColorCell({ oil, canChange }: { oil: Oil; canChange: boolean }) {
  const save = useSaveOil();
  const chip = (
    <>
      <OilDot color={oil.color} className="h-4 w-4" />
      <span className="truncate">{colorName(oil.color)}</span>
    </>
  );
  if (!canChange) {
    return <span className="inline-flex items-center gap-2 text-sm">{chip}</span>;
  }

  async function change(hex: string) {
    if (resolveColor(oil.color) === hex) return;
    try {
      await save.mutateAsync({ id: oil.id, payload: { ...payloadOf(oil), color: hex } });
      toast.success(`${oil.name} is drawn in ${colorName(hex)} now`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not change the colour.'));
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Change the colour of ${oil.name}`}
          className="inline-flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-sm transition-colors hover:bg-muted"
        >
          {chip}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <ColorPicker value={resolveColor(oil.color)} onChange={change} compact />
      </PopoverContent>
    </Popover>
  );
}

export default function OilsPage() {
  const { hasPermission } = usePermission();
  const canAdd = hasPermission(EXIM_PERMISSIONS.OIL_ADD);
  const canChange = hasPermission(EXIM_PERMISSIONS.OIL_CHANGE);
  const canDelete = hasPermission(EXIM_PERMISSIONS.OIL_DELETE);

  const { data: oils, isLoading, isFetching, isError, error } = useOils(false);
  const save = useSaveOil();
  const remove = useDeleteOil();

  const [searchParams, setSearchParams] = useSearchParams();
  const status: StatusTab =
    STATUS_TABS.find((t) => t.value === searchParams.get('status'))?.value ?? 'all';
  const view = searchParams.get('view') === 'grid' ? 'grid' : 'table';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Oil | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  function setParam(key: string, value: string | null) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
    setPage(1);
  }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(oils ?? [])]
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      .filter((oil) => {
        if (status === 'active' && !oil.is_active) return false;
        if (status === 'inactive' && oil.is_active) return false;
        if (!term) return true;
        return [oil.code, oil.name, oil.category_label, oil.category].some((value) =>
          value?.toLowerCase().includes(term),
        );
      });
  }, [oils, status, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);
  // A tick only counts while its oil is still on the page being read.
  const picked = shown.filter((oil) => selected.has(oil.id));
  const allPicked = shown.length > 0 && picked.length === shown.length;

  function togglePick(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current);
      shown.forEach((oil) => (allPicked ? next.delete(oil.id) : next.add(oil.id)));
      return next;
    });
  }

  function openForm(oil: Oil | null) {
    setEditing(oil);
    setFormOpen(true);
  }

  async function onDelete(oil: Oil) {
    if (inUse(oil)) {
      const deactivate = await confirmDialog({
        title: `${oil.name} is in use`,
        description: `It is ${usagePhrase(oil)}, so it cannot be deleted.${
          oil.is_active && canChange
            ? ' Mark it inactive instead: it stays on those, but is not offered for new ones.'
            : ''
        }`,
        confirmLabel: oil.is_active && canChange ? 'Mark inactive' : 'Close',
        cancelLabel: oil.is_active && canChange ? 'Keep it active' : 'Cancel',
      });
      if (!deactivate || !oil.is_active || !canChange) return;
      try {
        await save.mutateAsync({ id: oil.id, payload: { ...payloadOf(oil), is_active: false } });
        toast.success(`${oil.name} is inactive`);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not mark the oil inactive.'));
      }
      return;
    }
    const confirmed = await confirmDialog({
      title: `Delete ${oil.name}?`,
      description: `${oil.code} is removed from the list of oils.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(oil.id);
      toast.success(`${oil.name} deleted`);
      setSelected((current) => {
        const next = new Set(current);
        next.delete(oil.id);
        return next;
      });
    } catch {
      // The API client has already shown why — for an oil in use, that it is.
    }
  }

  async function onBulkDelete() {
    const free = picked.filter((oil) => !inUse(oil));
    const held = picked.length - free.length;
    const confirmed = await confirmDialog({
      title: `Delete ${free.length} oil${free.length === 1 ? '' : 's'}?`,
      description: held
        ? `${held} of those ticked ${held === 1 ? 'is' : 'are'} still in a tank or on a lot and ${held === 1 ? 'is' : 'are'} left as ${held === 1 ? 'it is' : 'they are'}.`
        : 'They are removed from the list of oils.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed || free.length === 0) return;
    setBulkDeleting(true);
    let deleted = 0;
    for (const oil of free) {
      try {
        await remove.mutateAsync(oil.id);
        deleted += 1;
      } catch {
        // The API client has already shown why.
      }
    }
    setBulkDeleting(false);
    setSelected(new Set());
    if (deleted) {
      toast.success(`${deleted} oil${deleted === 1 ? '' : 's'} deleted`);
    }
  }

  const columns = 7 + (canDelete ? 1 : 0);
  const emptyMessage = search ? 'No oil matches that' : 'No oils yet';
  const emptyHint = canAdd && !search ? 'Add the first with Add oil.' : undefined;

  function rowActions(oil: Oil, compact = false) {
    return (
      <div className={cn('flex gap-1', compact ? 'justify-center' : 'justify-end')}>
        {canChange && (
          <Button
            variant="ghost"
            size="icon"
            className={compact ? 'h-8 w-8' : undefined}
            aria-label={`Edit ${oil.name}`}
            onClick={() => openForm(oil)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${oil.name}`}
            title={inUse(oil) ? `In use: ${usage(oil)}` : 'Delete'}
            className={cn(
              compact && 'h-8 w-8',
              'text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10',
            )}
            onClick={() => onDelete(oil)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oils"
        description="The oils the tanks hold and lots are bought in, and the colour each is drawn in on the Tank Farm."
        icon={Droplets}
        accent="teal"
      >
        {canDelete && picked.length > 0 && (
          <Button
            variant="outline"
            className="text-rose-600 hover:text-rose-700"
            onClick={onBulkDelete}
            disabled={bulkDeleting}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {bulkDeleting ? 'Deleting…' : `Delete ${picked.length}`}
          </Button>
        )}
        {canAdd && (
          <Button onClick={() => openForm(null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add oil
          </Button>
        )}
      </PageHeader>

      <TableCard
        summary={
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Status"
              value={status}
              options={STATUS_TABS.map((t) => ({ value: t.value, label: t.label }))}
              onChange={(value) => setParam('status', value === 'all' ? null : value)}
            />
            <span>
              {rows.length} oil{rows.length === 1 ? '' : 's'}
              {isFetching && !isLoading ? ' · refreshing…' : ''}
            </span>
          </div>
        }
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search code, name or category"
                className="h-9 w-60 pl-8"
              />
            </div>
            <Segmented
              label="View"
              value={view}
              options={VIEWS}
              onChange={(value) => setParam('view', value === 'table' ? null : value)}
              iconOnly
            />
          </>
        }
      >
        {view === 'table' ? (
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                {canDelete && (
                  <Th className="w-10">
                    <Checkbox
                      checked={allPicked}
                      onCheckedChange={togglePage}
                      aria-label="Tick every oil on this page"
                    />
                  </Th>
                )}
                <Th className="w-10">#</Th>
                <Th>Colour</Th>
                <Th>Oil</Th>
                <Th>Category</Th>
                <Th>In use on</Th>
                <Th>Added</Th>
                <Th align="right" className="w-24" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoading colSpan={columns} message="Loading the oils…" />
              ) : isError ? (
                <TableEmpty
                  colSpan={columns}
                  icon={AlertTriangle}
                  message="The oils could not be loaded"
                  hint={getErrorMessage(error, 'Try again in a moment.')}
                />
              ) : shown.length === 0 ? (
                <TableEmpty
                  colSpan={columns}
                  icon={Droplets}
                  message={emptyMessage}
                  hint={emptyHint}
                />
              ) : (
                shown.map((oil, index) => (
                  <tr
                    key={oil.id}
                    className={cn(ROW_CLASSES, selected.has(oil.id) && 'bg-muted/40')}
                  >
                    {canDelete && (
                      <Td>
                        <Checkbox
                          checked={selected.has(oil.id)}
                          onCheckedChange={() => togglePick(oil.id)}
                          aria-label={`Tick ${oil.name}`}
                        />
                      </Td>
                    )}
                    <Td className="tabular-nums text-muted-foreground">
                      {(page - 1) * pageSize + index + 1}
                    </Td>
                    <Td>
                      <ColorCell oil={oil} canChange={canChange} />
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-2 font-medium">
                        {oil.name}
                        {!oil.is_active && <StatusPill tone="neutral">Inactive</StatusPill>}
                      </span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {oil.code}
                      </span>
                    </Td>
                    <Td>
                      {oil.category_label || <span className="text-muted-foreground">—</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{usage(oil) || '—'}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDay(new Date(oil.created_at))}
                    </Td>
                    <Td align="right">{rowActions(oil)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className="p-4">
            {isLoading ? (
              <EmptyPanel loading message="Loading the oils…" className="border-0 shadow-none" />
            ) : isError ? (
              <EmptyPanel
                icon={AlertTriangle}
                message="The oils could not be loaded"
                hint={getErrorMessage(error, 'Try again in a moment.')}
                className="border-0 shadow-none"
              />
            ) : shown.length === 0 ? (
              <EmptyPanel
                icon={Droplets}
                message={emptyMessage}
                hint={emptyHint}
                className="border-0 shadow-none"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {shown.map((oil) => (
                  <div
                    key={oil.id}
                    className={cn(
                      'relative flex min-w-0 flex-col items-center gap-1.5 rounded-xl border bg-card p-4 text-center shadow-sm',
                      selected.has(oil.id) && 'ring-2 ring-primary',
                      !oil.is_active && 'opacity-70',
                    )}
                  >
                    {canDelete && (
                      <Checkbox
                        className="absolute left-3 top-3"
                        checked={selected.has(oil.id)}
                        onCheckedChange={() => togglePick(oil.id)}
                        aria-label={`Tick ${oil.name}`}
                      />
                    )}
                    <OilDot color={oil.color} className="h-12 w-12 border-2" />
                    <span className="text-xs text-muted-foreground">{colorName(oil.color)}</span>
                    {oil.category_label && (
                      <StatusPill tone="neutral">{oil.category_label}</StatusPill>
                    )}
                    <span className="mt-1 font-mono text-xs text-muted-foreground">{oil.code}</span>
                    <span className="w-full truncate text-sm font-medium">{oil.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {usage(oil) || 'Not in use'}
                      {!oil.is_active && ' · inactive'}
                    </span>
                    {(canChange || canDelete) && (
                      <div className="mt-1">{rowActions(oil, true)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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

      <OilFormDialog
        open={formOpen}
        onOpenChange={(value) => {
          setFormOpen(value);
          if (!value) setEditing(null);
        }}
        oil={editing}
      />
    </div>
  );
}
