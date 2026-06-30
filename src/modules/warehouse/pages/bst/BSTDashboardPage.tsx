import { ArrowLeftRight, Plus, Truck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import { useBSTIncoming, useBSTTransfers } from '../../api';
import type { BSTTransferListItem } from '../../types';
import { BSTStatusBadge } from './bstStatus';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function TransferTable({
  transfers,
  emptyLabel,
  onRowClick,
}: {
  transfers: BSTTransferListItem[];
  emptyLabel: string;
  onRowClick: (t: BSTTransferListItem) => void;
}) {
  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Truck className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 px-3">Entry No.</th>
            <th className="py-2 px-3">Route</th>
            <th className="py-2 px-3">SAP Doc</th>
            <th className="py-2 px-3 text-right">Boxes</th>
            <th className="py-2 px-3">Dispatched</th>
            <th className="py-2 px-3">Received</th>
            <th className="py-2 px-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => (
            <tr
              key={t.id}
              className="border-b hover:bg-muted/50 cursor-pointer"
              onClick={() => onRowClick(t)}
            >
              <td className="py-2 px-3 font-medium">{t.entry_no}</td>
              <td className="py-2 px-3">
                <span className="inline-flex items-center gap-1">
                  {t.sap_from_warehouse || '—'}
                  <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                  {t.sap_to_warehouse || '—'}
                </span>
              </td>
              <td className="py-2 px-3">{t.sap_doc_num || '—'}</td>
              <td className="py-2 px-3 text-right">{t.scanned_box_count}</td>
              <td className="py-2 px-3">{formatDate(t.dispatched_at)}</td>
              <td className="py-2 px-3">{formatDate(t.received_at)}</td>
              <td className="py-2 px-3">
                <BSTStatusBadge status={t.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BSTDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dateRange, dateRangeAsDateObjects, setDateRange, resetDateRange } = useGlobalDateRange();
  const dateParams = { from_date: dateRange.from, to_date: dateRange.to };
  const { data: outgoing = [], isLoading: outLoading } = useBSTTransfers(dateParams);
  const { data: incoming = [], isLoading: inLoading } = useBSTIncoming(dateParams);

  const activeTab = searchParams.get('tab') === 'incoming' ? 'incoming' : 'outgoing';

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Branch Stock Transfer"
        description="Move stock between branches — dispatch and receive"
        primaryAction={{
          label: 'New BST',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/warehouse/bst/new'),
        }}
      >
        <DateRangePicker
          date={dateRangeAsDateObjects}
          className="w-full sm:w-[300px]"
          onDateChange={(date) => {
            if (date && 'from' in date) {
              setDateRange(date);
            } else {
              resetDateRange();
            }
          }}
        />
      </DashboardHeader>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams(v === 'incoming' ? { tab: 'incoming' } : {})}
      >
        <TabsList>
          <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          <TabsTrigger value="incoming">
            Incoming{incoming.length ? ` (${incoming.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outgoing" className="mt-4">
          {outLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading…</p>
          ) : (
            <TransferTable
              transfers={outgoing}
              emptyLabel="No outgoing transfers yet"
              onRowClick={(t) => navigate(`/warehouse/bst/${t.id}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-4">
          {inLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading…</p>
          ) : (
            <TransferTable
              transfers={incoming}
              emptyLabel="No incoming transfers expected"
              onRowClick={(t) => navigate(`/warehouse/bst/incoming/${t.id}`)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
