import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { formatDateTimeShort, formatNumber } from '@/shared/utils';

import { useMovements } from '../api';
import type { MovementStatus, MovementType, WarehouseMovement } from '../types';

const TYPE_LABEL: Record<MovementType, string> = {
  GRPO_RECEIPT: 'GRPO Receipt',
  TRANSFER_REQUEST: 'Transfer Request',
  TRANSFER: 'Stock Transfer',
  BOM_ISSUE: 'BOM Issue',
  FG_RECEIPT: 'FG Receipt',
};

const STATUS_STYLE: Record<MovementStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  DRY_RUN: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  POSTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  FAILED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

const STATUS_FILTERS: (MovementStatus | 'ALL')[] = ['ALL', 'DRY_RUN', 'POSTED', 'FAILED'];

function MovementRow({ m }: { m: WarehouseMovement }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-t hover:bg-muted/30">
        <td className="px-3 py-2">
          <button
            className="flex items-center gap-1 text-left"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {TYPE_LABEL[m.movement_type]}
          </button>
        </td>
        <td className="px-3 py-2">
          {m.from_whs_code || '—'} → {m.to_whs_code || '—'}
        </td>
        <td className="px-3 py-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[m.status]}`}
          >
            {m.status}
          </span>
        </td>
        <td className="px-3 py-2 tabular-nums">
          {m.sap_doc_num || (m.sap_doc_entry ? `#${m.sap_doc_entry}` : '—')}
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {formatDateTimeShort(m.created_at)}
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="px-6 py-2">
            {m.error_message && (
              <p className="mb-2 text-sm text-rose-600">{m.error_message}</p>
            )}
            {m.itr_doc_entry && (
              <p className="mb-2 text-xs text-muted-foreground">
                Based on Inventory Transfer Request #{m.itr_doc_entry}
              </p>
            )}
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1">Item</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1">UoM</th>
                </tr>
              </thead>
              <tbody>
                {m.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-0.5">
                      {l.item_code}{' '}
                      <span className="text-muted-foreground">{l.item_name}</span>
                    </td>
                    <td className="py-0.5 text-right tabular-nums">
                      {formatNumber(Number(l.quantity), 2)}
                    </td>
                    <td className="py-0.5">{l.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export default function MovementLedgerPage() {
  const [statusFilter, setStatusFilter] = useState<MovementStatus | 'ALL'>('ALL');
  const { data, isLoading, refetch, isFetching } = useMovements(
    statusFilter === 'ALL' ? {} : { status: statusFilter },
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Movement Ledger"
        description="Every production material movement the wrapper has performed, mirroring its SAP document."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'ALL' ? 'All' : s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading ledger…
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No movements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">SAP Doc</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((m) => <MovementRow key={m.id} m={m} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
