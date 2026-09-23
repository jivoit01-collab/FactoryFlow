import { Fuel, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import type { ApprovalStatusCode, FuelEntry } from '../api';
import { useDeleteFuelEntry, useFleetOptions, useFleetVehicles, useFuelEntries } from '../api';
import { type EntryDetail, EntryDetailDialog, FuelEntryDialog } from '../components';
import { fieldErrors, km, money, monthStart, quantity, rupees, shortDate, today } from '../utils/format';

/** The pill colour for an entry's approval state. */
function approvalTone(status: ApprovalStatusCode) {
  if (status === 'APPROVED') return 'done' as const;
  if (status === 'REJECTED') return 'blocked' as const;
  return 'warn' as const;
}

/**
 * Every filling, filterable.
 *
 * Mileage is shown where it could be measured and left blank where it could
 * not — a part fill, or the first fill after one. Showing an approximation
 * there would be worse than showing nothing, because somebody would act on it.
 */
export default function FuelEntriesPage() {
  const [vehicle, setVehicle] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [approvalStatus, setApprovalStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FuelEntry | undefined>();
  const [viewing, setViewing] = useState<FuelEntry | null>(null);

  const { data: options } = useFleetOptions();
  const { data: vehicles = [] } = useFleetVehicles();
  const { data: entries = [], isFetching } = useFuelEntries({
    vehicle: vehicle ? Number(vehicle) : undefined,
    from,
    to,
    approval_status: approvalStatus,
  });
  const deleteEntry = useDeleteFuelEntry();

  const total = entries
    .filter((entry) => entry.approval_status === 'APPROVED')
    .reduce((sum, entry) => sum + Number(entry.amount), 0);

  const remove = async (entry: FuelEntry) => {
    if (!window.confirm(`Delete the ${shortDate(entry.entry_date)} filling of ${entry.vehicle_number}?`))
      return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success('Filling deleted');
    } catch (error) {
      toast.error(fieldErrors(error).general ?? 'Could not delete it');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Fuel"
        description="Every filling, and the mileage it worked out to"
        icon={Fuel}
        accent="amber"
        backTo="/fleet"
        backLabel="Company Vehicles"
      >
        {options?.can_add_expense && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add fuel
          </Button>
        )}
      </PageHeader>

      <FilterBar
        isFetching={isFetching}
        onReset={() => {
          setVehicle('');
          setFrom(monthStart());
          setTo(today());
          setApprovalStatus('');
        }}
      >
        <FilterField label="Vehicle" htmlFor="fuel-vehicle">
          <NativeSelect
            id="fuel-vehicle"
            value={vehicle}
            onChange={(event) => setVehicle(event.target.value)}
          >
            <SelectOption value="">All</SelectOption>
            {vehicles.map((row) => (
              <SelectOption key={row.id} value={String(row.id)}>
                {row.display_name}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="From" htmlFor="fuel-from">
          <Input id="fuel-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </FilterField>
        <FilterField label="To" htmlFor="fuel-to">
          <Input id="fuel-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </FilterField>
        <FilterField label="Approval" htmlFor="fuel-approval">
          <NativeSelect
            id="fuel-approval"
            value={approvalStatus}
            onChange={(event) => setApprovalStatus(event.target.value)}
          >
            <SelectOption value="">All</SelectOption>
            {(options?.approval_statuses ?? []).map((choice) => (
              <SelectOption key={choice.value} value={choice.value}>
                {choice.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>

      <TableCard summary={`${entries.length} filling(s) · ${money(total)} approved`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Date</Th>
              <Th>Vehicle</Th>
              <Th align="right">Meter</Th>
              <Th align="right">Quantity</Th>
              <Th align="right">Rate</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Run</Th>
              <Th align="right">Mileage</Th>
              <Th>Approval</Th>
              <Th align="right"> </Th>
            </tr>
          </thead>
          <tbody>
            {!entries.length ? (
              <TableEmpty
                colSpan={10}
                message={isFetching ? 'Loading…' : 'No fillings in this range'}
                icon={Fuel}
              />
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`${ROW_CLASSES} cursor-pointer`}
                  tabIndex={0}
                  onClick={() => setViewing(entry)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setViewing(entry);
                    }
                  }}
                >
                  <Td>{shortDate(entry.entry_date)}</Td>
                  <Td>
                    <span className="font-medium">{entry.vehicle_number}</span>
                    {entry.vehicle_nickname && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {entry.vehicle_nickname}
                      </span>
                    )}
                  </Td>
                  <Td numeric>{km(entry.odometer)}</Td>
                  <Td numeric>
                    {quantity(entry.quantity, entry.unit)}
                    {!entry.is_tank_full && (
                      <span className="ml-1 text-xs text-muted-foreground">part</span>
                    )}
                  </Td>
                  <Td numeric>{rupees(entry.rate)}</Td>
                  <Td numeric className="font-semibold">
                    {money(entry.amount)}
                  </Td>
                  <Td numeric>{km(entry.distance_km)}</Td>
                  <Td numeric>{entry.mileage ? `${entry.mileage} ${entry.mileage_unit}` : '—'}</Td>
                  <Td>
                    <StatusPill tone={approvalTone(entry.approval_status)} dot>
                      {entry.approval_status_label}
                    </StatusPill>
                    {entry.rejection_reason && (
                      <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                        {entry.rejection_reason}
                      </p>
                    )}
                  </Td>
                  <Td align="right" onClick={(event) => event.stopPropagation()}>
                    {options?.can_add_expense && entry.approval_status !== 'APPROVED' && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Edit filling"
                          onClick={() => {
                            setEditing(entry);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Delete filling"
                          onClick={() => remove(entry)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <EntryDetailDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        detail={viewing ? ({ kind: 'fuel', entry: viewing } as EntryDetail) : null}
        canEdit={options?.can_add_expense}
        onEdit={(detail) => {
          setViewing(null);
          setEditing(detail.entry as FuelEntry);
          setDialogOpen(true);
        }}
      />

      <FuelEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicles={vehicles}
        options={options}
        entry={editing}
      />
    </div>
  );
}
