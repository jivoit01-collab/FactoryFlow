/**
 * Rejection History — every SAP approval entry rejected even once, in the
 * accounts desk's own register format (Date, Category, Party Name, Amount,
 * User, Reason), where each stands now, and who raised the most of them.
 *
 * Read live from SAP, so a rejection taken in the SAP client counts as well as
 * one taken from the inbox, and one changed to approved afterwards still
 * counts. "User" is the originator — the person who raised the entry —
 * because the register is about whose entries come back. The category is the
 * one picked when it was rejected here; otherwise the GL account's name, in
 * italics.
 *
 * "Now" follows the entry after the rejection: nobody fixes a rejected draft
 * in place, they key it again, so the server finds the re-keyed document (same
 * party and vendor reference, or the same amount soon after) and says whether
 * it is pending, approved, posted or rejected again.
 *
 * One company, or every company the reader belongs to. The whole window is
 * fetched once and narrowed in the browser, so the per-user ranking always
 * covers everybody even while one user or stage is picked.
 */
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { buildCsv, triggerCsvDownload } from '@/modules/marketplace/utils/csv';
import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import { useSapRejectionHistory } from '../api/sap-approvals.queries';
import type { SapRejection, SapRejectionStage } from '../types';
import { money, person, registerDate } from '../utils/format';

interface Range {
  date_from: string;
  date_to: string;
}

const STAGE: Record<SapRejectionStage, { label: string; className: string }> = {
  STILL_REJECTED: {
    label: 'Still rejected',
    className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
  },
  REJECTED_AGAIN: {
    label: 'Re-entered, rejected again',
    className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
  },
  PENDING: {
    label: 'Corrected, pending',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  },
  APPROVED: {
    label: 'Corrected, approved',
    className: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  },
  POSTED: {
    label: 'Corrected, posted',
    className: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  },
  CLOSED: {
    label: 'Closed, not re-entered',
    className: 'bg-muted text-muted-foreground',
  },
};

/** The stage filter: the open ones, the corrected ones, or one stage. */
const STAGE_FILTERS: { key: string; label: string; stages: SapRejectionStage[] }[] = [
  { key: '', label: 'Every stage', stages: [] },
  { key: 'open', label: 'Still open', stages: ['STILL_REJECTED', 'REJECTED_AGAIN'] },
  { key: 'corrected', label: 'Corrected', stages: ['PENDING', 'APPROVED', 'POSTED'] },
  { key: 'PENDING', label: 'Corrected, pending', stages: ['PENDING'] },
  { key: 'POSTED', label: 'Corrected, posted', stages: ['POSTED', 'APPROVED'] },
  { key: 'CLOSED', label: 'Closed, not re-entered', stages: ['CLOSED'] },
];

function nowLabel(row: SapRejection): string {
  if (!row.now) return '—';
  const base = STAGE[row.now.stage].label;
  return row.now.doc_num && row.now.via !== 'same_request' ? `${base} (#${row.now.doc_num})` : base;
}

