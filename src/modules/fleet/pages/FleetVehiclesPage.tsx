import { AlertTriangle, Fuel, Pencil, Plus, Search, Truck, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { FilterBar, FilterField, PageHeader, StatusPill } from '@/shared/components/page';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import type { FleetVehicle } from '../api';
import { useFleetOptions, useFleetVehicles } from '../api';
import { FuelEntryDialog, ServiceEntryDialog, VehicleFormDialog } from '../components';
import { km, shortDate } from '../utils/format';

/**
 * The fleet, as cards rather than a table.
 *
 * A card can carry what a row cannot without becoming unreadable: the meter,
 * the last measured mileage, whether a service is due and whether any paper
 * has run out — which together are the whole reason to open this page.
 */
export default function FleetVehiclesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [formVehicle, setFormVehicle] = useState<FleetVehicle | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [fuelFor, setFuelFor] = useState<FleetVehicle | null>(null);
  const [serviceFor, setServiceFor] = useState<FleetVehicle | null>(null);

  const { data: options } = useFleetOptions();
  const { data: vehicles = [], isFetching } = useFleetVehicles({ search, category, status });

  const activeFilters = [search, category, status].filter(Boolean).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Vehicles"
        description="Every vehicle the company owns"
        icon={Truck}
        accent="blue"
        backTo="/fleet"
        backLabel="Company Vehicles"
      >
        {options?.can_manage_vehicles && (
          <Button
            onClick={() => {
              setFormVehicle(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add vehicle
          </Button>
        )}
      </PageHeader>

      <FilterBar
        isFetching={isFetching}
        activeCount={activeFilters}
        onReset={() => {
          setSearch('');
          setCategory('');
          setStatus('');
        }}
      >
        <FilterField label="Search" htmlFor="vehicle-search" className="min-w-[220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="vehicle-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Number, name, driver"
              className="pl-9"
            />
          </div>
        </FilterField>
        <FilterField label="Kind" htmlFor="vehicle-category">
          <NativeSelect
            id="vehicle-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <SelectOption value="">All</SelectOption>
            {(options?.categories ?? []).map((choice) => (
              <SelectOption key={choice.value} value={choice.value}>
                {choice.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Status" htmlFor="vehicle-status">
          <NativeSelect
            id="vehicle-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <SelectOption value="">All</SelectOption>
            {(options?.vehicle_statuses ?? []).map((choice) => (
              <SelectOption key={choice.value} value={choice.value}>
                {choice.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>

      {!vehicles.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Truck className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No vehicles yet</p>
          <p className="text-sm text-muted-foreground">
            Add the trucks, the cars, the Eeco and the scooty — four boxes each.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => {
            const alerts = vehicle.document_alerts;
            const paperwork = alerts.expired + alerts.expiring;
            return (
              <div key={vehicle.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/fleet/vehicles/${vehicle.id}`}
                      className="text-base font-semibold hover:underline"
                    >
                      {vehicle.vehicle_number}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {[vehicle.nickname, vehicle.category_label, vehicle.make_model]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {options?.can_manage_vehicles && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${vehicle.vehicle_number}`}
                      onClick={() => {
                        setFormVehicle(vehicle);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <StatusPill tone={vehicle.status === 'ACTIVE' ? 'done' : 'neutral'} dot>
                    {vehicle.status_label}
                  </StatusPill>
                  <StatusPill tone="info">{vehicle.fuel_type_label}</StatusPill>
                  {vehicle.next_service?.due && (
                    <StatusPill tone="warn" icon={Wrench}>
                      Service due
                    </StatusPill>
                  )}
                  {paperwork > 0 && (
                    <StatusPill tone={alerts.expired ? 'blocked' : 'warn'} icon={AlertTriangle}>
                      {alerts.expired ? `${alerts.expired} expired` : `${alerts.expiring} expiring`}
                    </StatusPill>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Meter</dt>
                  <dd className="text-right tabular-nums">{km(vehicle.last_odometer)}</dd>
                  <dt className="text-muted-foreground">Mileage</dt>
                  <dd className="text-right tabular-nums">
                    {vehicle.last_mileage
                      ? `${vehicle.last_mileage.value} ${vehicle.last_mileage.unit}`
                      : '—'}
                  </dd>
                  {vehicle.next_service?.date && (
                    <>
                      <dt className="text-muted-foreground">Next service</dt>
                      <dd className="text-right">{shortDate(vehicle.next_service.date)}</dd>
                    </>
                  )}
                </dl>

                {options?.can_add_expense && (
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setFuelFor(vehicle)}
                    >
                      <Fuel className="mr-1.5 h-4 w-4" />
                      Fuel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setServiceFor(vehicle)}
                    >
                      <Wrench className="mr-1.5 h-4 w-4" />
                      Service
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        options={options}
        vehicle={formVehicle}
      />
      <FuelEntryDialog
        open={!!fuelFor}
        onOpenChange={(open) => !open && setFuelFor(null)}
        vehicles={fuelFor ? [fuelFor] : []}
        vehicleId={fuelFor?.id}
        options={options}
      />
      <ServiceEntryDialog
        open={!!serviceFor}
        onOpenChange={(open) => !open && setServiceFor(null)}
        vehicles={serviceFor ? [serviceFor] : []}
        vehicleId={serviceFor?.id}
        options={options}
      />
    </div>
  );
}
