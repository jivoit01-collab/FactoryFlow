import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Printer, Scale, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { marketplaceApi } from '../api/marketplace.api';
import type { MarketplaceChannel, MpGatePass, MpGatePassStatus } from '../types/marketplace.types';

/** Masters the form picks from. Fetched here rather than through a module hook —
 *  these three lists have no marketplace-specific shape. */
interface Named {
  id: number;
  name?: string;
  vehicle_number?: string;
}

const STATUS_TONE: Record<MpGatePassStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',
  WEIGHED: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
  GATEPASS_PRINTED: 'bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300',
  DISPATCHED: 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300',
};

const fmtWeight = (v: string | null) =>
  v === null ? '—' : `${Number(v).toLocaleString('en-IN')} kg`;

async function fetchList(url: string): Promise<Named[]> {
  const { data } = await apiClient.get<Named[] | { results: Named[] }>(url);
  return Array.isArray(data) ? data : (data.results ?? []);
}

/**
 * The outward trip: which vehicle took a sheet's parcels, what it weighed, and
 * when it left. The marketplace counterpart of the sales-dispatch gate-out.
 *
 * The ladder is enforced by the server, and the screen mirrors it rather than
 * duplicating the rules: Dispatch stays disabled while `weight_error` is set, and
 * shows that message, so the operator reads the reason instead of discovering it
 * by pressing the button.
 */
