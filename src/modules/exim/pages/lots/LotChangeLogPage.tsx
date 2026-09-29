/**
 * The change log: EXIM's Stock Updation Logs.
 *
 * Every change to every lot, newest first: who made it, when, and each field
 * from its old value to its new, or a new lot's first values. The server pages
 * it and filters it by lot, by kind of change and by who made it; the lot
 * filter lives in the URL, so a lot's page can link straight to its entries.
 */
import { AlertTriangle, History } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  FilterBar,
  FilterField,
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
import { Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useLotChanges } from '../../api';
import { ChangeLines, LotLink } from '../../components/lots/LotBits';

type ActionFilter = '' | 'CREATE' | 'UPDATE';

const COLUMNS = 5;

export default function LotChangeLogPage() {
  const { hasPermission } = usePermission();
  const canOpenLot = hasPermission(EXIM_PERMISSIONS.LOT_VIEW);
  const [searchParams, setSearchParams] = useSearchParams();

  const [lot, setLot] = useState(searchParams.get('lot') ?? '');
  const [who, setWho] = useState('');
  const [action, setAction] = useState<ActionFilter>('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const lotTerm = useDebounce(lot.trim());
  const whoTerm = useDebounce(who.trim());
  const lotValid = !lotTerm || /^\d+$/.test(lotTerm);

  const { data, isLoading, isFetching, isError, error } = useLotChanges({
    lot: lotTerm && lotValid ? Number(lotTerm) : undefined,
    action: action || undefined,
    changed_by: whoTerm || undefined,
    since: since || undefined,
    until: until || undefined,
    page,
    page_size: pageSize,
  });

  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const filtered = !!(lot.trim() || who.trim() || action || since || until);

  function setLotFilter(value: string) {
    setLot(value);
    setPage(1);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (/^\d+$/.test(value.trim())) next.set('lot', value.trim());
        else next.delete('lot');
        return next;
      },
      { replace: true },
    );
  }

  function reset() {
    setLotFilter('');
    setWho('');
    setAction('');
    setSince('');
    setUntil('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Log"
        description="Every change made to every oil lot: who made it, when, and what it changed."
        icon={History}
        accent="teal"
      />

      <FilterBar
        isFetching={isFetching && !isLoading}
        activeCount={[lot.trim(), who.trim(), action, since || until].filter(Boolean).length}
        onReset={filtered ? reset : undefined}
      >
        <FilterField
          label="Lot"
          htmlFor="changes-lot"
          hint={lotValid ? undefined : 'A lot number is digits only.'}
        >
          <Input
            id="changes-lot"
            inputMode="numeric"
            value={lot}
            onChange={(event) => setLotFilter(event.target.value)}
            placeholder="Any lot"
            className="h-9 w-full sm:w-32"
          />
        </FilterField>
        <FilterField label="Kind" htmlFor="changes-action">
          <NativeSelect
            id="changes-action"
            value={action}
            onChange={(event) => {
              setAction(event.target.value as ActionFilter);
              setPage(1);
            }}
            className="w-full sm:w-44"
          >
            <SelectOption value="">Every change</SelectOption>
            <SelectOption value="CREATE">Lots entered</SelectOption>
            <SelectOption value="UPDATE">Lots changed</SelectOption>
          </NativeSelect>
        </FilterField>
        <FilterField label="Made by" htmlFor="changes-who">
          <Input
            id="changes-who"
            value={who}
            onChange={(event) => {
              setWho(event.target.value);
              setPage(1);
            }}
            placeholder="Name or email"
            className="h-9 w-full sm:w-56"
          />
        </FilterField>
        <FilterField label="From" htmlFor="changes-since">
          <Input
            id="changes-since"
            type="date"
            value={since}
            max={until || undefined}
            onChange={(event) => {
              setSince(event.target.value);
              setPage(1);
            }}
            className="h-9 w-full sm:w-40"
          />
        </FilterField>
        <FilterField label="To" htmlFor="changes-until">
          <Input
            id="changes-until"
            type="date"
            value={until}
            min={since || undefined}
            onChange={(event) => {
              setUntil(event.target.value);
              setPage(1);
            }}
            className="h-9 w-full sm:w-40"
          />
        </FilterField>
      </FilterBar>

      <TableCard
        summary={
          <span>
            {count.toLocaleString('en-IN')} change{count === 1 ? '' : 's'}
            {isFetching && !isLoading ? ' · refreshing…' : ''}
          </span>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>When</Th>
              <Th>Lot</Th>
              <Th>Kind</Th>
              <Th>By</Th>
              <Th>What changed</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Loading the changes…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The change log could not be loaded"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : !data || data.results.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={History}
                message={filtered ? 'No change matches these filters' : 'No changes recorded yet'}
                hint={filtered ? undefined : 'Changes to the lots appear here as they are made.'}
              />
            ) : (
              data.results.map((change) => (
                <tr key={change.id} className={cn(ROW_CLASSES, 'align-top')}>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDateTimeShort(change.timestamp)}
                  </Td>
                  <Td>
                    <LotLink id={change.lot} canOpen={canOpenLot} />
                  </Td>
                  <Td>
                    <StatusPill tone={change.action === 'CREATE' ? 'done' : 'info'}>
                      {change.action === 'CREATE' ? 'Entered' : 'Changed'}
                    </StatusPill>
                  </Td>
                  <Td className="whitespace-nowrap">{change.changed_by_name ?? '—'}</Td>
                  <Td className="min-w-72">
                    {change.note && (
                      <p className="mb-1 text-sm text-muted-foreground first-letter:uppercase">
                        {change.note}
                      </p>
                    )}
                    <ChangeLines change={change} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {count > pageSize && (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={count}
            totalPages={totalPages}
            isLoading={isFetching}
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
