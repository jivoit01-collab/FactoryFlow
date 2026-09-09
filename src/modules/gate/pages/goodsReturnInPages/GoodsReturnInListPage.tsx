import {
  CheckCircle2,
  History,
  Loader2,
  LogIn,
  RefreshCw,
  Search,
  Truck,
  Undo2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DriverSelect, VehicleSelect } from '@/modules/gate/components';
import {
  type GoodsReturnGateHistoryItem,
  type GoodsReturnListItem,
  useExpectedGoodsReturns,
  useGoodsReturnGateHistory,
  useMarkGoodsReturnIn,
} from '@/modules/returns/customer/api';
import {
  formatDate,
  formatDateTime,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
} from '@/modules/returns/customer/utils';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

/** How far back the history tab looks when it opens. Matches the server default. */
const HISTORY_DEFAULT_DAYS = 7;

/** Local calendar date -- toISOString() would shift an IST evening back a day. */
function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function defaultHistoryWindow(): { from: string; to: string } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (HISTORY_DEFAULT_DAYS - 1));
  return { from: toDateInput(start), to: toDateInput(today) };
}

export default function GoodsReturnInListPage() {
  const [tab, setTab] = useState<'expected' | 'history'>('expected');
  const { data: expected = [], isLoading, isFetching, refetch } = useExpectedGoodsReturns();

  const [initialWindow] = useState(defaultHistoryWindow);
  const [fromDate, setFromDate] = useState(initialWindow.from);
  const [toDate, setToDate] = useState(initialWindow.to);
  const [search, setSearch] = useState('');

  const historyParams = useMemo(
    () => ({ from_date: fromDate, to_date: toDate }),
    [fromDate, toDate],
  );
  // Only fetched while its tab is open: the gate sits on the queue all day and
  // this window would otherwise be refetched behind it for nothing.
  const {
    data: history = [],
    isLoading: historyLoading,
    isFetching: historyFetching,
    refetch: refetchHistory,
  } = useGoodsReturnGateHistory(historyParams, tab === 'history');

  // Searching in the browser, not the server: the window is already small, and a
  // request per keystroke would be slower than filtering what is on screen.
  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return history;
    return history.filter((entry) =>
      [
        entry.entry_no,
        entry.vehicle_no,
        entry.driver_name,
        entry.customer_name,
        entry.customer_code,
        ...entry.invoice_doc_nums,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [history, search]);

  const busy = tab === 'history' ? historyFetching : isFetching;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Undo2 className="h-7 w-7 text-rose-600" />
            Goods Return In
          </h2>
          <p className="text-muted-foreground">
            Customer return vehicles expected at the gate. Mark a vehicle in when it arrives.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => (tab === 'history' ? refetchHistory() : refetch())}
          disabled={busy}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', busy && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'expected' | 'history')}>
        <TabsList>
          <TabsTrigger value="expected">
            <Truck className="mr-2 h-4 w-4" />
            Expected
            {expected.length > 0 && (
              <Badge className="ml-2 border-0 bg-amber-100 text-amber-800">
                {expected.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Marked In
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expected" className="mt-4">
          {isLoading ? (
            <EmptyState text="Loading…" />
          ) : expected.length === 0 ? (
            <EmptyState text="No goods-return vehicles are expected right now" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {expected.map((entry) => (
                <ExpectedReturnCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-40"
                />
              </div>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search entry, vehicle, driver, customer"
                className="pl-9"
              />
            </div>
          </div>

          {historyLoading ? (
            <EmptyState text="Loading…" />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              text={
                history.length === 0
                  ? 'No return vehicles were marked in over these dates'
                  : 'No marked-in vehicles match this search'
              }
            />
          ) : (
            <HistoryTable entries={filteredHistory} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Read-only on purpose: the return's own pages belong to the returns clerk, and
 *  a gate user holds GATE_IN alone -- opening one from here would only 403. */
function HistoryTable({ entries }: { entries: GoodsReturnGateHistoryItem[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Marked In</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Entry No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Invoices</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Marked In By</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {formatDateTime(entry.gated_in_at)}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.vehicle_no || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.entry_no}</td>
                  <td className="px-4 py-3">{entry.customer_name || entry.customer_code || '-'}</td>
                  <td className="px-4 py-3">{entry.driver_name || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.invoice_doc_nums.length ? entry.invoice_doc_nums.join(', ') : '-'}
                  </td>
                  <td className="px-4 py-3">{entry.line_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.gated_in_by_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{entry.company_code}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('border-0', STATUS_BADGE_CLASS[entry.status])}>
                      {STATUS_LABELS[entry.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpectedReturnCard({ entry }: { entry: GoodsReturnListItem }) {
  const navigate = useNavigate();
  const markIn = useMarkGoodsReturnIn();

  // Returns booked before the vehicle moved to the first page can still reach the
  // gate without one; there, the gate is the first to know the truck.
  const needsVehicle = !entry.vehicle_no || !entry.driver_name;
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverName, setDriverName] = useState('');

  const vehicleReady = Boolean(entry.vehicle_no) || Boolean(vehicleId);
  const driverReady = Boolean(entry.driver_name) || Boolean(driverId);

  async function handleMarkIn() {
    try {
      await markIn.mutateAsync({ id: entry.id, vehicle_id: vehicleId, driver_id: driverId });
      toast.success(`${entry.vehicle_no || vehicleNo || entry.entry_no} marked in`);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Could not mark the vehicle in.');
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Truck className="h-4 w-4 text-muted-foreground" />
              {entry.vehicle_no || vehicleNo || '—'}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => navigate(`/returns/customer/${entry.id}`)}
            >
              {entry.entry_no}
            </button>
          </div>
          <Badge variant="outline">{entry.company_code}</Badge>
        </div>

        <dl className="space-y-1 text-sm">
          <Row label="Customer" value={entry.customer_name || entry.customer_code || '-'} />
          <Row label="Driver" value={entry.driver_name || driverName || '-'} />
          <Row
            label="Items"
            // The clerk hands the truck over on their first page and keys the
            // items in afterwards, so a not-yet-submitted return can legitimately
            // show none. It does not hold up the mark-in.
            value={
              entry.submitted_at
                ? String(entry.line_count)
                : `${entry.line_count} · still being entered`
            }
          />
          <Row
            label="Expected"
            value={entry.expected_arrival_at ? formatDate(entry.expected_arrival_at) : 'Not given'}
          />
        </dl>

        {needsVehicle && (
          <div className="space-y-3 rounded-md border border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              Booked without a vehicle — record the truck that arrived.
            </p>
            {!entry.vehicle_no && (
              <div className="space-y-1">
                <Label className="text-xs">Vehicle</Label>
                <VehicleSelect
                  value={vehicleNo}
                  defaultDisplayText={vehicleNo}
                  onChange={(vehicle) => {
                    setVehicleId(vehicle.vehicleId);
                    setVehicleNo(vehicle.vehicleNumber);
                  }}
                />
              </div>
            )}
            {!entry.driver_name && (
              <div className="space-y-1">
                <Label className="text-xs">Driver</Label>
                <DriverSelect
                  value={driverName}
                  defaultDisplayText={driverName}
                  onChange={(driver) => {
                    setDriverId(driver.driverId);
                    setDriverName(driver.driverName);
                  }}
                />
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleMarkIn}
          disabled={markIn.isPending || !vehicleReady || !driverReady}
        >
          {markIn.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          Mark Vehicle In
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8" />
        <p>{text}</p>
      </CardContent>
    </Card>
  );
}