function NowChip({ row }: { row: SapRejection }) {
  if (!row.now) return <span className="text-muted-foreground">—</span>;
  const stage = STAGE[row.now.stage];
  const via =
    row.now.via === 'reference'
      ? `Re-entered as #${row.now.doc_num}, same vendor reference`
      : row.now.via === 'amount'
        ? `Re-entered as #${row.now.doc_num}, same party and amount`
        : row.now.via === 'same_request'
          ? 'The same request, taken forward'
          : undefined;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${stage.className}`}
        title={via}
      >
        {stage.label}
      </span>
      {row.now.doc_num && row.now.via !== 'same_request' && (
        <span className="font-mono text-xs text-muted-foreground">
          {row.now.posted ? 'doc' : 'draft'} #{row.now.doc_num}
        </span>
      )}
    </div>
  );
}

export default function RejectionHistoryPage() {
  // Blank: the server's default, this month to date.
  const [range, setRange] = useState<Range>({ date_from: '', date_to: '' });
  const [allCompanies, setAllCompanies] = useState(false);
  const [originator, setOriginator] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState('');

  const query = useSapRejectionHistory({ ...range, all_companies: allCompanies });
  const data = query.data;
  const all = useMemo(() => data?.results ?? [], [data]);
  const showCompany = allCompanies && (data?.companies.length ?? 0) > 1;

  const categories = useMemo(
    () => [...new Set(all.map((row) => row.category_label))].sort(),
    [all],
  );
  const rows = useMemo(() => {
    const stages = STAGE_FILTERS.find((f) => f.key === stage)?.stages ?? [];
    return all.filter(
      (row) =>
        (!originator || (row.originator_code ?? '') === originator) &&
        (!category || row.category_label === category) &&
        (stages.length === 0 || (row.now !== null && stages.includes(row.now.stage))),
    );
  }, [all, originator, category, stage]);
  const most = data?.by_originator[0]?.count ?? 0;

  const download = () => {
    const csv = buildCsv(
      [
        'Date',
        ...(showCompany ? ['Company'] : []),
        'Category',
        'Party Name',
        'Amount',
        'User',
        'User Name',
        'Reason',
        'Now',
        'Rejected By',
        'Request',
        'Document',
      ],
      rows.map((row) => [
        registerDate(row.rejected_at),
        ...(showCompany ? [row.company_name] : []),
        row.category_label,
        row.party_name,
        row.total_amount,
        row.originator_code,
        row.originator_name,
        row.reason,
        nowLabel(row),
        row.rejected_by,
        row.wdd_code,
        row.object_type_label,
      ]),
    );
    const scope = allCompanies ? 'all-companies' : (data?.companies[0]?.code ?? 'company');
    triggerCsvDownload(csv, `sap-rejections_${scope}_${data?.date_from}_${data?.date_to}.csv`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rejection History">
        <Button variant="outline" onClick={download} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          aria-label="Reload from SAP"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {[
          { all: false, label: 'This company' },
          { all: true, label: 'All companies' },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setAllCompanies(option.all)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              allCompanies === option.all
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
        {data && (
          <span className="self-center text-sm text-muted-foreground">
            {data.companies.map((c) => c.name).join(', ')}
          </span>
        )}
      </div>

      {data && data.unavailable.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            SAP could not be read for {data.unavailable.map((c) => c.name).join(', ')}, so their
            rejections are missing below. Refresh in a moment.
          </span>
        </div>
      )}

      <FilterBar
        isFetching={query.isFetching}
        activeCount={
          [range.date_from, range.date_to, originator, category, stage].filter(Boolean).length
        }
        onReset={() => {
          setRange({ date_from: '', date_to: '' });
          setOriginator('');
          setCategory('');
          setStage('');
        }}
      >
        <FilterField label="Rejected from" htmlFor="rejections-from">
          <Input
            id="rejections-from"
            type="date"
            value={range.date_from || data?.date_from || ''}
            onChange={(e) => setRange((w) => ({ ...w, date_from: e.target.value }))}
            className="h-9"
          />
        </FilterField>
        <FilterField label="to" htmlFor="rejections-to">
          <Input
            id="rejections-to"
            type="date"
            value={range.date_to || data?.date_to || ''}
            onChange={(e) => setRange((w) => ({ ...w, date_to: e.target.value }))}
            className="h-9"
          />
        </FilterField>
        <FilterField label="User" htmlFor="rejections-user">
          <NativeSelect
            id="rejections-user"
            value={originator}
            onChange={(e) => setOriginator(e.target.value)}
            className="h-9 w-56"
          >
            <SelectOption value="">Everybody</SelectOption>
            {(data?.by_originator ?? []).map((group) => (
              <SelectOption key={group.originator_code ?? ''} value={group.originator_code ?? ''}>
                {person(group.originator_code, group.originator_name)} · {group.count}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Category" htmlFor="rejections-category">
          <NativeSelect
            id="rejections-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-56"
          >
            <SelectOption value="">Every category</SelectOption>
            {categories.map((label) => (
              <SelectOption key={label} value={label}>
                {label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Now" htmlFor="rejections-stage">
          <NativeSelect
            id="rejections-stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="h-9 w-52"
          >
            {STAGE_FILTERS.map((option) => (
              <SelectOption key={option.key} value={option.key}>
                {option.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>

      <TableCard
        summary={`Rejections by user · ${registerDate(data?.date_from)} to ${registerDate(data?.date_to)}`}
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>User</Th>
              <Th align="right">Rejections</Th>
              <Th align="right">Still rejected</Th>
              <Th className="w-1/3"> </Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <TableLoading colSpan={5} />
            ) : !data || data.by_originator.length === 0 ? (
              <TableEmpty
                colSpan={5}
                message={
                  query.isError
                    ? 'SAP could not be read. Try again in a moment.'
                    : 'Nothing was rejected in this window.'
                }
              />
            ) : (
              data.by_originator.map((group) => {
                const code = group.originator_code ?? '';
                const picked = originator === code;
                return (
                  <tr
                    key={code}
                    className={`${ROW_CLASSES} cursor-pointer ${picked ? 'bg-primary/5' : ''}`}
                    onClick={() => setOriginator(picked ? '' : code)}
                    title={picked ? 'Show everybody' : 'Show only this user’s rejections'}
                  >
                    <Td className="font-medium">
                      {person(group.originator_code, group.originator_name)}
                    </Td>
                    <Td numeric>{group.count}</Td>
                    <Td numeric>
                      {group.still_rejected > 0 ? (
                        <span className="font-medium text-red-700 dark:text-red-400">
                          {group.still_rejected}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </Td>
                    <Td>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-red-500/70"
                          style={{ width: `${most ? (group.count / most) * 100 : 0}%` }}
                        />
                      </div>
                    </Td>
                    <Td numeric>{money(group.amount)}</Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {data?.truncated && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Only the latest rejections are shown. Narrow the dates to see the rest.
        </p>
      )}

      <TableCard summary={`${rows.length} ${rows.length === 1 ? 'rejection' : 'rejections'}`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Date</Th>
              {showCompany && <Th>Company</Th>}
              <Th>Category</Th>
              <Th>Party Name</Th>
              <Th align="right">Amount</Th>
              <Th>User</Th>
              <Th>Reason</Th>
              <Th>Now</Th>
              <Th>Rejected by</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <TableLoading colSpan={showCompany ? 9 : 8} />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={showCompany ? 9 : 8}
                message={
                  query.isError
                    ? 'SAP could not be read. Try again in a moment.'
                    : 'No rejections match.'
                }
              />
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.company_code}-${row.wdd_code}`}
                  className={`${ROW_CLASSES} align-top`}
                >
                  <Td className="whitespace-nowrap tabular-nums">
                    {registerDate(row.rejected_at)}
                  </Td>
                  {showCompany && <Td className="whitespace-nowrap">{row.company_name}</Td>}
                  <Td>
                    <span
                      className={
                        row.category_source === 'app' ? '' : 'italic text-muted-foreground'
                      }
                      title={
                        row.category_source === 'gl'
                          ? `No category was picked; GL account ${row.gl_account}`
                          : row.category_source === 'document'
                            ? 'No category was picked and the document has no GL line'
                            : undefined
                      }
                    >
                      {row.category_label}
                    </span>
                  </Td>
                  <Td className="max-w-[18rem]">
                    <div className="truncate" title={row.party_name ?? undefined}>
                      {row.party_name ?? '—'}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {row.object_type_label} · #{row.wdd_code}
                    </div>
                  </Td>
                  <Td numeric>{money(row.total_amount)}</Td>
                  <Td className="whitespace-nowrap" title={row.originator_name ?? undefined}>
                    {row.originator_code ?? '—'}
                  </Td>
                  <Td className="max-w-[18rem]">
                    {row.reason || <span className="text-muted-foreground">—</span>}
                  </Td>
                  <Td>
                    <NowChip row={row} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {person(row.rejected_by, row.rejected_by_name)}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
