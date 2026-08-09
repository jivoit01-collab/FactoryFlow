import { Search } from 'lucide-react';
import { useState } from 'react';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useBarcodeTrace } from '../api';

export default function BarcodeTraceabilityPage() {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const traceQuery = useBarcodeTrace(submittedSearch, Boolean(submittedSearch));
  const trace = traceQuery.data;

  const submit = () => setSubmittedSearch(search.trim());

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Barcode Traceability"
        description="Search barcode, batch, item, or transfer number across ownership history"
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-md border py-2 pl-9 pr-3"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit();
                }}
                placeholder="Barcode, batch, item code, or transfer number"
                aria-label="Search barcode, batch, item code, or transfer number"
              />
            </div>
            <Button onClick={submit} disabled={!search.trim() || traceQuery.isFetching}>
              {traceQuery.isFetching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {submittedSearch && traceQuery.isFetching && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Searching...
          </CardContent>
        </Card>
      )}

      {submittedSearch && !traceQuery.isFetching && traceQuery.isError && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-rose-600">
            Unable to load traceability for "{submittedSearch}". Please try again.
          </CardContent>
        </Card>
      )}

      {submittedSearch && !traceQuery.isFetching && !traceQuery.isError && !trace && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No record found for "{submittedSearch}".
          </CardContent>
        </Card>
      )}

      {trace && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Barcode', value: trace.barcode },
              { label: 'Current Company', value: trace.current_company || '-' },
              { label: 'Manufacturing Company', value: trace.manufacturing_company || '-' },
              { label: 'Location', value: trace.current_location || '-' },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-semibold">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Movement History</h3>
                <Badge
                  className={
                    trace.dispatch_status === 'DISPATCHED'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }
                >
                  {trace.dispatch_status}
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Transaction</th>
                      <th className="p-2 text-left">From</th>
                      <th className="p-2 text-left">To</th>
                      <th className="p-2 text-left">User</th>
                      <th className="p-2 text-left">Transfer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trace.history.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="p-2">{new Date(row.created_at).toLocaleString()}</td>
                        <td className="p-2">{row.transaction_type}</td>
                        <td className="p-2">{row.from_company_code || '-'}</td>
                        <td className="p-2">{row.to_company_code || '-'}</td>
                        <td className="p-2">{row.user_name || '-'}</td>
                        <td className="p-2 font-mono text-xs">{row.transfer_number || '-'}</td>
                      </tr>
                    ))}
                    {trace.history.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                          No traceability history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
