import { ArrowRightLeft, Inbox, Plus, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';

import {
  useInTransitTransferRequests,
  usePendingTransferRequests,
  useTransferRequests,
} from '../../api';
import type { TransferRequestListItem } from '../../types';
import { ApprovalBadge, PostingBadge, Route, RouteBadge } from './TransferBadges';
import { shortDate } from './transferFormat';

type Tab = 'all' | 'pending' | 'in-transit';

export default function TransferRequestListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [tab, setTab] = useState<Tab>('all');

  const canApprove = hasPermission(WAREHOUSE_PERMISSIONS.APPROVE_TRANSFER_REQUEST);
  const canCreate = hasPermission(WAREHOUSE_PERMISSIONS.CREATE_TRANSFER_REQUEST);

  const all = useTransferRequests();
  // Only fetch the approval queue for someone who can act on it.
  const pending = usePendingTransferRequests(canApprove);
  const inTransit = useInTransitTransferRequests();

  const active =
    tab === 'pending' ? pending : tab === 'in-transit' ? inTransit : all;
  const rows: TransferRequestListItem[] = active.data ?? [];

  const tabs: { key: Tab; label: string; icon: typeof Inbox; count?: number; show: boolean }[] = [
    { key: 'all', label: 'All requests', icon: ArrowRightLeft, count: all.data?.length, show: true },
    {
      key: 'pending',
      label: 'Awaiting my decision',
      icon: Inbox,
      count: pending.data?.length,
      show: canApprove,
    },
    {
      key: 'in-transit',
      label: 'In transit',
      icon: Truck,
      count: inTransit.data?.length,
      show: true,
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Transfer Requests"
        description="Ask another warehouse for stock, and approve what they ask of you"
      >
        {canCreate && (
          <Button onClick={() => navigate('/warehouse/transfer-requests/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Raise a request
          </Button>
        )}
      </DashboardHeader>

      <div className="flex flex-wrap gap-2">
        {tabs
          .filter((t) => t.show)
          .map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {typeof t.count === 'number' && (
                  <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {tab === 'in-transit' && rows.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          These moves cross SAP branches, so the stock is sitting in an in-transit
          warehouse. It only lands at the destination once the receiving side finishes
          the BST receipt.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {active.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading requests…</p>
          ) : active.isError ? (
            <p className="p-6 text-sm text-red-600">
              Could not load transfer requests. Try again in a moment.
            </p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {tab === 'pending'
                ? 'Nothing is waiting on your decision.'
                : tab === 'in-transit'
                  ? 'No stock is sitting in transit.'
                  : 'No transfer requests yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Entry</th>
                    <th className="px-4 py-3 text-left font-medium">Route</th>
                    <th className="px-4 py-3 text-left font-medium">Approval</th>
                    <th className="px-4 py-3 text-left font-medium">Stock</th>
                    <th className="px-4 py-3 text-right font-medium">Items</th>
                    <th className="px-4 py-3 text-left font-medium">Raised by</th>
                    <th className="px-4 py-3 text-left font-medium">Raised</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/warehouse/transfer-requests/${row.id}`)}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.entry_no}</div>
                        {row.sap_transfer_doc_num && (
                          <div className="text-xs text-muted-foreground tabular-nums">
                            SAP {row.sap_transfer_doc_num}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Route from={row.from_warehouse} to={row.to_warehouse} />
                          <RouteBadge routeType={row.route_type} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ApprovalBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PostingBadge
                          status={row.posting_status}
                          intransitWarehouse={row.intransit_warehouse}
                        />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.line_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.requested_by_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {shortDate(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
