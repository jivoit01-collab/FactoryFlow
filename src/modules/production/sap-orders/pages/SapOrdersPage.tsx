/**
 * SAP Production Orders — every order in SAP with how much has been issued to
 * it and received from it.
 *
 * Ported from SAP Portal's Production page. Where the run screens start from a
 * production run, this starts from SAP's own orders: planned, released, closed
 * or cancelled. An order opens to its components and the issue / receipt /
 * close actions. "New order" shows only with the create right, the one the
 * endpoint checks.
 */
import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
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
} from '@/shared/components/page';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import type { SapOrderStatus } from '../api/sapOrders.api';
import { useSapOrders } from '../api/sapOrders.queries';
import { CreateOrderDialog } from '../components/CreateOrderDialog';
import { percent, qty, sapDate, STATUS_TONE } from '../utils/format';

const PAGE_SIZE = 50;

const STATUSES: { value: SapOrderStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'P', label: 'Planned' },
  { value: 'R', label: 'Released' },
  { value: 'L', label: 'Closed' },
  { value: 'C', label: 'Cancelled' },
];

function Progress({ done, planned, label }: { done: number; planned: number; label: string }) {
  const value = percent(done, planned);
  return (
    <div className="min-w-[110px]" title={`${label}: ${qty(done)} of ${qty(planned)}`}>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{qty(done)}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function SapOrdersPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(EXECUTION_PERMISSIONS.CREATE_SAP_ORDERS);
  const [status, setStatus] = useState<SapOrderStatus | ''>('R');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const needle = search.trim().length >= 2 ? search.trim() : '';
  const query = useSapOrders({ status, search: needle, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const orders = query.data?.results ?? [];
  const count = query.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader title="SAP Production Orders">
        <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching} aria-label="Reload orders from SAP">
          <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New order
          </Button>
        )}
      </PageHeader>

      <FilterBar
        isFetching={query.isFetching}
        activeCount={[status !== 'R', !!needle].filter(Boolean).length}
        onReset={() => {
          setStatus('R');
          setSearch('');
          setPage(0);
        }}
      >
        <FilterField label="Status" htmlFor="sap-orders-status">
          <NativeSelect
            id="sap-orders-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SapOrderStatus | '');
              setPage(0);
            }}
            className="h-9 w-44"
          >
            {STATUSES.map((s) => (
              <SelectOption key={s.value} value={s.value}>
                {s.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Search" htmlFor="sap-orders-search">
          <Input
            id="sap-orders-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Item code, name or order no."
            className="h-9 w-64"
          />
        </FilterField>
      </FilterBar>

      <TableCard
        summary={`${count.toLocaleString('en-IN')} ${count === 1 ? 'order' : 'orders'}`}
        actions={
          pages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="tabular-nums text-muted-foreground">
                {page + 1} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Order</Th>
              <Th>Item</Th>
              <Th align="right">Planned</Th>
              <Th>Issued</Th>
              <Th>Received</Th>
              <Th>Status</Th>
              <Th>Due</Th>
              <Th>Warehouse</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <TableLoading colSpan={8} />
            ) : orders.length === 0 ? (
              <TableEmpty colSpan={8} message={query.isError ? 'SAP could not be read' : 'No orders match'} />
            ) : (
              orders.map((order) => (
                <tr
                  key={order.doc_entry}
                  className={`${ROW_CLASSES} cursor-pointer`}
                  onClick={() => navigate(`/production/sap-orders/${order.doc_entry}`)}
                >
                  <Td numeric className="font-medium">
                    {order.doc_num ?? order.doc_entry}
                  </Td>
                  <Td>
                    <div className="font-medium">{order.item_code}</div>
                    <div className="text-xs text-muted-foreground">{order.item_name}</div>
                  </Td>
                  <Td numeric>
                    {qty(order.planned_quantity)} {order.uom}
                  </Td>
                  <Td>
                    {/* Components are in mixed units (kg, pieces, hours), so a
                        total against the product's plan means nothing; the
                        order page shows each line against its own plan. */}
                    <StatusPill tone={order.issued_quantity > 0 ? 'progress' : 'neutral'}>
                      {order.issued_quantity > 0 ? 'Started' : 'Not yet'}
                    </StatusPill>
                  </Td>
                  <Td>
                    <Progress done={order.received_quantity} planned={order.planned_quantity} label="Received" />
                  </Td>
                  <Td>
                    <StatusPill tone={STATUS_TONE[order.status]} dot>
                      {order.status_label}
                    </StatusPill>
                  </Td>
                  <Td>{sapDate(order.due_date)}</Td>
                  <Td>{order.warehouse || '-'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <CreateOrderDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
