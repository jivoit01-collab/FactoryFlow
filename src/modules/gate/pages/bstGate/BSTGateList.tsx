import { ArrowRight, Loader2, Truck } from 'lucide-react';

import type { BSTTransferListItem } from '@/modules/warehouse/types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';

interface BSTGateListProps {
  title: string;
  description: string;
  emptyLabel: string;
  transfers: BSTTransferListItem[];
  isLoading: boolean;
  actionLabel: string;
  pendingId: number | null;
  onAction: (id: number) => void;
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function BSTGateList({
  title,
  description,
  emptyLabel,
  transfers,
  isLoading,
  actionLabel,
  pendingId,
  onAction,
}: BSTGateListProps) {
  return (
    <div className="space-y-6">
      <DashboardHeader title={title} description={description} />

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading…</p>
      ) : transfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{emptyLabel}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-3">Entry No.</th>
                <th className="py-2 px-3">Route</th>
                <th className="py-2 px-3">SAP Doc</th>
                <th className="py-2 px-3">Vehicle</th>
                <th className="py-2 px-3">Driver</th>
                <th className="py-2 px-3">Dispatched</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium">{t.entry_no}</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center gap-1">
                      {t.sap_from_warehouse || '—'}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      {t.sap_to_warehouse || '—'}
                    </span>
                  </td>
                  <td className="py-2 px-3">{t.sap_doc_num || '—'}</td>
                  <td className="py-2 px-3">{t.vehicle_number || '—'}</td>
                  <td className="py-2 px-3">{t.driver_name || '—'}</td>
                  <td className="py-2 px-3">{formatDateTime(t.dispatched_at)}</td>
                  <td className="py-2 px-3 text-right">
                    <Button
                      size="sm"
                      className="h-7"
                      onClick={() => onAction(t.id)}
                      disabled={pendingId === t.id}
                    >
                      {pendingId === t.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      {actionLabel}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
