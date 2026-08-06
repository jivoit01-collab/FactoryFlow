import { Radio, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Card, CardContent } from '@/shared/components/ui';

import { useActivityPage } from '../api';
import { ACTIVITY_KIND_LABELS, ActivityRow } from '../components/ActivityRow';
import type { BarcodeActivityKind } from '../types';

const KIND_OPTIONS = Object.entries(ACTIVITY_KIND_LABELS) as Array<
  [BarcodeActivityKind, string]
>;

export default function ActivityLogPage() {
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [kind, search, dateFrom, dateTo, pageSize]);

  const { data, isLoading, isFetching } = useActivityPage({
    kind: kind || undefined,
    search: search || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    page_size: pageSize,
  });
  const events = data?.results ?? [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Activity Log"
        subtitle="Every barcode event — prints, pallet moves, dispatch scans, and BST transfers"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search barcode, pallet, bill, user..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">All Activity</option>
          {KIND_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="border rounded-md px-3 py-2 text-sm"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="border rounded-md px-3 py-2 text-sm"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No activity found</div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Radio
                className={`h-3.5 w-3.5 text-green-600 ${isFetching ? 'animate-pulse' : ''}`}
              />
              Live — refreshes automatically
            </div>
            <div className="space-y-2">
              {events.map((event, index) => (
                <ActivityRow
                  key={`${event.kind}-${event.at}-${index}`}
                  event={event}
                  showFullDate
                />
              ))}
            </div>
            <PaginationControls
              page={data?.page ?? page}
              pageSize={data?.page_size ?? pageSize}
              total={data?.count ?? 0}
              totalPages={data?.total_pages ?? 1}
              isLoading={isFetching}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
