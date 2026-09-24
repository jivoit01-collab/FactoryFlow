import { OpsDrill } from '../../logistics-control/components';
import type { AdminFgStorage } from '../types';
import { daysSince, NO_VALUE, pct, tons, whole } from '../utils';

/**
 * A store as this table reads it — rated or not.
 *
 * The payload keeps the two apart (`rows` and `unrated`) because the headline
 * tonnage counts only the rated ones, and a total whose denominator is missing
 * a building is not a percentage. The table puts them back together, because
 * the question a reader opens this panel with is "what is standing where" and
 * a store left out of the list is a store nobody manages. `rated` is what keeps
 * the distinction visible once they are in one column.
 */
interface FgDrillRow {
  warehouse: string;
  label: string;
  tons: number;
  capacity_tons: number | null;
  used_pct: number | null;
  free_tons: number | null;
  last_audit_date: string | null;
  unweighed_items: number;
  rated: boolean;
}

/** When the floor was last physically counted, in the unit people say it in. */
function lastCounted(iso: string | null): string {
  const days = daysSince(iso);
  if (days === null) return 'never counted';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export interface AdminFgDrillProps {
  fg: AdminFgStorage;
  onClose: () => void;
}

/**
 * Which stores the finished goods are standing in.
 *
 * The tile carries one tonnage, one percentage and a bar per store. What it
 * cannot carry is the pair of things that decide whether either figure can be
 * trusted: how long ago each floor was physically counted, and how much of the
 * warehouse the tonnage does not speak for at all.
 *
 * A CONFIDENT TOTAL OVER A HALF-WEIGHED WAREHOUSE LOOKS EXACTLY LIKE A CORRECT
 * ONE. SKUs with no case weight and rows stocked by mass or volume are in the
 * building and out of the tonnage, so they are stated above the table rather
 * than left to be inferred from a number that cannot show them.
 */
export function AdminFgDrill({ fg, onClose }: AdminFgDrillProps) {
  const rows: FgDrillRow[] = [
    ...fg.rows.map((row) => ({ ...row, rated: true })),
    // Appended rather than interleaved: they are the exception the totals
    // above exclude, and a reader scanning down should meet the stores the
    // percentage speaks for first.
    ...fg.unrated.map((row) => ({
      ...row,
      capacity_tons: null,
      used_pct: null,
      free_tons: null,
      last_audit_date: null,
      unweighed_items: 0,
      rated: false,
    })),
  ];

  const blind = fg.unweighed_items + fg.non_piece_items;

  return (
    <OpsDrill
      title="Total FG storage"
      // The Storage band's hue — `AdminBand` maps storage onto the warehouse
      // teal, which this room has already learned means space.
      domain="warehouse"
      subtitle={fg.basis}
      onClose={onClose}
      stats={[
        { label: 'On hand', value: `${tons(fg.total_tons)} T` },
        {
          label: 'Rated',
          // A rule and the reason, never a partial denominator: adding up the
          // stores that happen to be rated and calling it the capacity is how
          // a board reports 61% of a warehouse it has only half measured.
          value: fg.capacity_tons == null ? 'not every store is rated' : `${tons(fg.capacity_tons)} T`,
        },
        { label: 'Space used', value: fg.used_pct == null ? NO_VALUE : pct(fg.used_pct) },
        {
          label: 'Still free',
          value: fg.free_tons == null ? NO_VALUE : `${tons(fg.free_tons)} T`,
        },
      ]}
      breakdown={{
        title: 'What the tonnage does not speak for',
        empty: 'Every SKU in these stores converts to a tonnage.',
        items:
          blind === 0
            ? []
            : [
                ...(fg.unweighed_items > 0
                  ? [
                      {
                        key: 'unweighed',
                        label: 'SKUs with no case weight',
                        value: whole(fg.unweighed_items),
                        sub: 'in the building, out of the tonnage',
                      },
                    ]
                  : []),
                ...(fg.non_piece_items > 0
                  ? [
                      {
                        key: 'non-piece',
                        label: 'Not stocked in pieces',
                        value: whole(fg.non_piece_items),
                        sub: 'by mass or volume — no pack factor applies',
                      },
                    ]
                  : []),
              ],
      }}
      rows={rows}
      rowKey={(row: FgDrillRow) => row.warehouse}
      empty="SAP returned no finished goods in these stores."
      columns={[
        {
          label: 'Store',
          cell: (row: FgDrillRow) => (
            <span className="adm-dstore">
              {row.label}
              {!row.rated && <em> · outside the rating</em>}
              {row.unweighed_items > 0 && <em> · {row.unweighed_items} SKUs unweighed</em>}
            </span>
          ),
        },
        { label: 'Tonnes', cell: (row: FgDrillRow) => `${tons(row.tons)} T`, numeric: true },
        {
          label: 'Rated',
          // Never 0 T on an unrated store. Zero capacity and no capacity look
          // the same in a column of figures and mean opposite things.
          cell: (row: FgDrillRow) =>
            row.capacity_tons == null ? NO_VALUE : `${tons(row.capacity_tons)} T`,
          numeric: true,
          dim: true,
        },
        {
          label: 'Space used',
          cell: (row: FgDrillRow) => (row.used_pct == null ? NO_VALUE : pct(row.used_pct)),
          numeric: true,
        },
        {
          label: 'Free',
          cell: (row: FgDrillRow) => (row.free_tons == null ? NO_VALUE : `${tons(row.free_tons)} T`),
          numeric: true,
          dim: true,
        },
        {
          label: 'Last counted',
          // The age of the count, beside the figure the count produced. A
          // tonnage nobody has verified since July is a different claim from
          // the same tonnage verified yesterday, and the column is the only
          // place on this board that says which one a reader is looking at.
          cell: (row: FgDrillRow) => (row.rated ? lastCounted(row.last_audit_date) : NO_VALUE),
          dim: true,
        },
      ]}
    />
  );
}
