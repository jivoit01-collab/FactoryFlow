import { CalendarDays, Fuel, Gauge, IndianRupee, Plus, Route, Wrench } from 'lucide-react';
import { useState } from 'react';

import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';

import type { RunningLogDay, RunningLogVehicleRow } from '../api';
import { useFleetOptions, useFleetVehicles, useRunningLog } from '../api';
import { DailyReadingDialog } from '../components';
import { km, money, monthStart, quantity, rupees, shortDate, today } from '../utils/format';

/** Saturday or Sunday — dimmed, so a weekend gap does not read as neglect. */
function isWeekend(iso: string) {
  const day = new Date(`${iso}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

/**
 * The running log: a day-wise history of every vehicle.
 *
 * Two shapes, one page. With no vehicle chosen it answers "which vehicle ran
 * how much" across the fleet; choose one and it becomes that vehicle's diary,
 * a row per day, showing what the meter read, how far it went, what fuel went
 * in and what the day cost.
 *
 * Days nobody wrote down are shown as empty rows rather than skipped, because
 * a log with holes in it should look like one. Clicking an empty day opens the
 * reading box already dated.
 */
export default function VehicleRunningLogPage() {
  const [vehicle, setVehicle] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [readingOpen, setReadingOpen] = useState(false);
  const [readingDate, setReadingDate] = useState<string | undefined>();

  const { data: options } = useFleetOptions();
  const { data: vehicles = [] } = useFleetVehicles();
  const { data: log, isFetching } = useRunningLog({
    vehicle: vehicle ? Number(vehicle) : undefined,
    from,
    to,
  });

  const oneVehicle = !!log?.vehicle;
  const totals = log?.totals;
  const canWrite = options?.can_add_expense ?? false;

  const addReading = (on?: string) => {
    setReadingDate(on);
    setReadingOpen(true);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Running log"
        description="Day by day: what each vehicle ran, and what it cost"
        icon={CalendarDays}
        accent="sky"
        backTo="/fleet"
        backLabel="Company Vehicles"
      >
        {canWrite && (
          <Button onClick={() => addReading(undefined)}>
            <Plus className="mr-2 h-4 w-4" />
            Add reading
          </Button>
        )}
      </PageHeader>

      <FilterBar
        isFetching={isFetching}
        onReset={() => {
          setVehicle('');
          setFrom(monthStart());
          setTo(today());
        }}
      >
        <FilterField label="Vehicle" htmlFor="log-vehicle">
          <NativeSelect
            id="log-vehicle"
            value={vehicle}
            onChange={(event) => setVehicle(event.target.value)}
          >
            <SelectOption value="">All vehicles</SelectOption>
            {vehicles.map((row) => (
              <SelectOption key={row.id} value={String(row.id)}>
                {row.display_name}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="From" htmlFor="log-from">
          <Input id="log-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </FilterField>
        <FilterField label="To" htmlFor="log-to">
          <Input id="log-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </FilterField>
      </FilterBar>

      {oneVehicle && totals && (
        <StatTileRow>
          <StatTile label="Distance run" value={km(totals.distance_km)} icon={Route} accent="sky" />
          <StatTile
            label="Fuel"
            value={money(totals.fuel_cost)}
            sub={quantity(totals.fuel_quantity, log?.vehicle?.fuel_unit ?? 'L')}
            icon={Fuel}
            accent="amber"
          />
          <StatTile
            label="Service"
            value={money(totals.service_cost)}
            icon={Wrench}
            accent="violet"
          />
          <StatTile
            label="Cost per km"
            value={totals.cost_per_km ? rupees(totals.cost_per_km) : '—'}
            sub={money(totals.total_cost) + ' in total'}
            icon={IndianRupee}
            accent="emerald"
          />
          <StatTile
            label="Days written down"
            value={`${totals.days_with_reading} / ${totals.days_in_range}`}
            sub={totals.days_missing ? `${totals.days_missing} day(s) missing` : 'Nothing missed'}
            icon={Gauge}
            accent={totals.days_missing ? 'amber' : 'emerald'}
          />
        </StatTileRow>
      )}

      {oneVehicle ? (
        <TableCard summary={`${log?.vehicle?.display_name} · ${shortDate(from)} to ${shortDate(to)}`}>
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>Date</Th>
                <Th align="right">Meter</Th>
                <Th align="right">Ran</Th>
                <Th align="right">Fuel</Th>
                <Th align="right">Fuel cost</Th>
                <Th align="right">Service</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {!log?.rows.length ? (
                <TableEmpty colSpan={7} message="Nothing in this range" icon={CalendarDays} />
              ) : (
                (log.rows as RunningLogDay[]).map((row) => {
                  const empty = row.odometer === null && !row.fuel_fills && !row.service_cost;
                  return (
                    <tr
                      key={row.date}
                      className={`${ROW_CLASSES} ${canWrite ? 'cursor-pointer' : ''} ${
                        empty ? 'text-muted-foreground' : ''
                      } ${isWeekend(row.date) ? 'bg-muted/30' : ''}`}
                      tabIndex={canWrite ? 0 : undefined}
                      onClick={canWrite ? () => addReading(row.date) : undefined}
                      onKeyDown={
                        canWrite
                          ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                addReading(row.date);
                              }
                            }
                          : undefined
                      }
                    >
                      <Td>{shortDate(row.date)}</Td>
                      <Td numeric>{row.odometer !== null ? km(row.odometer) : '—'}</Td>
                      <Td numeric>
                        {row.distance_km !== null ? km(row.distance_km) : '—'}
                        {/* Say so when the distance is a stretch, not a day. */}
                        {row.covers_days && row.covers_days > 1 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            over {row.covers_days}d
                          </span>
                        )}
                      </Td>
                      <Td numeric>
                        {row.fuel_quantity ? quantity(row.fuel_quantity, row.fuel_unit) : '—'}
                      </Td>
                      <Td numeric>{row.fuel_cost ? money(row.fuel_cost) : '—'}</Td>
                      <Td numeric>{row.service_cost ? money(row.service_cost) : '—'}</Td>
                      <Td className="text-xs">{row.remarks}</Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableCard>
      ) : (
        <TableCard summary={`${log?.rows.length ?? 0} vehicles · ${shortDate(from)} to ${shortDate(to)}`}>
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>Vehicle</Th>
                <Th align="right">Meter now</Th>
                <Th align="right">Ran</Th>
                <Th align="right">Fuel</Th>
                <Th align="right">Fuel cost</Th>
                <Th align="right">Service</Th>
                <Th align="right">Per km</Th>
                <Th>Log kept</Th>
              </tr>
            </thead>
            <tbody>
              {!log?.rows.length ? (
                <TableEmpty colSpan={8} message="No vehicles on the register" icon={CalendarDays} />
              ) : (
                (log.rows as RunningLogVehicleRow[]).map((row) => (
                  <tr
                    key={row.vehicle_id}
                    className={`${ROW_CLASSES} cursor-pointer`}
                    tabIndex={0}
                    onClick={() => setVehicle(String(row.vehicle_id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setVehicle(String(row.vehicle_id));
                      }
                    }}
                  >
                    <Td>
                      <span className="font-medium">{row.vehicle_number}</span>
                      {row.nickname && (
                        <span className="ml-2 text-xs text-muted-foreground">{row.nickname}</span>
                      )}
                    </Td>
                    <Td numeric>{km(row.last_odometer)}</Td>
                    <Td numeric className="font-semibold">
                      {km(row.distance_km)}
                    </Td>
                    <Td numeric>{quantity(row.fuel_quantity, row.fuel_unit)}</Td>
                    <Td numeric>{money(row.fuel_cost)}</Td>
                    <Td numeric>{money(row.service_cost)}</Td>
                    <Td numeric>{row.cost_per_km ? rupees(row.cost_per_km) : '—'}</Td>
                    <Td>
                      <StatusPill tone={row.days_missing ? 'warn' : 'done'} dot>
                        {row.days_with_reading} / {row.days_in_range} days
                      </StatusPill>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      )}

      <DailyReadingDialog
        open={readingOpen}
        onOpenChange={(open) => {
          setReadingOpen(open);
          if (!open) setReadingDate(undefined);
        }}
        vehicles={vehicles}
        vehicleId={vehicle ? Number(vehicle) : undefined}
        onDate={readingDate}
      />
    </div>
  );
}
