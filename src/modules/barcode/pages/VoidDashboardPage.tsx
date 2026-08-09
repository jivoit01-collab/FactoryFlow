import { Boxes, Package, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useVoidedBoxes, useVoidedPallets } from '../api';

type Tab = 'pallets' | 'boxes';

const formatDateTime = (value: string) => (value ? new Date(value).toLocaleString() : '-');

export default function VoidDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pallets');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filters = { search: search.trim() || undefined, page, page_size: pageSize };
  const { data: pallets, isLoading: loadingPallets } = useVoidedPallets(
    tab === 'pallets' ? filters : undefined,
  );
  const { data: boxes, isLoading: loadingBoxes } = useVoidedBoxes(
    tab === 'boxes' ? filters : undefined,
  );

  const switchTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  const active = tab === 'pallets' ? pallets : boxes;
  const isLoading = tab === 'pallets' ? loadingPallets : loadingBoxes;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Void"
        description="Voided pallets and boxes with full audit trail"
        primaryAction={{
          label: 'Void Box / Pallet',
          icon: <XCircle className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/barcode/void/new'),
        }}
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={tab === 'pallets' ? 'default' : 'outline'}
                onClick={() => switchTab('pallets')}
              >
                <Package className="h-4 w-4 mr-1" /> Pallets
              </Button>
              <Button
                size="sm"
                variant={tab === 'boxes' ? 'default' : 'outline'}
                onClick={() => switchTab('boxes')}
              >
                <Boxes className="h-4 w-4 mr-1" /> Boxes
              </Button>
            </div>
            <input
              className="flex-1 min-w-[240px] border rounded px-3 py-2 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                tab === 'pallets'
                  ? 'Search by pallet ID, item, or batch...'
                  : 'Search by barcode, item, or batch...'
              }
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">
                    {tab === 'pallets' ? 'Pallet ID' : 'Barcode'}
                  </th>
                  <th className="text-left p-2 font-medium">Item</th>
                  <th className="text-left p-2 font-medium">Batch</th>
                  <th className="text-right p-2 font-medium">
                    {tab === 'pallets' ? 'Boxes / Qty' : 'Qty'}
                  </th>
                  <th className="text-left p-2 font-medium">Warehouse</th>
                  <th className="text-left p-2 font-medium">Voided By</th>
                  <th className="text-left p-2 font-medium">Voided At</th>
                  <th className="text-left p-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {tab === 'pallets' &&
                  pallets?.results.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/barcode/pallets/${row.pallet_id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/barcode/pallets/${row.pallet_id}`);
                        }
                      }}
                    >
                      <td className="p-2 font-mono text-xs">{row.pallet_code}</td>
                      <td className="p-2">
                        <div className="font-medium">{row.item_code}</div>
                        <div className="text-xs text-muted-foreground">{row.item_name}</div>
                      </td>
                      <td className="p-2 text-xs">{row.batch_number}</td>
                      <td className="p-2 text-right">
                        {row.box_count} · {row.total_qty} {row.uom}
                      </td>
                      <td className="p-2">{row.warehouse || '-'}</td>
                      <td className="p-2">{row.voided_by_name || '-'}</td>
                      <td className="p-2 text-xs">{formatDateTime(row.voided_at)}</td>
                      <td className="p-2 text-xs text-muted-foreground">{row.reason || '-'}</td>
                    </tr>
                  ))}
                {tab === 'boxes' &&
                  boxes?.results.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/barcode/boxes/${row.box_id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/barcode/boxes/${row.box_id}`);
                        }
                      }}
                    >
                      <td className="p-2 font-mono text-xs">{row.box_barcode}</td>
                      <td className="p-2">
                        <div className="font-medium">{row.item_code}</div>
                        <div className="text-xs text-muted-foreground">{row.item_name}</div>
                      </td>
                      <td className="p-2 text-xs">{row.batch_number}</td>
                      <td className="p-2 text-right">
                        {row.qty} {row.uom}
                      </td>
                      <td className="p-2">{row.warehouse || '-'}</td>
                      <td className="p-2">{row.voided_by_name || '-'}</td>
                      <td className="p-2 text-xs">{formatDateTime(row.voided_at)}</td>
                      <td className="p-2 text-xs text-muted-foreground">{row.reason || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!isLoading && (active?.results.length ?? 0) === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">
                No voided {tab} found
              </p>
            )}
            {isLoading && (
              <p className="text-muted-foreground text-sm text-center py-8">Loading...</p>
            )}
          </div>

          {active && active.count > 0 && (
            <div className="mt-4">
              <PaginationControls
                page={active.page}
                pageSize={active.page_size}
                total={active.count}
                totalPages={active.total_pages}
                isLoading={isLoading}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
