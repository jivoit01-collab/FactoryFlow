/**
 * Contract history: EXIM's Contractual History.
 *
 * The contract rates agreed with each vendor for each oil, and the period each
 * ran. EXIM stopped adding to it in May 2026, so it arrives as a record of past
 * contracts and is read-only; the contracts open now are on the Contracts page.
 */
import { AlertTriangle, History, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  PageHeader,
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Input } from '@/shared/components/ui';
import { formatDateTimeShort, formatDay, getErrorMessage } from '@/shared/utils';

import { useContractHistory } from '../../api';
import { contractDays, fmtRate } from '../../components/lots/lotFormat';

const COLUMNS = 7;

export default function ContractHistoryPage() {
  const { data, isLoading, isFetching, isError, error } = useContractHistory();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((row) =>
      [row.item_name, row.item_code, row.vendor_name, row.vendor_code, row.created_by_label]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract History"
        icon={History}
        accent="teal"
      />

      <TableCard
        summary={
          <span>
            {rows.length} contract{rows.length === 1 ? '' : 's'}
            {search && data ? ` of ${data.length}` : ''}
            {isFetching && !isLoading ? ' · refreshing…' : ''}
          </span>
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
              placeholder="Search oil, vendor or who entered it"
              aria-label="Search the contracts"
              className="h-9 w-64 pl-8"
            />
          </div>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Oil</Th>
              <Th>Vendor</Th>
              <Th align="right">Rate (₹/kg)</Th>
              <Th>Starts</Th>
              <Th>Ends</Th>
              <Th align="right">Days</Th>
              <Th>Entered</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Loading the contracts…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The contract history could not be loaded"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : shown.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={History}
                message={search ? 'No contract matches that search' : 'No contracts recorded'}
              />
            ) : (
              shown.map((row) => {
                const { periodDays } = contractDays(row.contract_start, row.contract_end);
                return (
                  <tr key={row.id} className={ROW_CLASSES}>
                    <Td>
                      <span className="block whitespace-nowrap font-medium">
                        {row.item_name || '—'}
                      </span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {row.item_code}
                      </span>
                    </Td>
                    <Td>
                      <span className="block whitespace-nowrap">{row.vendor_name || '—'}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {row.vendor_code}
                      </span>
                    </Td>
                    <Td numeric className="whitespace-nowrap font-semibold">
                      {fmtRate(row.rate)}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDay(row.contract_start)}</Td>
                    <Td className="whitespace-nowrap">{formatDay(row.contract_end)}</Td>
                    <Td numeric>{periodDays === null ? '—' : periodDays}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDateTimeShort(row.created_at)}
                      {row.created_by_label && (
                        <span className="block text-xs">{row.created_by_label}</span>
                      )}
                    </Td>
                  </tr>
                );
              })
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
    </div>
  );
}
