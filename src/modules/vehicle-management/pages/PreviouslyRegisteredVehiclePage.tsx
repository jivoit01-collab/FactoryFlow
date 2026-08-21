import { ArrowLeft, Camera, Plus, Search, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CreateVehicleDialog } from '@/modules/gate/components/CreateVehicleDialog';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/components/ui';

import { useVehicleHistory } from '../api';
import type {
  VehicleHistoryDriver,
  VehicleHistoryPhoto,
  VehicleHistoryVehicle,
  VehicleHistoryVisit,
} from '../types';

const normalize = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');
const dash = (v?: string | number | null) =>
  v === undefined || v === null || v === '' ? '—' : String(v);
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { dateStyle: 'medium' });
};

/**
 * Previously Registered Vehicle — opened from the linking pages (not
 * automatically). Enter a registration number to see everything already captured
 * about the vehicle: dimensions, driver, last visit, past records and photos. If
 * it isn't registered, offer to create it (view-first, then create).
 */
export default function PreviouslyRegisteredVehiclePage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const historyQuery = useVehicleHistory(submitted, submitted.length > 0);
  const data = historyQuery.data;

  function search() {
    const n = normalize(input);
    if (n) setSubmitted(n);
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Previously Registered Vehicle"
        description="Look up a vehicle by registration number to see its past details before linking."
      >
        {/* Reached from both linking pages — go back where the user came from. */}
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DashboardHeader>

      <Card>
        <CardContent className="flex flex-col gap-2 py-4 sm:flex-row">
          <Input
            value={input}
            placeholder="Enter or scan the vehicle registration number"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="sm:max-w-sm"
          />
          <Button onClick={search} disabled={!normalize(input)} className="w-full sm:w-auto">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </CardContent>
      </Card>

      {submitted && historyQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading vehicle history…</p>
      )}

      {submitted && !historyQuery.isLoading && data && !data.found && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Truck className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <span className="font-mono font-medium">{submitted}</span> is not registered yet.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register this vehicle
            </Button>
          </CardContent>
        </Card>
      )}

      {data?.found && data.vehicle && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <VehicleCard
              vehicle={data.vehicle}
              lastVisit={data.last_visit_date}
              visitCount={data.visit_count ?? 0}
            />
            <VisitsCard visits={data.visits ?? []} />
          </div>
          <div className="space-y-6">
            <DriverCard driver={data.driver} />
            <PhotosCard photos={data.photos ?? []} />
          </div>
        </div>
      )}

      <CreateVehicleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialVehicleNumber={submitted}
        onSuccess={() => {
          setCreateOpen(false);
          historyQuery.refetch();
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function VehicleCard({
  vehicle,
  lastVisit,
  visitCount,
}: {
  vehicle: VehicleHistoryVehicle;
  lastVisit?: string | null;
  visitCount: number;
}) {
  const dims = [vehicle.length_m, vehicle.width_m, vehicle.height_m];
  const dimsText = dims.some(Boolean)
    ? `${dash(vehicle.length_m)} × ${dash(vehicle.width_m)} × ${dash(vehicle.height_m)} m (L×W×H)`
    : 'Not captured yet';
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-5 w-5 text-primary" />
          <span className="font-mono">{vehicle.vehicle_number}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Info label="Vehicle type" value={dash(vehicle.vehicle_type)} />
        <Info label="Capacity (t)" value={dash(vehicle.capacity_ton)} />
        <Info label="Dimensions" value={dimsText} />
        <Info label="Transporter" value={dash(vehicle.transporter_name)} />
        <Info label="Transporter contact" value={dash(vehicle.transporter_contact)} />
        <Info label="Transporter mobile" value={dash(vehicle.transporter_mobile)} />
        <Info label="GSTIN" value={dash(vehicle.transporter_gstin)} />
        <Info label="Registered on" value={fmtDate(vehicle.registered_on)} />
        <Info label="Last factory visit" value={fmtDate(lastVisit)} />
        <Info label="Total visits" value={String(visitCount)} />
      </CardContent>
    </Card>
  );
}

function DriverCard({ driver }: { driver?: VehicleHistoryDriver | null }) {
  const d = driver;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Driver (most recent)</CardTitle>
      </CardHeader>
      <CardContent>
        {!d ? (
          <p className="text-sm text-muted-foreground">No driver on record.</p>
        ) : (
          <div className="space-y-3">
            {d.photo ? (
              <img
                src={d.photo}
                alt={d.name}
                className="h-28 w-28 rounded-md border object-cover"
              />
            ) : null}
            <Info label="Name" value={dash(d.name)} />
            <Info label="Mobile" value={dash(d.mobile_no)} />
            <Info label="License no." value={dash(d.license_no)} />
            <Info label="ID proof" value={`${dash(d.id_proof_type)} ${d.id_proof_number || ''}`.trim()} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhotosCard({ photos }: { photos: VehicleHistoryPhoto[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4" /> Photos ({photos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos captured on earlier visits.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p, i) => (
              <a key={`${p.url}-${i}`} href={p.url} target="_blank" rel="noreferrer" className="block">
                <img
                  src={p.url}
                  alt={p.label}
                  className="aspect-square w-full rounded-md border object-cover"
                />
                <div className="mt-1 truncate text-xs text-muted-foreground">{p.label}</div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VisitsCard({ visits }: { visits: VehicleHistoryVisit[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Previous visits ({visits.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="-mx-2 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Gate entry</th>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Photos</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No previous visits recorded.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v.entry_no} className="border-b last:border-0">
                    <td className="p-3 font-mono">{v.entry_no}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(v.entry_time)}</td>
                    <td className="p-3">{v.entry_type}</td>
                    <td className="p-3">{dash(v.driver_name)}</td>
                    <td className="p-3">
                      <Badge variant="outline">{v.status}</Badge>
                    </td>
                    <td className="p-3 text-right tabular-nums">{v.photo_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
