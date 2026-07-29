import { ArrowRight, Info, RefreshCw, Search, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { formatNumber } from '@/shared/utils';

import {
  useCreateTransfer,
  useTransferOptions,
  useWarehouseStock,
} from '../api';
import type { TransferLineInput } from '../types';

export default function ProductionTransferPage() {
  const optionsQuery = useTransferOptions();
  const options = optionsQuery.data;

  const [source, setSource] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [qty, setQty] = useState<Record<string, string>>({});

  const selectedSource = options?.sources.find((s) => s.whs_code === source);

  const stockQuery = useWarehouseStock(
    source,
    { pm_only: true, stock_filter: 'with_stock', page_size: 500, search: debouncedSearch },
    Boolean(source),
  );

  const createTransfer = useCreateTransfer();

  const lines: TransferLineInput[] = useMemo(() => {
    const items = stockQuery.data?.items ?? [];
    return items
      .map((it) => ({
        item_code: it.item_code,
        item_name: it.item_name,
        uom: it.uom,
        quantity: qty[it.item_code] ?? '',
      }))
      .filter((l) => Number(l.quantity) > 0);
  }, [stockQuery.data, qty]);

  const totalQty = lines.reduce((sum, l) => sum + Number(l.quantity), 0);

  const resetForSource = (whs: string) => {
    setSource(whs);
    setQty({});
    setSearch('');
  };

  const handleSubmit = () => {
    if (!source || lines.length === 0) return;
    createTransfer.mutate(
      { from_whs: source, lines, reference: 'wrapper-ui' },
      {
        onSuccess: (res) => {
          const posted = res.dry_run ? 'recorded (dry-run, not posted to SAP)' : 'posted to SAP';
          const steps = res.movements.map((m) => m.movement_type).join(' + ');
          toast.success(
            `Transfer ${posted}: ${res.from_whs} → ${res.to_whs} (${steps})`,
          );
          setQty({});
        },
        onError: (err) => {
          toast.error((err as unknown as ApiError)?.message || 'Transfer failed.');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Move Packaging Material"
        description="Transfer PM from a store into the production issue point. Handles the SAP transfer-request step automatically."
      />

      {options && !options.sap_writes_enabled && (
        <Card className="border-sky-300 bg-sky-50 dark:bg-sky-950/30">
          <CardContent className="flex items-center gap-3 py-3 text-sm">
            <Info className="h-4 w-4 text-sky-600" />
            <span>
              <strong>Dry-run mode.</strong> Movements are recorded to the ledger but not
              posted to SAP until writes are enabled.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Source picker */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          1. Source store
          {options?.issue_point && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal">
              (into <ArrowRight className="h-3 w-3" /> {options.issue_point})
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {optionsQuery.isLoading && (
            <span className="text-sm text-muted-foreground">Loading…</span>
          )}
          {options?.sources.length === 0 && (
            <span className="text-sm text-muted-foreground">
              No source stores configured for this company.
            </span>
          )}
          {options?.sources.map((s) => (
            <Button
              key={s.whs_code}
              variant={source === s.whs_code ? 'default' : 'outline'}
              size="sm"
              onClick={() => resetForSource(s.whs_code)}
            >
              {s.whs_code}
              {s.needs_transfer_request && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  via request
                </Badge>
              )}
            </Button>
          ))}
        </div>
        {selectedSource?.needs_transfer_request && (
          <p className="text-xs text-muted-foreground">
            {selectedSource.whs_code} → {options?.issue_point} posts an Inventory Transfer
            Request first, then the stock transfer based on it.
          </p>
        )}
      </div>

      {/* Item table */}
      {source && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              2. Set quantities to move
            </p>
            <div className="relative w-64 max-w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search item…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {stockQuery.isLoading && (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading {source} stock…
            </div>
          )}

          {stockQuery.data && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">UoM</th>
                    <th className="px-3 py-2 text-right">On-hand</th>
                    <th className="px-3 py-2 text-right">Available</th>
                    <th className="px-3 py-2 text-right">Move qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stockQuery.data.items.map((it) => {
                    const val = qty[it.item_code] ?? '';
                    const over = Number(val) > it.available;
                    return (
                      <tr key={it.item_code} className="border-t">
                        <td className="px-3 py-1.5">
                          <div className="font-medium">{it.item_code}</div>
                          <div className="text-xs text-muted-foreground">{it.item_name}</div>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{it.uom}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatNumber(it.on_hand, 0)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatNumber(it.available, 0)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <Input
                            type="number"
                            min={0}
                            value={val}
                            onChange={(e) =>
                              setQty((q) => ({ ...q, [it.item_code]: e.target.value }))
                            }
                            className={`ml-auto h-8 w-28 text-right ${
                              over ? 'border-rose-400' : ''
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {stockQuery.data.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        No PM stock in {source}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submit bar */}
      {source && (
        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-background/95 py-3 backdrop-blur">
          <span className="text-sm text-muted-foreground">
            {lines.length} item(s), {formatNumber(totalQty, 0)} total
          </span>
          <Button
            onClick={handleSubmit}
            disabled={lines.length === 0 || createTransfer.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {createTransfer.isPending
              ? 'Submitting…'
              : options?.sap_writes_enabled
                ? `Transfer to ${options?.issue_point}`
                : 'Record transfer (dry-run)'}
          </Button>
        </div>
      )}
    </div>
  );
}
