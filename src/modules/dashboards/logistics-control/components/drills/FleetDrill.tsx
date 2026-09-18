import { useMemo } from 'react';

import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, whole } from './format';
import { VEHICLE_STATE_LABELS, VEHICLE_STATE_ORDER } from './labels';

type Vehicle = Board['fleet']['vehicles'][number];

/** One duty state and the trucks sitting in it. */
interface StateGroup {
  state: string;
  label: string;
  trucks: number;
  /** Trucks in the state with a document behind them — a BST, an invoice. */
  onPaper: number;
}

/** The trucks in one duty state. */
function StateVehicles({ label, vehicles }: { label: string; vehicles: Vehicle[] }) {
  return (
    <DrillSub
      lede={`The trucks ${label.toLowerCase()}`}
      stats={
        <>
          <b>{whole(vehicles.length)}</b> {vehicles.length === 1 ? 'truck' : 'trucks'}
        </>
      }
      rows={[...vehicles].sort((a, b) => a.vehicle_no.localeCompare(b.vehicle_no))}
      rowKey={(row) => row.vehicle_no}
      empty="No truck is in this state."
      columns={[
        { label: 'Vehicle', cell: (row) => row.vehicle_no, width: '22%' },
        {
          // "On a branch transfer" is the answer to a question nobody asks on
          // its own; the one that follows is "which one". A truck with no
          // document behind it — at the plant, off the road — shows a rule
          // rather than a blank, so an empty cell is never mistaken for a
          // reference that failed to load.
          label: 'Document',
          cell: (row) => row.reference || <span className="dim">—</span>,
          width: '28%',
        },
        {
          label: 'Detail',
          cell: (row) => row.detail || <span className="dim">—</span>,
          dim: true,
          width: '50%',
        },
      ]}
    />
  );
}

/** What the owned fleet is doing today, by duty state, and which trucks. */
export function FleetDrill({ fleet, onClose }: { fleet: Board['fleet']; onClose: () => void }) {
  const { openKey, toggle } = useExpandedRow();

  const byState = useMemo(() => collect(fleet.vehicles, (row) => row.state), [fleet.vehicles]);

  /*
   * One row per duty state, in the order the yard is read: what is available
   * first, what is unavailable last. A truck is in exactly one state, so the
   * rows add up to the fleet.
   */
  const states = useMemo<StateGroup[]>(
    () =>
      [...byState.entries()]
        .map(([state, vehicles]) => ({
          state,
          label: VEHICLE_STATE_LABELS[state] ?? state,
          trucks: vehicles.length,
          onPaper: vehicles.filter((vehicle) => Boolean(vehicle.reference)).length,
        }))
        .sort((a, b) => {
          const left = VEHICLE_STATE_ORDER.indexOf(a.state);
          const right = VEHICLE_STATE_ORDER.indexOf(b.state);
          // A state this build has never heard of sorts last rather than
          // first: an unknown code is not more urgent than a free truck.
          return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
        }),
    [byState],
  );

  return (
    <OpsDrill
      title="Owned fleet"
      subtitle="Today's duty state — open one for its trucks"
      domain="transport"
      onClose={onClose}
      stats={[
        // A dash where no fleet size is configured. Nobody having entered one
        // is not the same as owning no trucks, and this panel lists the
        // registrations that prove it.
        { label: 'Owned', value: fleet.owned == null ? '—' : whole(fleet.owned) },
        { label: 'Free', value: whole(fleet.free) },
        { label: 'On a job', value: whole(fleet.onBst + fleet.onDispatch) },
        { label: 'Off the road', value: whole(fleet.outOfService) },
      ]}
      rows={states}
      rowKey={(row) => row.state}
      empty="No registrations have been entered on the settings screen."
      loading={fleet.loading}
      onRowClick={(row) => toggle(row.state)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <StateVehicles label={row.label} vehicles={byState.get(row.state) ?? []} />
      )}
      columns={[
        { label: 'State', cell: (row) => row.label },
        { label: 'Trucks', cell: (row) => whole(row.trucks), numeric: true },
        {
          label: 'Share of the fleet',
          numeric: true,
          cell: (row) =>
            fleet.vehicles.length > 0
              ? `${Math.round((row.trucks / fleet.vehicles.length) * 100)}%`
              : '—',
        },
        {
          label: 'On a document',
          numeric: true,
          dim: true,
          // A truck on a job with nothing behind it is the row worth chasing:
          // the state says it is out, and no paperwork says where.
          cell: (row) =>
            row.onPaper > 0 ? `${whole(row.onPaper)} of ${whole(row.trucks)}` : '—',
        },
      ]}
    />
  );
}
