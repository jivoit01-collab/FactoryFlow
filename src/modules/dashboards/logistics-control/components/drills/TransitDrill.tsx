import { useMemo } from 'react';

import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, decimal, shortDate, whole } from './format';
import { TRANSIT_BAND_LABELS, TRANSIT_BAND_ORDER } from './labels';

type Load = Board['transit']['loads'][number];

/** One age band of stock still on the road. */
interface BandGroup {
  band: string;
  label: string;
  loads: number;
  tonnes: number;
  /** Days the oldest load in the band has been out. */
  oldest: number;
}

/** The unreceived invoices in one age band, oldest first. */
function BandLoads({ label, loads }: { label: string; loads: Load[] }) {
  const sorted = [...loads].sort((a, b) => (b.days_out ?? 0) - (a.days_out ?? 0));
  const tonnes = loads.reduce((total, load) => total + (load.tonnes ?? 0), 0);
  const unweighed = loads.filter((load) => (load.unweighed_lines ?? 0) > 0).length;

  return (
    <DrillSub
      lede={`On the road ${label.toLowerCase()}`}
      stats={
        <>
          <b>{whole(loads.length)}</b> {loads.length === 1 ? 'load' : 'loads'} ·{' '}
          <b>{decimal(tonnes, 2)}</b> t
          {/* The disclosure the tile carries, restated where the rows are: a
              tonnage over a partly-weighed set is a floor, and the reader has
              to be able to see which loads made it one. */}
          {unweighed > 0 && (
            <>
              {' '}
              · <b>{whole(unweighed)}</b> part-weighed
            </>
          )}
        </>
      }
      rows={sorted}
      rowKey={(load) => String(load.doc_num)}
      empty="Nothing is on the road in this band."
      columns={[
        { label: 'Invoice', cell: (load) => String(load.doc_num), width: '18%' },
        { label: 'Dispatched', cell: (load) => shortDate(load.doc_date), dim: true, width: '18%' },
        {
          label: 'Days out',
          cell: (load) => whole(load.days_out ?? 0),
          numeric: true,
          width: '16%',
        },
        {
          label: 'Tonnes',
          cell: (load) => decimal(load.tonnes ?? 0, 2),
          numeric: true,
          width: '16%',
        },
        {
          label: 'Lines with no weight',
          numeric: true,
          dim: true,
          width: '32%',
          cell: (load) => (load.unweighed_lines > 0 ? whole(load.unweighed_lines) : '—'),
        },
      ]}
    />
  );
}

/** What is invoiced out and unreceived, by age, and the invoices behind one. */
export function TransitDrill({
  transit,
  onClose,
}: {
  transit: Board['transit'];
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();

  const byBand = useMemo(() => collect(transit.loads, (load) => load.band), [transit.loads]);

  /*
   * One row per age band, freshest first — the list is read as a clock running
   * out. A load sits in exactly one band, so the rows add back to the totals
   * above them.
   */
  const bands = useMemo<BandGroup[]>(
    () =>
      [...byBand.entries()]
        .map(([band, loads]) => ({
          band,
          label: TRANSIT_BAND_LABELS[band] ?? band,
          loads: loads.length,
          tonnes: loads.reduce((total, load) => total + (load.tonnes ?? 0), 0),
          oldest: loads.reduce((worst, load) => Math.max(worst, load.days_out ?? 0), 0),
        }))
        .sort(
          (a, b) => TRANSIT_BAND_ORDER.indexOf(a.band) - TRANSIT_BAND_ORDER.indexOf(b.band),
        ),
    [byBand],
  );

  return (
    <OpsDrill
      title="Stock in transit"
      subtitle="Invoiced out, no goods receipt against it in SAP — by age, open one for its invoices"
      domain="transport"
      onClose={onClose}
      stats={[
        { label: 'Tonnes', value: decimal(transit.totals.tonnes) },
        { label: 'Loads', value: whole(transit.totals.loads) },
        { label: 'Over 7 days', value: whole(transit.bands?.stale.loads ?? 0) },
      ]}
      rows={bands}
      rowKey={(row) => row.band}
      empty="Everything dispatched has been received in SAP."
      loading={transit.loading}
      onRowClick={(row) => toggle(row.band)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <BandLoads label={row.label} loads={byBand.get(row.band) ?? []} />
      )}
      columns={[
        { label: 'Band', cell: (row) => row.label },
        { label: 'Loads', cell: (row) => whole(row.loads), numeric: true },
        { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 2), numeric: true },
        {
          label: 'Share of the road',
          numeric: true,
          cell: (row) =>
            transit.totals.tonnes > 0
              ? `${decimal((row.tonnes / transit.totals.tonnes) * 100, 1)}%`
              : '—',
        },
        {
          label: 'Oldest',
          cell: (row) => `${whole(row.oldest)} days`,
          numeric: true,
          dim: true,
        },
      ]}
    />
  );
}
