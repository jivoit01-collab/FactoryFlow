import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDebounce } from '@/shared/hooks';

import { useFGPendingGRPOEntries } from '../api/fgGrpo.queries';

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

export default function FGPendingEntriesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError } = useFGPendingGRPOEntries({
    search: debouncedSearch || undefined,
  });

  const entries = data?.results ?? [];

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Finished Goods GRPO</h2>
          <p className="text-sm text-muted-foreground">
            Completed finished-goods gate entries awaiting GRPO posting to SAP.
          </p>
        </div>
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-64"
          placeholder="Search entry / supplier / PO…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      ) : isError ? (
        <div className="p-8 text-center text-red-600">Failed to load pending FG entries.</div>
      ) : entries.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-md border text-muted-foreground">
          <p className="text-lg">No finished-goods entries pending GRPO</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Entry No.</th>
                <th className="p-3 text-left font-medium">Supplier(s)</th>
                <th className="p-3 text-right font-medium">Pending / Total POs</th>
                <th className="p-3 text-left font-medium">PO Date</th>
                <th className="p-3 text-left font-medium">Entry Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.vehicle_entry_id}
                  className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                  onClick={() =>
                    navigate(`/warehouse/grpo/fg/preview/${entry.vehicle_entry_id}`)
                  }
                >
                  <td className="p-3 font-medium whitespace-nowrap">{entry.entry_no}</td>
                  <td className="p-3">
                    {entry.suppliers && entry.suppliers.length > 0
                      ? entry.suppliers.map((s) => s.supplier_name).join(', ')
                      : '-'}
                  </td>
                  <td className="p-3 text-right">
                    {entry.pending_po_count} / {entry.total_po_count}
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(entry.po_date)}</td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.entry_time)}
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
