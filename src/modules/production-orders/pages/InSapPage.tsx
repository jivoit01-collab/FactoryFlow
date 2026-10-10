/**
 * Production orders in SAP — every order SAP has, made here or in SAP itself,
 * read straight from SAP. Read only: an order made here opens its entry; one
 * made in SAP is only shown.
 */
import { Database, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  PageHeader,
  ROW_CLASSES,
  StatusPill,
  type StatusTone,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import { type SapOrderRow, type SapOrderStatus, type SapOrderType, useSapOrders } from '../api';
import { StatusTabs } from '../components/StatusTabs';
import { dateLabel, qty, releasedStage } from '../utils/format';

const PAGE_SIZE = 50;

const TABS: { id: SapOrderStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'P', label: 'Planned' },
  { id: 'R', label: 'Released' },
  { id: 'L', label: 'Closed' },
  { id: 'C', label: 'Cancelled' },
];

const TYPES: { id: SapOrderType | ''; label: string }[] = [
  { id: '', label: 'All types' },
  { id: 'S', label: 'Standard' },
  { id: 'P', label: 'Special' },
  { id: 'D', label: 'Disassembly' },
];

const SAP_STATUS_TONE: Record<SapOrderStatus, StatusTone> = {
  P: 'info',
  R: 'progress',
  L: 'done',
  C: 'neutral',
};

/** How much of the components' planned quantity has been issued. */
function issuedLabel(row: SapOrderRow): string {
  const of = Number(row.issued_of);
  if (!of) return '—';
  return `${Math.round((Number(row.issued_quantity) / of) * 100)}%`;
}

export default function InSapPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SapOrderStatus | ''>('');
  const [type, setType] = useState<SapOrderType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debounced = useDebounce(search.trim(), 300);

  const list = useSapOrders({
    status: status || undefined,
    type: type || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: debounced || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const rows = list.data?.results ?? [];
  const count = list.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Any filter change starts again from the first page.
  const filtered =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
    };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production orders in SAP"
        description="Every production order SAP has, made here or in SAP itself. Read only."
        icon={Database}
        accent="emerald"
        backTo="/production-orders"
        backLabel="Production orders"
      />

      <StatusTabs
        tabs={TABS}
        value={status}
        counts={list.data?.status_counts ?? {}}
        onChange={filtered(setStatus)}
        label="SAP order status"
      />

      <TableCard
        summary={
          list.isFetching
            ? 'Loading…'
            : `${count.toLocaleString('en-IN')} ${count === 1 ? 'order' : 'orders'}`
        }
        actions={
          <>
            <NativeSelect
              aria-label="Order type"
              value={type}
              onChange={(event) => filtered(setType)(event.target.value as SapOrderType | '')}
              className="h-9 w-40"
            >
              {TYPES.map((option) => (
                <SelectOption key={option.id || 'all'} value={option.id}>
                  {option.label}
                </SelectOption>
              ))}
            </NativeSelect>
            <Input
              type="date"
              aria-label="Posted from"
              value={dateFrom}
              onChange={(event) => filtered(setDateFrom)(event.target.value)}
              className="h-9 w-40"
            />
            <Input
              type="date"
              aria-label="Posted to"
              value={dateTo}
              onChange={(event) => filtered(setDateTo)(event.target.value)}
              className="h-9 w-40"
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => filtered(setSearch)(event.target.value)}
                placeholder="Item or SAP order no."
                aria-label="Search SAP orders"
                className="h-9 w-56 pl-8"
              />
            </div>
          </>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>SAP order</Th>
              <Th>Type</Th>
              <Th>Product</Th>
              <Th align="right">Planned</Th>
              <Th align="right">Received</Th>
              <Th align="right">Issued</Th>
              <Th>Status</Th>
              <Th>Posted</Th>
              <Th>Made by</Th>
              <Th>Entry here</Th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <TableLoading colSpan={10} />
            ) : list.isError ? (
              <TableEmpty
                colSpan={10}
                message={getErrorMessage(list.error, 'SAP could not be read.')}
              />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={10} message="No orders in SAP match" />
            ) : (
              rows.map((row) => {
                const entry = row.entry;
                return (
                  <tr
                    key={row.doc_entry}
                    className={cn(ROW_CLASSES, entry && 'cursor-pointer')}
                    onClick={
                      entry ? () => navigate(`/production-orders/entries/${entry.id}`) : undefined
                    }
                  >
                    <Td className="font-mono text-xs font-semibold">{row.doc_num}</Td>
                    <Td className="text-muted-foreground">{row.type_label}</Td>
                    <Td>
                      <span className="font-mono text-xs font-semibold">{row.item_code}</span>
                      <span className="block text-muted-foreground">{row.item_name}</span>
                    </Td>
                    <Td numeric className="whitespace-nowrap">
                      {qty(row.planned_quantity)}{' '}
                      <span className="text-xs text-muted-foreground">{row.uom}</span>
                    </Td>
                    <Td numeric>{qty(row.completed_quantity)}</Td>
                    <Td numeric title="Of the components' planned quantity">
                      {issuedLabel(row)}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <StatusPill tone={SAP_STATUS_TONE[row.status] ?? 'neutral'} dot>
                        {row.status_label}
                      </StatusPill>
                      {releasedStage(row) && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {releasedStage(row)}
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{dateLabel(row.posting_date)}</Td>
                    <Td className="whitespace-nowrap">
                      {row.created_by || '—'}
                      {row.sap_user && (
                        <span className="block font-mono text-xs text-muted-foreground">
                          {row.sap_user}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {entry ? (
                        <span className="whitespace-nowrap font-mono text-xs text-primary underline-offset-2 hover:underline">
                          {entry.entry_no}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          Made in SAP
                        </span>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="tabular-nums text-muted-foreground">
            {page + 1} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
