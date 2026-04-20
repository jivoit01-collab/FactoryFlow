import { useState } from 'react';
import { Search } from 'lucide-react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Badge } from '@/shared/components/ui';

import { usePrintHistory } from '../api';

const TYPE_COLORS = {
  BOX: 'bg-blue-100 text-blue-800',
  PALLET: 'bg-purple-100 text-purple-800',
  BIN: 'bg-gray-100 text-gray-800',
  WAREHOUSE: 'bg-gray-100 text-gray-800',
};

const PRINT_COLORS = {
  ORIGINAL: 'bg-green-100 text-green-800',
  REPRINT: 'bg-amber-100 text-amber-800',
};

export default function PrintHistoryPage() {
  const [labelTypeFilter, setLabelTypeFilter] = useState('');
  const [printTypeFilter, setPrintTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = usePrintHistory({
    label_type: labelTypeFilter || undefined,
    print_type: printTypeFilter || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <DashboardHeader title="Print History" subtitle="Audit trail for all label prints and reprints" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by barcode..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm" value={labelTypeFilter} onChange={(e) => setLabelTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="BOX">Box</option>
          <option value="PALLET">Pallet</option>
        </select>
        <select className="border rounded-md px-3 py-2 text-sm" value={printTypeFilter} onChange={(e) => setPrintTypeFilter(e.target.value)}>
          <option value="">All Prints</option>
          <option value="ORIGINAL">Original</option>
          <option value="REPRINT">Reprint</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No print history found</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Label Type</th>
                    <th className="text-left p-3 font-medium">Barcode</th>
                    <th className="text-left p-3 font-medium">Print Type</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Printed By</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Badge className={TYPE_COLORS[log.label_type] || 'bg-gray-100'}>{log.label_type}</Badge>
                      </td>
                      <td className="p-3 font-mono text-xs">{log.reference_code}</td>
                      <td className="p-3">
                        <Badge className={PRINT_COLORS[log.print_type] || 'bg-gray-100'}>{log.print_type}</Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.reprint_reason || '—'}
                      </td>
                      <td className="p-3 text-xs">{log.printed_by_name || '—'}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(log.printed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
