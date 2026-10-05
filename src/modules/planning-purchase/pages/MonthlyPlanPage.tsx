/**
 * Monthly Plan: the planning team's own workbook, as uploaded. EXIM's Planning.
 *
 * Not SAP's production plan (Production Plans reads that live): the team's
 * Excel, every SKU's month in a COMMODITY or a PREMIUM block week by week, plus
 * e-commerce, in litres. A month is revised mid-month, so it holds several
 * versions; the highest is the live one and the rest stay for history.
 *
 * The version, the grouping, the view and the filters live in the URL, so a
 * narrowed read-out is a link somebody can send. With no version named the page
 * opens on the live plan of the newest month.
 */
import {
  AlertTriangle,
  CalendarRange,
  FileDown,
  Layers,
  LayoutList,
  PackageOpen,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Table2,
  Target,
  Trash2,
  Upload,
} from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  MONTHLY_PLAN_DELETE,
  MONTHLY_PLAN_UPLOAD,
} from '@/config/permissions/planning-purchase.permissions';
import { usePermission } from '@/core/auth';
import {
  confirmDialog,
  EmptyPanel,
  FilterAction,
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { Button, Input, NativeSelect, SelectOption, Switch } from '@/shared/components/ui';
import { cn, formatDateTimeShort, getErrorMessage, isApiError } from '@/shared/utils';

import { useDeleteMonthlyPlan, useMonthlyPlan, useMonthlyPlans } from '../api';
import {
  fmtKl,
  fmtLitres,
  GROUP_BY_OPTIONS,
  GROUP_LABEL,
  groupRows,
  isGroupBy,
  isPlanned,
  monthName,
  type PlanGroupBy,
  sumFigures,
  versionLabel,
} from '../components/monthlyPlan';
import { exportMonthlyPlan } from '../components/monthlyPlanExcel';
import { MonthlyPlanUploadDialog } from '../components/MonthlyPlanUploadDialog';
import type { MonthlyPlanRow, MonthlyPlanUpload } from '../types';

type View = 'simple' | 'detailed';

const FILTER_KEYS = ['head', 'brand', 'cat', 'sub', 'q'] as const;

const SIMPLE_COLUMNS = 6;
const DETAILED_COLUMNS = 15;

function searchText(row: MonthlyPlanRow) {
  return [row.code, row.sku, row.brand, row.head, row.category, row.sub_category]
    .join(' ')
    .toLowerCase();
}

/** The distinct values of one column, with the one chosen kept even when no row has it. */
function choicesOf(rows: MonthlyPlanRow[], pick: (row: MonthlyPlanRow) => string, chosen: string) {
  const values = new Set(rows.map(pick).filter(Boolean));
  if (chosen) values.add(chosen);
  return [...values].sort((a, b) => a.localeCompare(b));
}

function share(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/** A litre figure in a dense column: zero reads as a quiet dash. */
function L({ value, strong }: { value: number; strong?: boolean }) {
  return value ? (
    <span className={cn(strong && 'font-semibold')}>{fmtLitres(value)}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

function ShareBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-24">
        <div
          className="h-full rounded-full bg-indigo-500/70"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {percent.toFixed(1)}%
      </span>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon: typeof LayoutList }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border bg-card p-0.5">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function VersionStrip({
  upload,
  liveVersion,
  canDelete,
  deleting,
  onDelete,
}: {
  upload: MonthlyPlanUpload;
  liveVersion?: number;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{versionLabel(upload)}</span>
          {upload.is_latest ? (
            <StatusPill tone="done" dot>
              Live plan
            </StatusPill>
          ) : (
            <StatusPill tone="neutral">
              Superseded{liveVersion ? ` by v${liveVersion}` : ''}
            </StatusPill>
          )}
        </div>
        {upload.title && (
          <p className="break-words text-sm text-muted-foreground">{upload.title}</p>
        )}
        <p className="break-words text-xs text-muted-foreground">
          {upload.source_file} · {upload.row_count.toLocaleString('en-IN')} SKU rows · uploaded by{' '}
          {upload.uploaded_by_name || 'someone unrecorded'} on{' '}
          {formatDateTimeShort(upload.uploaded_at)}
        </p>
        {upload.notes && (
          <p className="whitespace-pre-line break-words text-sm">
            <span className="text-muted-foreground">Notes: </span>
            {upload.notes}
          </p>
        )}
      </div>
      {canDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          {deleting ? 'Deleting…' : 'Delete this version'}
        </Button>
      )}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export default function MonthlyPlanPage() {
  const { hasAnyPermission } = usePermission();
  const canUpload = hasAnyPermission(MONTHLY_PLAN_UPLOAD);
  const canDelete = hasAnyPermission(MONTHLY_PLAN_DELETE);
  const baseId = useId();
  const ids = {
    month: `${baseId}-month`,
    version: `${baseId}-version`,
    head: `${baseId}-head`,
    brand: `${baseId}-brand`,
    cat: `${baseId}-cat`,
    sub: `${baseId}-sub`,
    search: `${baseId}-search`,
    zero: `${baseId}-zero`,
  };

  const [params, setParams] = useSearchParams();
  const askedPlan = Number(params.get('plan'));
  const planId: number | 'latest' = askedPlan > 0 ? askedPlan : 'latest';
  const byParam = params.get('by');
  const groupBy: PlanGroupBy = isGroupBy(byParam) ? byParam : 'category';
  const view: View = params.get('view') === 'detailed' ? 'detailed' : 'simple';
  const head = params.get('head') ?? '';
  const brand = params.get('brand') ?? '';
  const category = params.get('cat') ?? '';
  const subCategory = params.get('sub') ?? '';
  const search = params.get('q') ?? '';
  const showZero = params.get('zero') === '1';

  const list = useMonthlyPlans();
  const uploads = useMemo(() => list.data?.uploads ?? [], [list.data]);
  const nothingUploaded = list.isSuccess && uploads.length === 0;
  const detail = useMonthlyPlan(planId, !nothingUploaded);
  const remove = useDeleteMonthlyPlan();
  const [uploadOpen, setUploadOpen] = useState(false);

  const plan = detail.data;
  // A named version that is gone. `latest` answering 404 means nothing is
  // uploaded, which the list says too, and says better.
  const notFound = planId !== 'latest' && isApiError(detail.error) && detail.error.status === 404;

  function writeParams(update: (next: URLSearchParams) => void) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        update(next);
        return next;
      },
      { replace: true },
    );
  }

  function setParam(key: string, value: string) {
    writeParams((next) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
  }

  /** The newest version overall is the default, so it is left out of the URL. */
  function showVersion(id: number | null) {
    writeParams((next) => {
      if (id === null || id === uploads[0]?.id) next.delete('plan');
      else next.set('plan', String(id));
    });
  }

  function resetFilters() {
    writeParams((next) => FILTER_KEYS.forEach((key) => next.delete(key)));
  }

  // --- the month and version pickers ----------------------------------------
  const months = useMemo(() => {
    const seen = new Map<string, MonthlyPlanUpload[]>();
    for (const upload of uploads) {
      const versions = seen.get(upload.month) ?? [];
      versions.push(upload);
      seen.set(upload.month, versions);
    }
    return [...seen.entries()].map(([month, versions]) => ({ month, versions }));
  }, [uploads]);
  const shownMonth = plan?.month ?? uploads.find((u) => u.id === planId)?.month ?? '';
  const versions = months.find((m) => m.month === shownMonth)?.versions ?? [];
  const liveVersion = versions.find((v) => v.is_latest)?.version;

  function pickMonth(month: string) {
    // A month opens on its live version: the highest, listed first.
    const live = months.find((m) => m.month === month)?.versions[0];
    if (live) showVersion(live.id);
  }

  // --- the rows, filtered and rolled up --------------------------------------
  const allRows = useMemo(() => plan?.rows ?? [], [plan]);
  const plannedRows = useMemo(() => allRows.filter(isPlanned), [allRows]);
  const baseRows = showZero ? allRows : plannedRows;
  const hiddenZero = allRows.length - plannedRows.length;

  const options = useMemo(
    () => ({
      heads: choicesOf(baseRows, (r) => r.head, head),
      brands: choicesOf(baseRows, (r) => r.brand, brand),
      categories: choicesOf(baseRows, (r) => r.category, category),
      subCategories: choicesOf(baseRows, (r) => r.sub_category, subCategory),
    }),
    [baseRows, head, brand, category, subCategory],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return baseRows.filter(
      (row) =>
        (!head || row.head === head) &&
        (!brand || row.brand === brand) &&
        (!category || row.category === category) &&
        (!subCategory || row.sub_category === subCategory) &&
        (!term || searchText(row).includes(term)),
    );
  }, [baseRows, head, brand, category, subCategory, search]);

  const groups = useMemo(() => groupRows(rows, groupBy), [rows, groupBy]);
  const total = useMemo(() => sumFigures(groups), [groups]);
  const filtered = !!(head || brand || category || subCategory || search.trim());
  const activeCount = [head, brand, category, subCategory, search.trim()].filter(Boolean).length;

  // --- actions -------------------------------------------------------------
  async function deleteShown() {
    if (!plan) return;
    const label = versionLabel(plan);
    const fallsBack =
      plan.is_latest && versions.length > 1
        ? ` v${versions.find((v) => v.id !== plan.id)?.version} becomes the live plan for ${monthName(plan.month)}.`
        : plan.is_latest
          ? ` ${monthName(plan.month)} will have no plan here.`
          : '';
    const confirmed = await confirmDialog({
      title: `Delete ${label}?`,
      description: `Its ${plan.row_count.toLocaleString('en-IN')} SKU rows are removed for good.${fallsBack}`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    // Where to go after: the month's live version if one is left (the highest
    // other than this one), else the newest plan overall. When this was the
    // newest overall, the one left in its month is now the newest: no `plan`.
    const sibling = versions.find((v) => v.id !== plan.id);
    const goTo = sibling && plan.id !== uploads[0]?.id ? sibling.id : null;
    remove.mutate(plan.id, {
      onSuccess: () => {
        toast.success(`${label} deleted`);
        showVersion(goTo);
      },
    });
  }

  function download() {
    if (!plan) return;
    exportMonthlyPlan(plan, groupBy, groups, total, rows);
    toast.success(`${versionLabel(plan)} downloading`);
  }

  const loading = list.isLoading || (detail.isLoading && !nothingUploaded);
  const ready = !!plan && !detail.isError;
  const dash = '—';
  const groupLabel = GROUP_LABEL[groupBy];
  const columns = view === 'simple' ? SIMPLE_COLUMNS : DETAILED_COLUMNS;

  const tiles = [
    {
      label: 'Total plan',
      value: total.total,
      sub: `${fmtLitres(total.total)} L · ${rows.length.toLocaleString('en-IN')} SKUs`,
      icon: Target,
      accent: 'indigo' as const,
    },
    {
      label: 'Commodity',
      value: total.commodity,
      sub: `${fmtLitres(total.commodity)} L · ${share(total.commodity, total.total).toFixed(1)}%`,
      icon: Layers,
      accent: 'amber' as const,
    },
    {
      label: 'Premium',
      value: total.premium,
      sub: `${fmtLitres(total.premium)} L · ${share(total.premium, total.total).toFixed(1)}%`,
      icon: Sparkles,
      accent: 'violet' as const,
    },
    {
      label: 'E-commerce',
      value: total.ecom,
      sub: `${fmtLitres(total.ecom)} L · ${share(total.ecom, total.total).toFixed(1)}%`,
      icon: ShoppingBag,
      accent: 'emerald' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly Plan" icon={CalendarRange} accent="indigo">
        {canUpload && (
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Upload plan
          </Button>
        )}
        <Button variant="outline" onClick={download} disabled={!ready}>
          <FileDown className="mr-1.5 h-4 w-4" />
          Download Excel
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void list.refetch();
            void detail.refetch();
          }}
          disabled={list.isFetching || detail.isFetching}
        >
          <RefreshCw
            className={cn(
              'mr-1.5 h-4 w-4',
              (list.isFetching || detail.isFetching) && 'animate-spin',
            )}
          />
          Refresh
        </Button>
      </PageHeader>

      {list.isError ? (
        <EmptyPanel
          icon={AlertTriangle}
          message="The monthly plans could not be read"
          hint={getErrorMessage(list.error, 'Try Refresh in a moment.')}
        />
      ) : nothingUploaded ? (
        <EmptyPanel
          icon={PackageOpen}
          message="No monthly plan has been uploaded yet"
          hint={
            canUpload
              ? "Upload the planning team's workbook. The month comes from the sheet's own banner."
              : 'The planning team uploads it here once it is ready.'
          }
          action={
            canUpload ? (
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload plan
              </Button>
            ) : undefined
          }
        />
      ) : notFound ? (
        <EmptyPanel
          icon={PackageOpen}
          message="That version is not there any more"
          hint="It may have been deleted."
          action={
            <Button variant="outline" onClick={() => showVersion(null)}>
              Open the live plan
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-56">
              <label
                htmlFor={ids.month}
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Month
              </label>
              <NativeSelect
                id={ids.month}
                value={shownMonth}
                disabled={!months.length}
                onChange={(event) => pickMonth(event.target.value)}
              >
                {!shownMonth && <SelectOption value="">Loading…</SelectOption>}
                {months.map(({ month, versions: vs }) => (
                  <SelectOption key={month} value={month}>
                    {`${monthName(month)}${vs.length > 1 ? ` (${vs.length} versions)` : ''}`}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-64">
              <label
                htmlFor={ids.version}
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Version
              </label>
              <NativeSelect
                id={ids.version}
                value={plan ? String(plan.id) : ''}
                disabled={versions.length < 2}
                onChange={(event) => showVersion(Number(event.target.value))}
              >
                {!plan && <SelectOption value="">Loading…</SelectOption>}
                {versions.map((v) => (
                  <SelectOption key={v.id} value={String(v.id)}>
                    {`v${v.version}${v.is_latest ? ' · live' : ''} · ${formatDateTimeShort(v.uploaded_at)}`}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          {plan && (
            <VersionStrip
              upload={plan}
              liveVersion={liveVersion}
              canDelete={canDelete}
              deleting={remove.isPending}
              onDelete={() => void deleteShown()}
            />
          )}

          <StatTileRow>
            {tiles.map((tile) => (
              <StatTile
                key={tile.label}
                label={tile.label}
                value={ready ? `${fmtKl(tile.value)} KL` : dash}
                sub={ready ? tile.sub : 'kilolitres'}
                icon={tile.icon}
                accent={tile.accent}
              />
            ))}
          </StatTileRow>

          <FilterBar
            isFetching={detail.isFetching && !detail.isLoading}
            activeCount={activeCount}
            onReset={filtered ? resetFilters : undefined}
          >
            <FilterField label="Search" htmlFor={ids.search} className="sm:w-56">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={ids.search}
                  value={search}
                  onChange={(event) => setParam('q', event.target.value)}
                  placeholder="SKU or code…"
                  className="h-9 w-full pl-8"
                />
              </div>
            </FilterField>
            <FilterField label="Head" htmlFor={ids.head} className="sm:w-40">
              <NativeSelect
                id={ids.head}
                value={head}
                onChange={(event) => setParam('head', event.target.value)}
              >
                <SelectOption value="">All heads</SelectOption>
                {options.heads.map((v) => (
                  <SelectOption key={v} value={v}>
                    {v}
                  </SelectOption>
                ))}
              </NativeSelect>
            </FilterField>
            <FilterField label="Brand" htmlFor={ids.brand} className="sm:w-40">
              <NativeSelect
                id={ids.brand}
                value={brand}
                onChange={(event) => setParam('brand', event.target.value)}
              >
                <SelectOption value="">All brands</SelectOption>
                {options.brands.map((v) => (
                  <SelectOption key={v} value={v}>
                    {v}
                  </SelectOption>
                ))}
              </NativeSelect>
            </FilterField>
            <FilterField label="Category" htmlFor={ids.cat} className="sm:w-44">
              <NativeSelect
                id={ids.cat}
                value={category}
                onChange={(event) => setParam('cat', event.target.value)}
              >
                <SelectOption value="">All categories</SelectOption>
                {options.categories.map((v) => (
                  <SelectOption key={v} value={v}>
                    {v}
                  </SelectOption>
                ))}
              </NativeSelect>
            </FilterField>
            <FilterField label="Sub-category" htmlFor={ids.sub} className="sm:w-48">
              <NativeSelect
                id={ids.sub}
                value={subCategory}
                onChange={(event) => setParam('sub', event.target.value)}
              >
                <SelectOption value="">All sub-categories</SelectOption>
                {options.subCategories.map((v) => (
                  <SelectOption key={v} value={v}>
                    {v}
                  </SelectOption>
                ))}
              </NativeSelect>
            </FilterField>
            <FilterAction className="sm:h-9">
              <label htmlFor={ids.zero} className="flex items-center gap-2 text-sm">
                <Switch
                  id={ids.zero}
                  checked={showZero}
                  onChange={(checked) => setParam('zero', checked ? '1' : '')}
                />
                SKUs with no plan
              </label>
            </FilterAction>
          </FilterBar>

          <TableCard
            summary={
              <span>
                {loading ? (
                  'Reading the plan…'
                ) : ready ? (
                  <>
                    <span className="font-semibold text-foreground">{versionLabel(plan)}</span>
                    {` · ${groups.length.toLocaleString('en-IN')} ${
                      groupBy === 'sku' ? 'SKUs' : `${groupLabel.toLowerCase()} groups`
                    } from ${rows.length.toLocaleString('en-IN')} SKUs`}
                    {filtered ? ` of ${baseRows.length.toLocaleString('en-IN')}` : ''}
                    {!showZero && hiddenZero > 0
                      ? ` · ${hiddenZero.toLocaleString('en-IN')} with no plan hidden`
                      : ''}
                  </>
                ) : (
                  'The plan was not read'
                )}
              </span>
            }
            actions={
              <>
                <NativeSelect
                  aria-label="Group by"
                  value={groupBy}
                  onChange={(event) => setParam('by', event.target.value)}
                  className="w-auto"
                >
                  {GROUP_BY_OPTIONS.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {`By ${option.label.toLowerCase()}`}
                    </SelectOption>
                  ))}
                </NativeSelect>
                <Segmented
                  label="View"
                  value={view}
                  onChange={(next) => setParam('view', next === 'simple' ? '' : next)}
                  options={[
                    { value: 'simple', label: 'Simple', icon: LayoutList },
                    { value: 'detailed', label: 'Detailed', icon: Table2 },
                  ]}
                />
              </>
            }
          >
            <table className={TABLE_CLASSES}>
              {view === 'simple' ? (
                <thead className={THEAD_CLASSES}>
                  <tr>
                    <Th className="w-10">#</Th>
                    <Th>{groupLabel}</Th>
                    <Th align="right">{groupBy === 'sku' ? 'Code' : 'SKUs'}</Th>
                    <Th align="right">Planned (L)</Th>
                    <Th align="right">KL</Th>
                    <Th align="right">Share</Th>
                  </tr>
                </thead>
              ) : (
                <thead className={THEAD_CLASSES}>
                  <tr>
                    <Th rowSpan={2}>{groupLabel}</Th>
                    <Th rowSpan={2} align="right">
                      {groupBy === 'sku' ? 'Code' : 'SKUs'}
                    </Th>
                    <Th colSpan={5} align="center" className="border-l pb-1">
                      Commodity (L)
                    </Th>
                    <Th colSpan={5} align="center" className="border-l pb-1">
                      Premium (L)
                    </Th>
                    <Th rowSpan={2} align="right" className="border-l">
                      E-com (L)
                    </Th>
                    <Th rowSpan={2} align="right">
                      Total (L)
                    </Th>
                    <Th rowSpan={2} align="right">
                      KL
                    </Th>
                  </tr>
                  <tr>
                    {(['commodity', 'premium'] as const).flatMap((block) =>
                      ['Month', 'W1', 'W2', 'W3', 'W4'].map((label) => (
                        <Th
                          key={`${block}-${label}`}
                          align="right"
                          className={cn('pt-1', label === 'Month' && 'border-l')}
                          aria-label={`${block === 'commodity' ? 'Commodity' : 'Premium'} ${
                            label === 'Month' ? 'month' : `week ${label.slice(1)}`
                          }`}
                        >
                          {label}
                        </Th>
                      )),
                    )}
                  </tr>
                </thead>
              )}
              <tbody>
                {loading ? (
                  <TableLoading colSpan={columns} message="Reading the plan…" />
                ) : detail.isError ? (
                  <TableEmpty
                    colSpan={columns}
                    icon={AlertTriangle}
                    message="The plan could not be read"
                    hint={getErrorMessage(detail.error, 'Try Refresh in a moment.')}
                  />
                ) : groups.length === 0 ? (
                  <TableEmpty
                    colSpan={columns}
                    icon={Target}
                    message={
                      filtered
                        ? 'No SKU matches'
                        : allRows.length
                          ? 'No SKU carries a plan in this version'
                          : 'This version has no rows'
                    }
                    hint={
                      filtered
                        ? 'Try another head, brand or category, or Reset.'
                        : !showZero && hiddenZero
                          ? 'Turn on "SKUs with no plan" to see them.'
                          : undefined
                    }
                  />
                ) : view === 'simple' ? (
                  groups.map((g, index) => (
                    <tr key={g.key} className={ROW_CLASSES}>
                      <Td className="text-muted-foreground">{index + 1}</Td>
                      <Td className="min-w-40 font-medium">{g.label}</Td>
                      <Td numeric className="text-muted-foreground">
                        {g.code ? <span className="font-mono text-xs">{g.code}</span> : g.skus}
                      </Td>
                      <Td numeric className="whitespace-nowrap font-semibold">
                        {fmtLitres(g.total)}
                      </Td>
                      <Td numeric className="whitespace-nowrap text-muted-foreground">
                        {fmtKl(g.total)}
                      </Td>
                      <Td>
                        <ShareBar percent={share(g.total, total.total)} />
                      </Td>
                    </tr>
                  ))
                ) : (
                  groups.map((g) => (
                    <tr key={g.key} className={ROW_CLASSES}>
                      <Td className="min-w-40 font-medium">{g.label}</Td>
                      <Td numeric className="text-muted-foreground">
                        {g.code ? <span className="font-mono text-xs">{g.code}</span> : g.skus}
                      </Td>
                      <Td numeric className="border-l">
                        <L value={g.commodity} strong />
                      </Td>
                      {g.commodityWeeks.map((w, i) => (
                        <Td key={`c${i}`} numeric className="text-muted-foreground">
                          <L value={w} />
                        </Td>
                      ))}
                      <Td numeric className="border-l">
                        <L value={g.premium} strong />
                      </Td>
                      {g.premiumWeeks.map((w, i) => (
                        <Td key={`p${i}`} numeric className="text-muted-foreground">
                          <L value={w} />
                        </Td>
                      ))}
                      <Td numeric className="border-l">
                        <L value={g.ecom} />
                      </Td>
                      <Td numeric className="font-semibold">
                        {fmtLitres(g.total)}
                      </Td>
                      <Td numeric className="text-muted-foreground">
                        {fmtKl(g.total)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
              {ready && groups.length > 0 && (
                <tfoot>
                  {view === 'simple' ? (
                    <tr className="border-t-2 bg-muted/40 font-semibold">
                      <Td />
                      <Td>Total</Td>
                      <Td numeric>{groupBy === 'sku' ? '' : rows.length}</Td>
                      <Td numeric className="whitespace-nowrap">
                        {fmtLitres(total.total)}
                      </Td>
                      <Td numeric className="whitespace-nowrap">
                        {fmtKl(total.total)}
                      </Td>
                      <Td numeric className="text-xs text-muted-foreground">
                        100%
                      </Td>
                    </tr>
                  ) : (
                    <tr className="border-t-2 bg-muted/40 font-semibold">
                      <Td>Total</Td>
                      <Td numeric>{groupBy === 'sku' ? '' : rows.length}</Td>
                      <Td numeric className="border-l">
                        {fmtLitres(total.commodity)}
                      </Td>
                      {total.commodityWeeks.map((w, i) => (
                        <Td key={`c${i}`} numeric>
                          {fmtLitres(w)}
                        </Td>
                      ))}
                      <Td numeric className="border-l">
                        {fmtLitres(total.premium)}
                      </Td>
                      {total.premiumWeeks.map((w, i) => (
                        <Td key={`p${i}`} numeric>
                          {fmtLitres(w)}
                        </Td>
                      ))}
                      <Td numeric className="border-l">
                        {fmtLitres(total.ecom)}
                      </Td>
                      <Td numeric>{fmtLitres(total.total)}</Td>
                      <Td numeric>{fmtKl(total.total)}</Td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </TableCard>

          <Hint>
            Figures are litres, as the sheet gives them; KL is thousands of litres. A SKU&apos;s
            month sits in its COMMODITY or its PREMIUM block, and each block&apos;s month is the sum
            of its four weeks. The total adds e-commerce, which the sheet does not split by week.
          </Hint>
        </>
      )}

      <MonthlyPlanUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(id) => {
          // The new version is the newest of its month; show it, whatever month it is.
          writeParams((next) => next.set('plan', String(id)));
        }}
      />
    </div>
  );
}
