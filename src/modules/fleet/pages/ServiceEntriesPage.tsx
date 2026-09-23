import { Pencil, Plus, Trash2, Wrench } from 'lucide-react';
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

import type { ApprovalStatusCode, ServiceEntry } from '../api';
import {
  useDeleteServiceEntry,
  useFleetOptions,
  useFleetVehicles,
  useServiceEntries,
} from '../api';
import { ServiceEntryDialog } from '../components';
import { fieldErrors, km, money, monthStart, shortDate, today } from '../utils/format';

function approvalTone(status: ApprovalStatusCode) {
  if (status === 'APPROVED') return 'done' as const;
  if (status === 'REJECTED') return 'blocked' as const;
  return 'warn' as const;
}

/** Every service and repair bill, filterable. */
export default function ServiceEntriesPage() {
  const [vehicle, setVehicle] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [approvalStatus, setApprovalStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceEntry | undefined>();

  const { data: options } = useFleetOptions();
  const { data: vehicles = [] } = useFleetVehicles();
  const { data: entries = [], isFetching } = useServiceEntries({
    vehicle: vehicle ? Number(vehicle) : undefined,
    from,
    to,
    approval_status: approvalStatus,
  });
  const deleteEntry = useDeleteServiceEntry();

  const total = entries
    .filter((entry) => entry.approval_status === 'APPROVED')
    .reduce((sum, entry) => sum + Number(entry.total_amount), 0);

  const remove = async (entry: ServiceEntry) => {
    if (!window.confirm(`Delete the ${shortDate(entry.entry_date)} bill for ${entry.vehicle_number}?`))
      return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success('Service deleted');
    } catch (error) {
      toast.error(fieldErrors(error).general ?? 'Could not delete it');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Service & repairs"
        description="Workshop bills, and when the next one is due"
        icon={Wrench}
        accent="violet"
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
            Add service
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
        <FilterField label="Vehicle" htmlFor="service-vehicle">
          <NativeSelect
            id="service-vehicle"
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
        <FilterField label="From" htmlFor="service-from">
          <Input id="service-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </FilterField>
        <FilterField label="To" htmlFor="service-to">
          <Input id="service-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </FilterField>
        <FilterField label="Approval" htmlFor="service-approval">
          <NativeSelect
            id="service-approval"
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

      <TableCard summary={`${entries.length} bill(s) · ${money(total)} approved`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Date</Th>
              <Th>Vehicle</Th>
              <Th>Work</Th>
              <Th>Workshop</Th>
              <Th align="right">Meter</Th>
              <Th align="right">Total</Th>
              <Th>Next due</Th>
              <Th>Approval</Th>
              <Th align="right"> </Th>
            </tr>
          </thead>
          <tbody>
            {!entries.length ? (
              <TableEmpty
                colSpan={9}
                message={isFetching ? 'Loading…' : 'No service bills in this range'}
                icon={Wrench}
              />
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className={ROW_CLASSES}>
                  <Td>{shortDate(entry.entry_date)}</Td>
                  <Td className="font-medium">{entry.vehicle_number}</Td>
                  <Td>
                    {entry.kind_label}
                    {entry.description && (
                      <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                        {entry.description}
                      </p>
                    )}
                  </Td>
                  <Td>{entry.workshop_name || '—'}</Td>
                  <Td numeric>{km(entry.odometer)}</Td>
                  <Td numeric className="font-semibold">
                    {money(entry.total_amount)}
                  </Td>
                  <Td>
                    {entry.next_service_date
                      ? shortDate(entry.next_service_date)
                      : entry.next_service_odometer
                        ? km(entry.next_service_odometer)
                        : '—'}
                  </Td>
                  <Td>
                    <StatusPill tone={approvalTone(entry.approval_status)} dot>
                      {entry.approval_status_label}
                    </StatusPill>
                  </Td>
                  <Td align="right">
                    {options?.can_add_expense && entry.approval_status !== 'APPROVED' && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Edit service"
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
                          aria-label="Delete service"
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

      <ServiceEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicles={vehicles}
        options={options}
        entry={editing}
      />
    </div>
  );
}
