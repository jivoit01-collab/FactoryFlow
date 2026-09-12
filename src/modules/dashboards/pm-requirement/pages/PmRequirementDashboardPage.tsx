import { useCallback, useMemo, useState } from 'react';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import { usePmRequirement, usePmRequirementPlans } from '../api';
import {
  PmReqFilters,
  PmReqHeadline,
  PmReqNotes,
  PmReqPlanBar,
  PmReqRowDialog,
  PmReqTable,
} from '../components';
import { DEFAULT_FILTER, DEFAULT_SORT, DEFAULT_SORT_FOR_FILTER } from '../constants';
import type { PmReqFilter, PmReqRow, PmReqSortKey } from '../types';
import {
  csvFilename,
  familiesOf,
  filterByFamily,
  filterRows,
  nextSort,
  searchRows,
  sortRows,
  toCsv,
} from '../utils';

function isSAPError(error: unknown): error is ApiError {
  const status = (error as ApiError)?.status;
  return status === 502 || status === 503;
}

function isMissingPlan(error: unknown): boolean {
  return (error as ApiError)?.status === 404;
}

/**
 * PM Requirement.
 *
 * The month's production plan exploded through its bills of material, netted
 * against what the floor has already taken, what the stores still hold and
 * what is already on order — the nine columns the packaging buyer kept by
 * hand in a spreadsheet, read live from SAP instead.
 *
 * Two requests. The plan list fills the picker and changes when a planner
 * authors a month; the requirement is six HANA reads and is re-read only when
 * a different plan is chosen. Everything else on this page — the filter, the
 * search, the family, the sort — is a reading of the one answer already on
 * the client, because the API returns every component on the plan and
 * re-requesting to sort 196 rows would be a HANA read to do arithmetic the
 * browser can do.
 */
