import { ArrowRight, CheckCircle2, FileText, LogOut, RefreshCw, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGlobalDateRange } from '@/core/store/hooks';
import { useBSTGateOutwards } from '@/modules/warehouse/api';
import { formatBstDateTime } from '@/modules/warehouse/pages/bst/bstFormat';
import { BSTStatusBadge } from '@/modules/warehouse/pages/bst/bstStatus';
import type { BSTTransferListItem } from '@/modules/warehouse/types';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';

import { DateRangePicker } from '../../components';

export default function BSTGateOutListPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange, resetDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');

  const queryParams = useMemo(
    () => ({ from_date: dateRange.from, to_date: dateRange.to }),
    [dateRange.from, dateRange.to],
  );
  const { data: transfers = [], isLoading, refetch } = useBSTGateOutwards(queryParams);

  const awaitingCount = transfers.filter((t) => t.status === 'AWAITING_GATE_OUT').length;
  const goneCount = transfers.length - awaitingCount;

  const filteredTransfers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return transfers;
    return transfers.filter((t) =>
      [
        t.entry_no,
        t.sap_doc_num,
        t.sap_from_warehouse,
        t.sap_to_warehouse,
        t.vehicle_number,
        t.driver_name,
        t.status,
      ].some((value) => String(value || '').toLowerCase().includes(query)),
    );
  }, [transfers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">BST Out</h2>
          <p className="text-muted-foreground">
            Branch transfers awaiting vehicle gate-out, plus vehicles gated out in this period
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
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
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Truck className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{isLoading ? '-' : awaitingCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Awaiting Out</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{isLoading ? '-' : goneCount}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Gated Out</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-violet-600" />
              <span className="text-2xl font-bold">{isLoading ? '-' : transfers.length}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <LogOut className="h-4 w-4" />
            BST Gate-Out Entries
          </h3>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search entry, SAP doc, vehicle, driver"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <EmptyState text="Loading branch transfers…" />
        ) : transfers.length === 0 ? (
          <EmptyState icon text="No branch transfers in this date range" />
        ) : filteredTransfers.length === 0 ? (
          <EmptyState text="No branch transfers match this search" />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Entry No.</th>
                    <th className="p-3 font-medium">Route</th>
                    <th className="p-3 font-medium">SAP Doc</th>
                    <th className="p-3 font-medium">Vehicle</th>
                    <th className="p-3 font-medium">Driver</th>
                    <th className="p-3 text-right font-medium">Boxes</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Gate Out</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((t) => (
                    <TransferRow
                      key={t.id}
                      transfer={t}
                      onOpen={() => navigate(`/gate/bst-out/${t.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function TransferRow({
  transfer: t,
  onOpen,
}: {
  transfer: BSTTransferListItem;
  onOpen: () => void;
}) {
  return (
    <tr className="cursor-pointer border-t transition-colors hover:bg-muted/50" onClick={onOpen}>
      <td className="whitespace-nowrap p-3 font-medium">{t.entry_no}</td>
      <td className="whitespace-nowrap p-3">
        <span className="inline-flex items-center gap-1">
          {t.sap_from_warehouse || '—'}
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          {t.sap_to_warehouse || '—'}
        </span>
      </td>
      <td className="whitespace-nowrap p-3">{t.sap_doc_num || '—'}</td>
      <td className="whitespace-nowrap p-3">{t.vehicle_number || '—'}</td>
      <td className="whitespace-nowrap p-3">{t.driver_name || '—'}</td>
      <td className="whitespace-nowrap p-3 text-right">{t.scanned_box_count}</td>
      <td className="whitespace-nowrap p-3">
        <BSTStatusBadge status={t.status} />
      </td>
      <td className="whitespace-nowrap p-3 text-muted-foreground">
        {t.dispatched_at ? formatBstDateTime(t.dispatched_at) : 'Pending'}
      </td>
    </tr>
  );
}

function EmptyState({ text, icon }: { text: string; icon?: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon && <Truck className="mb-2 h-10 w-10 text-muted-foreground" />}
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