export function MpGatePassPanel({ channel }: { channel: MarketplaceChannel }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MpGatePassStatus | ''>('');
  const [showNew, setShowNew] = useState(false);

  const passes = useQuery({
    queryKey: ['mp-gate-passes', channel, statusFilter],
    queryFn: () => marketplaceApi.gatePasses(channel, { status: statusFilter || undefined }),
  });
  const sheets = useQuery({
    queryKey: ['mp-gate-queue', channel],
    queryFn: () => marketplaceApi.gateQueue(channel),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['mp-gate-passes'] });

  const rows = passes.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['', 'All'],
              ['DRAFT', 'Draft'],
              ['WEIGHED', 'Weighed'],
              ['GATEPASS_PRINTED', 'Gatepass printed'],
              ['DISPATCHED', 'Dispatched'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key || 'all'}
              size="sm"
              variant={statusFilter === key ? 'default' : 'outline'}
              className="h-8"
              onClick={() => setStatusFilter(key as MpGatePassStatus | '')}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowNew((v) => !v)}>
          <Truck className="mr-2 h-4 w-4" />
          {showNew ? 'Close' : 'New trip'}
        </Button>
      </div>

      {showNew && (
        <NewTripForm
          channel={channel}
          sheets={(sheets.data?.sheets ?? []).map((s) => ({
            id: s.batch_id,
            label: `${s.filename} · ${s.gate_approved} approved`,
            approved: s.gate_approved,
          }))}
          onDone={() => {
            setShowNew(false);
            invalidate();
          }}
        />
      )}

      {passes.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading trips…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
          No trips yet. Approve a sheet at the gate, then raise one.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <GatePassCard key={p.id} pass={p} onChanged={invalidate} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewTripForm({
  channel,
  sheets,
  onDone,
}: {
  channel: MarketplaceChannel;
  sheets: { id: number; label: string; approved: number }[];
  onDone: () => void;
}) {
  const [batchId, setBatchId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');

  const vehicles = useQuery({
    queryKey: ['mp-vehicles'],
    queryFn: () => fetchList(API_ENDPOINTS.VEHICLE.VEHICLES),
  });
  const drivers = useQuery({
    queryKey: ['mp-drivers'],
    queryFn: () => fetchList(API_ENDPOINTS.DRIVER.DRIVERS),
  });

  const create = useMutation({
    mutationFn: () =>
      marketplaceApi.gatePassCreate(channel, {
        batch_id: Number(batchId),
        vehicle_id: vehicleId ? Number(vehicleId) : undefined,
        driver_id: driverId ? Number(driverId) : undefined,
      }),
    onSuccess: () => {
      toast.success('Trip opened.');
      onDone();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not open the trip.')),
  });

  // Only sheets with something approved can be carried — the server refuses the
  // rest, so offering them would only produce an error.
  const options = useMemo(() => sheets.filter((s) => s.approved > 0), [sheets]);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          Sheet
          <NativeSelect
            value={batchId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBatchId(e.target.value)}
          >
            <SelectOption value="">Select a sheet…</SelectOption>
            {options.map((s) => (
              <SelectOption key={s.id} value={String(s.id)}>
                {s.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Vehicle
          <NativeSelect
            value={vehicleId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVehicleId(e.target.value)}
          >
            <SelectOption value="">Select a vehicle…</SelectOption>
            {(vehicles.data ?? []).map((v) => (
              <SelectOption key={v.id} value={String(v.id)}>
                {v.vehicle_number}
              </SelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Driver
          <NativeSelect
            value={driverId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDriverId(e.target.value)}
          >
            <SelectOption value="">Select a driver…</SelectOption>
            {(drivers.data ?? []).map((d) => (
              <SelectOption key={d.id} value={String(d.id)}>
                {d.name}
              </SelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        The transporter is taken from the vehicle. Only sheets with gate-approved parcels can be
        carried.
      </p>
      <Button size="sm" disabled={!batchId || create.isPending} onClick={() => create.mutate()}>
        {create.isPending ? 'Opening…' : 'Open trip'}
      </Button>
    </div>
  );
}

function GatePassCard({ pass, onChanged }: { pass: MpGatePass; onChanged: () => void }) {
  const [tare, setTare] = useState('');
  const [gross, setGross] = useState('');
  const [slip, setSlip] = useState('');
  const [security, setSecurity] = useState('');

  const done = pass.status === 'DISPATCHED' || pass.status === 'CANCELLED';

  const weigh = useMutation({
    mutationFn: () =>
      marketplaceApi.gatePassWeigh(pass.id, {
        tare_weight: tare || undefined,
        gross_weight: gross || undefined,
        weighbridge_slip_no: slip || undefined,
      }),
    onSuccess: () => {
      toast.success('Weighment recorded.');
      setTare('');
      setGross('');
      onChanged();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not record the weighment.')),
  });

  const print = useMutation({
    mutationFn: () => marketplaceApi.gatePassPrint(pass.id),
    onSuccess: (p) => {
      toast.success(`Gatepass ${p.gatepass_no}`);
      onChanged();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not print the gatepass.')),
  });

  const dispatch = useMutation({
    mutationFn: () => marketplaceApi.gatePassDispatch(pass.id, { security_name: security }),
    onSuccess: (p) => {
      toast.success(`Out at ${p.out_time} — ${p.parcel_count} parcel(s).`);
      onChanged();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not mark the trip out.')),
  });

  const cancel = useMutation({
    mutationFn: (reason: string) => marketplaceApi.gatePassCancel(pass.id, reason),
    onSuccess: () => {
      toast.success('Trip cancelled.');
      onChanged();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not cancel.')),
  });

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{pass.vehicle_no || 'No vehicle'}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[pass.status]}`}
            >
              {pass.status_display}
            </span>
            {pass.gatepass_no && (
              <span className="font-mono text-xs text-muted-foreground">{pass.gatepass_no}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {pass.transporter_name || 'No transporter'}
            {pass.driver_name ? ` · ${pass.driver_name}` : ''}
            {pass.driver_mobile_no ? ` · ${pass.driver_mobile_no}` : ''}
          </p>
          <p className="truncate text-xs text-muted-foreground">{pass.sheet}</p>
        </div>
        <div className="text-right text-sm">
          <div className="flex items-center justify-end gap-1 text-muted-foreground">
            <Scale className="h-3.5 w-3.5" />
            <span>
              tare {fmtWeight(pass.tare_weight)} · gross {fmtWeight(pass.gross_weight)}
            </span>
          </div>
          <div className="font-semibold">net {fmtWeight(pass.net_weight)}</div>
          {pass.status === 'DISPATCHED' && (
            <div className="text-xs text-muted-foreground">
              {pass.order_count} orders · {pass.parcel_count} parcels
            </div>
          )}
        </div>
      </div>

      {!done && (
        <>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input
              placeholder="Tare (kg)"
              value={tare}
              onChange={(e) => setTare(e.target.value)}
              className="h-8"
            />
            <Input
              placeholder="Gross (kg)"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              className="h-8"
            />
            <Input
              placeholder="Weighbridge slip"
              value={slip}
              onChange={(e) => setSlip(e.target.value)}
              className="h-8"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={(!tare && !gross) || weigh.isPending}
              onClick={() => weigh.mutate()}
            >
              Record weighment
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={print.isPending}
              onClick={() => print.mutate()}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              {pass.gatepass_no ? 'Reprint' : 'Print gatepass'}
            </Button>
            <Input
              placeholder="Security name"
              value={security}
              onChange={(e) => setSecurity(e.target.value)}
              className="h-8 w-40"
            />
            <Button
              size="sm"
              className="h-8"
              // The server refuses an unweighed or unprinted trip; show the reason
              // rather than letting the operator find it by pressing.
              disabled={
                dispatch.isPending || !!pass.weight_error || pass.status !== 'GATEPASS_PRINTED'
              }
              onClick={() => dispatch.mutate()}
            >
              Mark out
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-destructive hover:bg-destructive/10"
              disabled={cancel.isPending}
              onClick={() => {
                const reason = window.prompt('Why is this trip being cancelled?');
                if (reason?.trim()) cancel.mutate(reason.trim());
              }}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>

          {(pass.weight_error || pass.status !== 'GATEPASS_PRINTED') && (
            <p className="text-xs text-amber-600">
              {pass.weight_error || 'Print the gatepass before marking this trip out.'}
            </p>
          )}
        </>
      )}

      {pass.status === 'DISPATCHED' && (
        <p className="text-xs text-muted-foreground">
          Out on {pass.gate_out_date} at {pass.out_time}
          {pass.security_name ? ` · security ${pass.security_name}` : ''}
        </p>
      )}
      {pass.status === 'CANCELLED' && pass.cancel_reason && (
        <p className="text-xs text-destructive">Cancelled — {pass.cancel_reason}</p>
      )}
    </div>
  );
}
