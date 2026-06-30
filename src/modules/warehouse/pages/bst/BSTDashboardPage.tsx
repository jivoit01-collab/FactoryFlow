import { ArrowLeftRight, Plus, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  return new Date(value).toLocaleDateString();
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
            <th className="py-2 px-3">Vehicle</th>
            <th className="py-2 px-3 text-right">Boxes</th>
            <th className="py-2 px-3">Dispatched</th>
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
                  {t.company_code}
                  <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                  {t.to_company_code}
                </span>
              </td>
              <td className="py-2 px-3">{t.sap_doc_num || '—'}</td>
              <td className="py-2 px-3">{t.vehicle_number || '—'}</td>
              <td className="py-2 px-3 text-right">{t.scanned_box_count}</td>
              <td className="py-2 px-3">{formatDate(t.dispatched_at)}</td>
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
  const { data: outgoing = [], isLoading: outLoading } = useBSTTransfers();
  const { data: incoming = [], isLoading: inLoading } = useBSTIncoming();

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
      />

      <Tabs defaultValue="outgoing">
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
