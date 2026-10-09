/**
 * Rejection History — every SAP approval request rejected in the company, in
 * the accounts desk's own register format (Date, Category, Party Name, Amount,
 * User, Reason), and who raised the most of them.
 *
 * Read live from SAP, so a rejection taken in the SAP client counts as well as
 * one taken from the inbox. "User" is the originator — the person who raised
 * the entry — because the register is about whose entries come back. The
 * category is the one picked when it was rejected here; a rejection taken
 * anywhere else shows its GL account's name instead, in italics.
 *
 * The whole window is fetched once and narrowed in the browser, so the
 * per-user ranking always covers everybody even while one user is picked.
 */
import { Download, RefreshCw } from 'lucide-react';
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
import type { SapRejection } from '../types';
import { money, person, registerDate } from '../utils/format';

interface Range {
  date_from: string;
  date_to: string;
}

export default function RejectionHistoryPage() {
  // Blank: the server's default, this month to date.
  const [range, setRange] = useState<Range>({ date_from: '', date_to: '' });
  const [originator, setOriginator] = useState('');
  const [category, setCategory] = useState('');

  const query = useSapRejectionHistory(range);
  const data = query.data;
  const all = useMemo(() => data?.results ?? [], [data]);

  const categories = useMemo(
    () => [...new Set(all.map((row) => row.category_label))].sort(),
    [all],
  );
  const rows = useMemo(
    () =>
      all.filter(
        (row) =>
          (!originator || (row.originator_code ?? '') === originator) &&
          (!category || row.category_label === category),
      ),
    [all, originator, category],
  );
  const most = data?.by_originator[0]?.count ?? 0;

  const download = () => {
    const csv = buildCsv(
      [
        'Date',
        'Category',
        'Party Name',
        'Amount',
        'User',
        'User Name',
        'Reason',
        'Rejected By',
        'Request',
        'Document',
      ],
      rows.map((row: SapRejection) => [
        registerDate(row.rejected_at),
        row.category_label,
        row.party_name,
        row.total_amount,
        row.originator_code,
        row.originator_name,
        row.reason,
        row.rejected_by,
        row.wdd_code,
        row.object_type_label,
      ]),
    );
    triggerCsvDownload(csv, `sap-rejections_${data?.date_from}_${data?.date_to}.csv`);
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

      <FilterBar
        isFetching={query.isFetching}
        activeCount={[range.date_from, range.date_to, originator, category].filter(Boolean).length}
        onReset={() => {
          setRange({ date_from: '', date_to: '' });
          setOriginator('');
          setCategory('');
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
      </FilterBar>

      <TableCard
        summary={`Rejections by user · ${registerDate(data?.date_from)} to ${registerDate(data?.date_to)}`}
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>User</Th>
              <Th align="right">Rejections</Th>
              <Th className="w-1/3"> </Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <TableLoading colSpan={4} />
            ) : !data || data.by_originator.length === 0 ? (
              <TableEmpty
                colSpan={4}
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
          Only the latest {data.count} rejections are shown. Narrow the dates to see the rest.
        </p>
      )}

      <TableCard summary={`${rows.length} ${rows.length === 1 ? 'rejection' : 'rejections'}`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Date</Th>
              <Th>Category</Th>
              <Th>Party Name</Th>
              <Th align="right">Amount</Th>
              <Th>User</Th>
              <Th>Reason</Th>
              <Th>Rejected by</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <TableLoading colSpan={7} />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={
                  query.isError
                    ? 'SAP could not be read. Try again in a moment.'
                    : 'No rejections match.'
                }
              />
            ) : (
              rows.map((row) => (
                <tr key={row.wdd_code} className={`${ROW_CLASSES} align-top`}>
                  <Td className="whitespace-nowrap tabular-nums">
                    {registerDate(row.rejected_at)}
                  </Td>
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
