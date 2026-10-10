/**
 * Production entries — what was made, and how far each SAP production order
 * has got (plan, release, issue, receipt, close). Newest first, by status.
 */
import { Database, Factory, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PRODUCTION_ORDERS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
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
} from '@/shared/components/page';
import { Button, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { type EntryStatus, useEntries } from '../api';
import { StatusTabs } from '../components/StatusTabs';
import { boxesLabel, dateLabel, STATUS_TONE, STEP_LABEL } from '../utils/format';

const TABS: { id: EntryStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'DRAFT', label: 'Drafts' },
  { id: 'PLANNED', label: 'Planned' },
  { id: 'RELEASED', label: 'Released' },
  { id: 'ISSUED', label: 'Issued' },
  { id: 'RECEIVED', label: 'FG created' },
  { id: 'CLOSED', label: 'Closed' },
];

export default function EntriesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(PRODUCTION_ORDERS_PERMISSIONS.CREATE);
  const [status, setStatus] = useState<EntryStatus | ''>('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounced = useDebounce(search.trim(), 300);

  const list = useEntries({
    status: status || undefined,
    search: debounced || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    limit: 200,
  });
  const rows = list.data?.results ?? [];
  const counts = list.data?.status_counts ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Production orders" icon={Factory} accent="emerald">
        <Button variant="outline" onClick={() => navigate('/production-orders/in-sap')}>
          <Database className="mr-2 h-4 w-4" />
          Orders in SAP
        </Button>
        {canCreate && (
          <Button onClick={() => navigate('/production-orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New FG entry
          </Button>
        )}
      </PageHeader>

      <StatusTabs
        tabs={TABS}
        value={status}
        counts={counts}
        onChange={setStatus}
        label="Entry status"
      />

      <TableCard
        summary={
          list.isFetching && !list.isLoading ? 'Loading…' : `${list.data?.count ?? 0} entries`
        }
        actions={
          <>
            <Input
              type="date"
              aria-label="Posted from"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-9 w-40"
            />
            <Input
              type="date"
              aria-label="Posted to"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-9 w-40"
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Item, batch or SAP no."
                aria-label="Search entries"
                className="h-9 w-56 pl-8"
              />
            </div>
          </>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Entry</Th>
              <Th>Product</Th>
              <Th align="right">Made</Th>
              <Th>Batch</Th>
              <Th>Status</Th>
              <Th>Next step</Th>
              <Th align="right">SAP order</Th>
              <Th>Posting date</Th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <TableLoading colSpan={8} />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={8} message="No entries here" />
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(ROW_CLASSES, 'cursor-pointer')}
                  onClick={() => navigate(`/production-orders/entries/${row.id}`)}
                >
                  <Td className="font-mono text-xs">{row.entry_no}</Td>
                  <Td>
                    <span className="font-mono text-xs font-semibold">{row.item_code}</span>
                    <span className="block text-muted-foreground">{row.item_name}</span>
                  </Td>
                  <Td numeric>{boxesLabel(row.boxes, row.loose_pieces)}</Td>
                  <Td className="font-mono text-xs">{row.batch_number || '—'}</Td>
                  <Td>
                    <StatusPill tone={STATUS_TONE[row.status]} dot>
                      {row.status_label}
                    </StatusPill>
                  </Td>
                  <Td className="text-muted-foreground">
                    {row.next_step ? STEP_LABEL[row.next_step] : '—'}
                  </Td>
                  <Td numeric className="font-mono text-xs">
                    {row.sap_order_num ?? '—'}
                  </Td>
                  <Td>{dateLabel(row.posting_date)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