export default function PmRequirementDashboardPage() {
  // Null means "nobody has chosen" — NOT a default of its own. The request
  // goes out without a plan id and the API resolves the month covering today,
  // which keeps that choice in one place instead of having the front end
  // re-derive it and risk a different answer.
  const [chosenAbsId, setChosenAbsId] = useState<number | null>(null);
  const [filter, setFilter] = useState<PmReqFilter>(DEFAULT_FILTER);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [openRow, setOpenRow] = useState<PmReqRow | null>(null);

  const plansQuery = usePmRequirementPlans();
  const requirementQuery = usePmRequirement(chosenAbsId);

  /**
   * What the picker shows.
   *
   * Derived rather than synced into state: the plan the requirement came back
   * for is the honest thing to display, and falling back to the plan list's
   * own default keeps the picker populated during the first load instead of
   * sitting blank. Storing it in an effect would mean a second render and a
   * moment where the picker and the table disagreed about which month is on
   * screen.
   */
  const shownAbsId =
    chosenAbsId ??
    requirementQuery.data?.plan.abs_id ??
    plansQuery.data?.meta.default_abs_id ??
    null;

  const allRows = useMemo(() => requirementQuery.data?.data ?? [], [requirementQuery.data]);
  const families = useMemo(() => familiesOf(allRows), [allRows]);

  // Search and family narrow the set the filter chips count, so the counts on
  // the chips always describe what clicking one would actually show.
  const searched = useMemo(
    () => filterByFamily(searchRows(allRows, search), family),
    [allRows, search, family],
  );

  const counts = useMemo(
    () =>
      ({
        all: searched.length,
        short: filterRows(searched, 'short').length,
        'at-risk': filterRows(searched, 'at-risk').length,
        surplus: filterRows(searched, 'surplus').length,
        'over-issued': filterRows(searched, 'over-issued').length,
        'over-purchased': filterRows(searched, 'over-purchased').length,
      }) as Record<PmReqFilter, number>,
    [searched],
  );

  const rows = useMemo(
    () => sortRows(filterRows(searched, filter), sort),
    [searched, filter, sort],
  );

  const handleSort = useCallback(
    (key: PmReqSortKey) => setSort((current) => nextSort(current, key)),
    [],
  );

  /**
   * Choosing a chip also chooses what "worst first" means under it.
   *
   * Over-purchased rows all have a shortfall of zero — a row cannot be short
   * after its order and over-bought on it — so leaving the sort on the
   * shortfall column would list them alphabetically. See the constant.
   */
  const handleFilterChange = useCallback((next: PmReqFilter) => {
    setFilter(next);
    setSort(DEFAULT_SORT_FOR_FILTER[next] ?? DEFAULT_SORT);
  }, []);

  const refreshAll = useCallback(() => {
    void plansQuery.refetch();
    void requirementQuery.refetch();
  }, [plansQuery, requirementQuery]);

  /**
   * Download what is on screen.
   *
   * Built from `rows` — filtered and sorted — because somebody who has
   * narrowed the table to cartons still short is exporting that list. A blob
   * rather than a data URI: a 196-row CSV is well inside any limit, but a
   * data URI of arbitrary item names is the kind of thing that breaks on one
   * unusual character and this cannot.
   */
  const handleExport = useCallback(() => {
    const plan = requirementQuery.data?.plan;
    const meta = requirementQuery.data?.meta;
    if (!rows.length || !plan || !meta) return;

    // A UTF-8 byte-order mark, written as an escape rather than pasted in
    // as an invisible character. Excel on Windows reads a CSV without one
    // as the system codepage, which mangles the rupee sign and any
    // accented item name -- and this file exists to be opened in Excel.
    const blob = new Blob(['\ufeff' + toCsv(rows)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = csvFilename(plan.code, meta.as_of);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rows, requirementQuery.data]);

  const sapError = [plansQuery.error, requirementQuery.error].find(isSAPError);
  const noPlan = isMissingPlan(requirementQuery.error);
  const isFetching = plansQuery.isFetching || requirementQuery.isFetching;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="PM Requirement"
        description="The month's packing material plan against what the floor has taken, the stores hold, and purchasing has on order"
      />

      <PmReqPlanBar
        plans={plansQuery.data?.plans ?? []}
        absId={shownAbsId}
        onAbsIdChange={setChosenAbsId}
        plan={requirementQuery.data?.plan}
        dateFrom={requirementQuery.data?.meta.date_from}
        dateTo={requirementQuery.data?.meta.date_to}
        isFetching={isFetching}
        onRefresh={refreshAll}
        onExport={handleExport}
        exportDisabled={!rows.length}
        exportCount={rows.length}
      />

      {sapError && <SAPUnavailableBanner error={sapError as ApiError} onRetry={refreshAll} />}

      {/* A plan that is not there is said so, never shown as an empty table:
          no rows and no message reads as "the plan needs no packaging". */}
      {noPlan && (
        <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          SAP has no production plan for this company, or the one selected has been deleted.
          Planners author it in SAP as a sales forecast (OFCT); once one exists it appears in the
          picker above.
        </p>
      )}

      <PmReqHeadline
        totals={requirementQuery.data?.totals}
        isLoading={requirementQuery.isLoading}
        onFilter={handleFilterChange}
      />

      <PmReqNotes
        meta={requirementQuery.data?.meta}
        coverage={requirementQuery.data?.coverage}
        unplanned={requirementQuery.data?.unplanned}
      />

      <div className="space-y-3">
        <PmReqFilters
          filter={filter}
          onFilterChange={handleFilterChange}
          search={search}
          onSearchChange={setSearch}
          family={family}
          onFamilyChange={setFamily}
          families={families}
          counts={counts}
        />

        <PmReqTable
          rows={rows}
          sort={sort}
          onSortChange={handleSort}
          isLoading={requirementQuery.isLoading || requirementQuery.isFetching}
          onOpenRow={setOpenRow}
          emptyMessage={
            requirementQuery.isLoading
              ? 'Reading the plan…'
              : allRows.length === 0
                ? 'This plan explodes to no packing material. Check that its products have bills of material in SAP.'
                : filter === 'short'
                  ? 'Nothing is short once open orders are counted. Switch to Everything to see the whole plan.'
                  : filter === 'over-purchased'
                    ? 'Nothing is on order beyond what the plan still needs. Every open order is sized against the requirement less stock.'
                    : 'No component matches these filters.'
          }
        />
      </div>

      <PmReqRowDialog
        row={openRow}
        meta={requirementQuery.data?.meta}
        onClose={() => setOpenRow(null)}
      />
    </div>
  );
}
