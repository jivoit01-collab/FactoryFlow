import { zodResolver } from '@hookform/resolvers/zod';
import { Gauge, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  EmptyPanel,
  PageHeader,
  PageSection,
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input } from '@/shared/components/ui';

import type { DailyReading, FleetVehicle, WritePayload } from '../api';
import {
  useDailyReadings,
  useDeleteDailyReading,
  useFleetOptions,
  useFleetVehicles,
  useSaveDailyReading,
} from '../api';
import { FieldRow, FormError, VehiclePicker } from '../components';
import { type DailyReadingFormData,dailyReadingSchema } from '../schemas/fleet.schema';
import { fieldErrors, km, shortDate, today } from '../utils/format';

/**
 * Write the meter down. One vehicle, one day, one number.
 *
 * A page of its own rather than a box on the log, because this is a job
 * somebody does — walk the yard, read four dials, type them in — not something
 * they stumble into while reading a report. Pick the vehicle, the form is
 * already dated today, and the last reading is shown beside the box so a wrong
 * digit is obvious before it is saved.
 *
 * These readings are the ONLY thing the running log measures distance from.
 * The meter on a fuel slip is a different record kept for a different reason,
 * and mixing the two once turned a 129 km day into 2,345,571.
 */
export default function DailyReadingsPage() {
  const [vehicle, setVehicle] = useState<FleetVehicle | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const { data: options } = useFleetOptions();
  const { data: vehicles = [] } = useFleetVehicles({ status: 'ACTIVE' });
  const { data: readings = [] } = useDailyReadings({ vehicle: vehicle?.id });
  const saveReading = useSaveDailyReading();
  const deleteReading = useDeleteDailyReading();

  const canWrite = options?.can_add_expense ?? false;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DailyReadingFormData>({
    resolver: zodResolver(dailyReadingSchema),
    defaultValues: { vehicle: 0, reading_date: today(), odometer: '', remarks: '' },
  });

  useEffect(() => {
    if (!vehicle) return;
    setValue('vehicle', vehicle.id);
  }, [vehicle, setValue]);

  /** Newest first from the API; each row's run is against the one before it. */
  const rows = useMemo(() => {
    const ordered = [...readings].sort((a, b) => a.reading_date.localeCompare(b.reading_date));
    const withDistance = ordered.map((reading, index) => {
      const previous = index > 0 ? ordered[index - 1] : null;
      const ran =
        previous && reading.odometer >= previous.odometer
          ? reading.odometer - previous.odometer
          : null;
      return { reading, ran };
    });
    return withDistance.reverse();
  }, [readings]);

  const lastReading = rows[0]?.reading ?? null;

  const onSubmit = async (data: DailyReadingFormData) => {
    setApiErrors({});
    try {
      await saveReading.mutateAsync(data as WritePayload);
      toast.success(`${vehicle?.vehicle_number} — reading saved`);
      // The vehicle and the date stay put: the next thing somebody does is
      // read the next vehicle, or correct this one.
      reset({
        vehicle: data.vehicle,
        reading_date: data.reading_date,
        odometer: '',
        remarks: '',
      });
    } catch (error) {
      setApiErrors(fieldErrors(error));
    }
  };

  const remove = async (reading: DailyReading) => {
    if (!window.confirm(`Delete the reading for ${shortDate(reading.reading_date)}?`)) return;
    try {
      await deleteReading.mutateAsync(reading.id);
      toast.success('Reading deleted');
    } catch (error) {
      toast.error(fieldErrors(error).general ?? 'Could not delete it');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Daily reading"
        description="Pick a vehicle and write down what its meter reads"
        icon={Gauge}
        accent="sky"
        backTo="/fleet"
        backLabel="Company Vehicles"
      />

      <PageSection title="Which vehicle">
        <VehiclePicker vehicles={vehicles} value={vehicle?.id ?? null} onChange={setVehicle} />
      </PageSection>

      {!vehicle ? (
        <EmptyPanel
          message="Choose a vehicle"
          hint="Then type what its meter reads. One number."
          icon={Gauge}
        />
      ) : (
        <>
          <PageSection
            title={`${vehicle.vehicle_number}${vehicle.nickname ? ` · ${vehicle.nickname}` : ''}`}
            description={
              lastReading
                ? `Last logged ${km(lastReading.odometer)} on ${shortDate(lastReading.reading_date)}`
                : 'Nothing logged for this vehicle yet'
            }
          >
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 rounded-xl border bg-card p-4 shadow-sm"
            >
              <FormError message={apiErrors.general} />

              <div className="grid gap-4 sm:grid-cols-3">
                <FieldRow
                  label="Meter reading"
                  htmlFor="odometer"
                  required
                  hint={lastReading ? `Last: ${km(lastReading.odometer)}` : undefined}
                  error={errors.odometer?.message || apiErrors.odometer}
                >
                  <Input
                    id="odometer"
                    type="number"
                    inputMode="numeric"
                    autoFocus
                    placeholder="km on the meter"
                    disabled={!canWrite}
                    {...register('odometer')}
                  />
                </FieldRow>

                <FieldRow
                  label="Date"
                  htmlFor="reading_date"
                  required
                  error={errors.reading_date?.message || apiErrors.reading_date}
                >
                  <Input
                    id="reading_date"
                    type="date"
                    max={today()}
                    disabled={!canWrite}
                    {...register('reading_date')}
                  />
                </FieldRow>

                <FieldRow label="Remarks" htmlFor="remarks" error={apiErrors.remarks}>
                  <Input
                    id="remarks"
                    placeholder="Only if something needs saying"
                    disabled={!canWrite}
                    {...register('remarks')}
                  />
                </FieldRow>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Saving a day that already has a reading replaces it.
                </p>
                <Button type="submit" disabled={!canWrite || saveReading.isPending}>
                  {saveReading.isPending ? 'Saving…' : 'Save reading'}
                </Button>
              </div>
            </form>
          </PageSection>

          <TableCard summary={`${rows.length} reading(s) logged`}>
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <Th>Date</Th>
                  <Th align="right">Meter</Th>
                  <Th align="right">Ran since last</Th>
                  <Th>Remarks</Th>
                  <Th>Entered by</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {!rows.length ? (
                  <TableEmpty
                    colSpan={6}
                    message="No readings yet"
                    hint="The first one has nothing to measure against — the second starts the log."
                    icon={Gauge}
                  />
                ) : (
                  rows.map(({ reading, ran }) => (
                    <tr key={reading.id} className={ROW_CLASSES}>
                      <Td>{shortDate(reading.reading_date)}</Td>
                      <Td numeric>{km(reading.odometer)}</Td>
                      <Td numeric>{ran !== null ? km(ran) : '—'}</Td>
                      <Td className="text-xs">{reading.remarks}</Td>
                      <Td className="text-xs">{reading.entered_by_name ?? '—'}</Td>
                      <Td align="right">
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Delete reading"
                            onClick={() => remove(reading)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </>
      )}
    </div>
  );
}
