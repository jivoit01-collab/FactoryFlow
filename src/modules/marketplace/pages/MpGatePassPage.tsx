import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Printer, Scale, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { marketplaceApi } from '../api/marketplace.api';
import type { MarketplaceChannel, MpGatePass } from '../types/marketplace.types';

interface Named {
  id: number;
  name?: string;
  vehicle_number?: string;
}

async function fetchList(url: string): Promise<Named[]> {
  const { data } = await apiClient.get<Named[] | { results: Named[] }>(url);
  return Array.isArray(data) ? data : (data.results ?? []);
}

const kg = (v: string | null) => (v === null ? '—' : `${Number(v).toLocaleString('en-IN')} kg`);

/**
 * Sending an approved sheet out: vehicle and driver, then weighment, then out.
 *
 * Reached from the Gate page the moment a sheet is approved, and deliberately
 * linear — the gate person is standing at a truck, not managing a work queue.
 * Everything optional lives after the trip has gone: the gatepass the driver
 * carries is printed from the done screen, never as a step that blocks it.
 */
export default function MpGatePassPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [params] = useSearchParams();
  const channel = (params.get('channel') || 'FLIPKART') as MarketplaceChannel;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [tare, setTare] = useState('');
  const [gross, setGross] = useState('');
  const [slip, setSlip] = useState('');
  const [security, setSecurity] = useState('');
  const [trip, setTrip] = useState<MpGatePass | null>(null);

  // Resume a trip already open on this sheet instead of starting a second one.
  // Without this, reopening the page (or a refresh mid-flow) would leave two
  // DRAFTs against the same sheet and the operator would not know which is live.
  const existing = useQuery({
    queryKey: ['mp-gate-pass-for-batch', batchId, channel],
    queryFn: () => marketplaceApi.gatePasses(channel, { batch_id: Number(batchId) }),
    enabled: !!batchId,
  });

  const open = (existing.data ?? []).find(
    (p) => p.status !== 'DISPATCHED' && p.status !== 'CANCELLED',
  );
  // Adopt it once, then let the local copy lead — the query would otherwise
  // overwrite each step's result with a stale row.
  if (open && !trip) setTrip(open);

  const vehicles = useQuery({
    queryKey: ['mp-vehicles'],
    queryFn: () => fetchList(API_ENDPOINTS.VEHICLE.VEHICLES),
  });
  const drivers = useQuery({
    queryKey: ['mp-drivers'],
    queryFn: () => fetchList(API_ENDPOINTS.DRIVER.DRIVERS),
  });

  const fail = (msg: string) => (e: unknown) => toast.error(getErrorMessage(e, msg));

  // Step 1 — the trip is opened by saving the vehicle, so there is no separate
  // "create" the gate person has to think about.
  const start = useMutation({
    mutationFn: () =>
      marketplaceApi.gatePassCreate(channel, {
        batch_id: Number(batchId),
        vehicle_id: vehicleId ? Number(vehicleId) : undefined,
        driver_id: driverId ? Number(driverId) : undefined,
      }),
    onSuccess: setTrip,
    onError: fail('Could not start the trip.'),
  });

  const weigh = useMutation({
    mutationFn: () =>
      marketplaceApi.gatePassWeigh(trip!.id, {
        tare_weight: tare || undefined,
        gross_weight: gross || undefined,
        weighbridge_slip_no: slip || undefined,
      }),
    onSuccess: setTrip,
    onError: fail('Could not record the weighment.'),
  });

  const markOut = useMutation({
    mutationFn: () => marketplaceApi.gatePassDispatch(trip!.id, { security_name: security }),
    onSuccess: (p) => {
      setTrip(p);
      qc.invalidateQueries({ queryKey: ['mp-gate-queue'] });
      toast.success(`Out — ${p.parcel_count} parcel(s) on ${p.vehicle_no}.`);
    },
    onError: fail('Could not mark the trip out.'),
  });

  const print = useMutation({
    mutationFn: () => marketplaceApi.gatePassPrint(trip!.id),
    onSuccess: (p) => {
      setTrip(p);
      window.print();
    },
    onError: fail('Could not print the gatepass.'),
  });

  const gone = trip?.status === 'DISPATCHED';

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Truck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Send out</h1>
          <p className="text-sm text-muted-foreground">
            {gone
              ? 'This trip has left the gate.'
              : 'Vehicle and driver, then weighment, then out.'}
          </p>
        </div>
      </header>

      {/* 1 — vehicle and driver */}
      <Step n={1} title="Vehicle & driver" done={!!trip}>
        {trip ? (
          <p className="text-sm">
            <span className="font-semibold">{trip.vehicle_no || '—'}</span>
            {trip.transporter_name ? ` · ${trip.transporter_name}` : ''}
            {trip.driver_name ? ` · ${trip.driver_name}` : ''}
            {trip.driver_mobile_no ? ` · ${trip.driver_mobile_no}` : ''}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-muted-foreground">
                Vehicle
                <NativeSelect
                  value={vehicleId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setVehicleId(e.target.value)
                  }
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setDriverId(e.target.value)
                  }
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
            <p className="text-xs text-muted-foreground">The transporter comes from the vehicle.</p>
            <Button
              size="sm"
              disabled={!vehicleId || start.isPending}
              onClick={() => start.mutate()}
            >
              {start.isPending ? 'Saving…' : 'Save & continue'}
            </Button>
          </div>
        )}
      </Step>

      {/* 2 — weighment */}
      <Step n={2} title="Weighment" done={!!trip?.is_weighed} disabled={!trip}>
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Tare (kg)"
              value={tare}
              onChange={(e) => setTare(e.target.value)}
              disabled={!trip || gone}
            />
            <Input
              placeholder="Gross (kg)"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              disabled={!trip || gone}
            />
            <Input
              placeholder="Weighbridge slip"
              value={slip}
              onChange={(e) => setSlip(e.target.value)}
              disabled={!trip || gone}
            />
          </div>
          <p className="flex items-center gap-1.5 text-sm">
            <Scale className="h-4 w-4 text-muted-foreground" />
            tare {kg(trip?.tare_weight ?? null)} · gross {kg(trip?.gross_weight ?? null)} ·{' '}
            <span className="font-semibold">net {kg(trip?.net_weight ?? null)}</span>
          </p>
          {!gone && (
            <Button
              size="sm"
              variant="outline"
              disabled={!trip || (!tare && !gross) || weigh.isPending}
              onClick={() => weigh.mutate()}
            >
              {weigh.isPending ? 'Saving…' : 'Save weighment'}
            </Button>
          )}
        </div>
      </Step>

      {/* 3 — out */}
      <Step n={3} title="Mark out" done={gone} disabled={!trip?.is_weighed}>
        {gone ? (
          <div className="space-y-3">
            <p className="text-sm">
              Left at {trip?.out_time} on {trip?.gate_out_date}
              {trip?.security_name ? ` · security ${trip.security_name}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {trip?.order_count} orders · {trip?.parcel_count} parcels
            </p>
            <p className="font-mono text-sm">{trip?.gatepass_no}</p>
            <Button
              size="sm"
              variant="outline"
              disabled={print.isPending}
              onClick={() => print.mutate()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print gatepass
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Security name"
              value={security}
              onChange={(e) => setSecurity(e.target.value)}
              disabled={!trip?.is_weighed}
              className="sm:w-64"
            />
            <Button
              size="sm"
              disabled={!trip?.is_weighed || markOut.isPending}
              onClick={() => markOut.mutate()}
            >
              {markOut.isPending ? 'Marking out…' : 'Mark out'}
            </Button>
            {/* The server's own reason, so the gate person reads it rather than
                discovering it by pressing the button. */}
            {trip && trip.weight_error && (
              <p className="text-xs text-amber-600">{trip.weight_error}</p>
            )}
          </div>
        )}
      </Step>

      {gone && (
        <Button variant="outline" onClick={() => navigate('/marketplace/gate')}>
          Back to Gate
        </Button>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  done,
  disabled,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border p-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
            done ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : n}
        </span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
