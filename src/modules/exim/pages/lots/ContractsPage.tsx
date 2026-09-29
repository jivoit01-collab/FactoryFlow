/**
 * Contracts: EXIM's Contracts report.
 *
 * The lots still in contract — bought, not loaded yet — soonest to end first,
 * so a contract about to lapse is seen while there is time to load it. EXIM's
 * "expiring soon" tile counted the expired ones too; here they are counted
 * apart, so each tile says one thing.
 */
import { AlertTriangle, CalendarClock, Clock, FileClock, Scale, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
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
import { Input } from '@/shared/components/ui';
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import { useLots } from '../../api';
import { ContractChip, LotLink, MapLink, OilName } from '../../components/lots/LotBits';
import { fmtRate, kgToMt } from '../../components/lots/lotFormat';
import type { LotFilters } from '../../types';
import { daysUntil, fmtKg, fmtQty } from '../../utils';

const IN_CONTRACT: LotFilters = { status: ['IN_CONTRACT'] };

/** EXIM's thresholds: urgent within two days, soon within a week. */
const URGENT_DAYS = 2;
const SOON_DAYS = 7;

const COLUMNS = 9;

export default function ContractsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, isError, error } = useLots(IN_CONTRACT);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const contracts = useMemo(
    () =>
      (data ?? [])
        .filter((lot) => !lot.deleted)
        .map((lot) => ({ lot, days: daysUntil(lot.contract_end) }))
        .sort((a, b) => {
          if (a.days === null && b.days === null) return b.lot.id - a.lot.id;
          if (a.days === null) return 1;
          if (b.days === null) return -1;
          return a.days - b.days;
        }),
    [data],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contracts;
    return contracts.filter(({ lot }) =>
      [lot.item_name, lot.item_code, lot.vendor_name, lot.vendor_code, lot.location, `#${lot.id}`]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [contracts, search]);

  const expired = contracts.filter((c) => c.days !== null && c.days < 0).length;
  const urgent = contracts.filter(
    (c) => c.days !== null && c.days >= 0 && c.days <= URGENT_DAYS,
  ).length;
  const soon = contracts.filter(
    (c) => c.days !== null && c.days >= 0 && c.days <= SOON_DAYS,
  ).length;
  const totalKg = contracts.reduce((sum, c) => sum + Number(c.lot.quantity), 0);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Oil bought on contract and not loaded yet, the soonest to end first."
        icon={FileClock}
        accent="teal"
      />

      <StatTileRow>
        <StatTile
          label="Ending this week"
          value={isLoading ? '—' : soon}
          sub={`within ${SOON_DAYS} days`}
          icon={CalendarClock}
          accent={soon ? 'amber' : 'slate'}
        />
        <StatTile
          label="Urgent"
          value={isLoading ? '—' : urgent}
          sub={`${URGENT_DAYS} days or less left`}
          icon={Clock}
          accent={urgent ? 'orange' : 'slate'}
        />
        <StatTile
          label="Expired"
          value={isLoading ? '—' : expired}
          sub="past the contract's end, not loaded"
          icon={AlertTriangle}
          accent={expired ? 'rose' : 'slate'}
        />
        <StatTile
          label="Under contract"
          value={isLoading ? '—' : fmtQty(kgToMt(totalKg))}
          sub={`MT in ${contracts.length} contract${contracts.length === 1 ? '' : 's'}`}
          icon={Scale}
          accent="indigo"
        />
      </StatTileRow>

      <TableCard
        summary={
          <span>
            {rows.length} contract{rows.length === 1 ? '' : 's'}
            {search ? ` of ${contracts.length}` : ''}
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
              placeholder="Search oil, vendor, location…"
              aria-label="Search the contracts"
              className="h-9 w-60 pl-8"
            />
          </div>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Lot</Th>
              <Th>Oil</Th>
              <Th>Vendor</Th>
              <Th align="right">Quantity (MT)</Th>
              <Th align="right">Rate (₹/kg)</Th>
              <Th>Location</Th>
              <Th>Starts</Th>
              <Th>Ends</Th>
              <Th>Left</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Loading the contracts…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The contracts could not be loaded"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : shown.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={FileClock}
                message={search ? 'No contract matches that search' : 'No lots in contract'}
              />
            ) : (
              shown.map(({ lot, days }) => (
                <tr
                  key={lot.id}
                  className={cn(
                    ROW_CLASSES,
                    'cursor-pointer',
                    days !== null && days <= URGENT_DAYS && 'bg-rose-50/60 dark:bg-rose-500/5',
                  )}
                  onClick={() => navigate(`/exim/lots/${lot.id}`)}
                >
                  <Td>
                    <LotLink id={lot.id} />
                  </Td>
                  <Td>
                    <OilName name={lot.item_name} code={lot.item_code} color={lot.item_color} />
                  </Td>
                  <Td>
                    <span className="block whitespace-nowrap font-medium">
                      {lot.vendor_name || '—'}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {lot.vendor_code}
                    </span>
                  </Td>
                  <Td numeric>
                    <span className="block font-medium">{fmtQty(kgToMt(lot.quantity))}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fmtKg(lot.quantity)} kg
                    </span>
                  </Td>
                  <Td numeric>{fmtRate(lot.rate)}</Td>
                  <Td>
                    {lot.location ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        {lot.location}
                        <MapLink location={lot.location} />
                      </span>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDay(lot.contract_start)}</Td>
                  <Td className="whitespace-nowrap">{formatDay(lot.contract_end)}</Td>
                  <Td>
                    {days === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ContractChip end={lot.contract_end} />
                    )}
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
    </div>
  );
}
