import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminCost, AdminCostSlice } from '../types';
import { AdminCostDrill } from './AdminCostDrill';

function slice(over: Partial<AdminCostSlice> = {}): AdminCostSlice {
  return {
    key: 'labour',
    label: 'Labour',
    bucket: 'LABOUR',
    amount: 858_000,
    has_source: true,
    warning: null,
    share_pct: 14.9,
    detail: '1,320 across 4 of 5 departments over 21 days',
    detail_value: 1320,
    today: 35_750,
    today_detail: '55 on the floors today',
    today_detail_value: 55,
    today_detail_unit: 'in',
    rows: [
      { label: 'production(oil)', detail: '1,128 man-days', amount: 733_200, today: 31_850 },
      { label: 'Boiling Floor 1', detail: '123 man-days', amount: 79_950, today: 1_300 },
      { label: 'Warehouse Basement', detail: '37 man-days', amount: 24_050, today: 1_300 },
      { label: 'Scrap', detail: '32 man-days', amount: 20_800, today: 1_300 },
    ],
    basis: 'Labour is production(oil), Warehouse Basement, Dock, Scrap, Boiling Floor 1 only.',
    ...over,
  };
}

const MAINTENANCE = slice({
  key: 'maintenance',
  label: 'Maintenance',
  bucket: 'MAINTENANCE',
  amount: 0,
  share_pct: 0,
  detail: null,
  detail_value: null,
  today: 0,
  today_detail: null,
  rows: [],
  basis: null,
});

function cost(slices: AdminCostSlice[]): AdminCost {
  return {
    currency: 'INR',
    total: 858_000,
    today_total: 35_750,
    avg_per_day: 273_896,
    slices,
    warnings: [],
    electricity_note: '',
  };
}

/** A row of the panel's own table, by the cost line it names. */
function row(label: string) {
  const node = screen.getByText(label).closest('tr');
  if (!node) throw new Error(`no row for ${label}`);
  return node as HTMLTableRowElement;
}

describe('AdminCostDrill', () => {
  it('opens with the tile’s own figures above the lines that make them up', () => {
    render(<AdminCostDrill cost={cost([slice()])} period="1–21 Sept" onClose={vi.fn()} />);

    // A drill-down that disagrees with the tile that opened it is worse than
    // none, so the stats strip repeats what the tile said. Scoped to that
    // strip: the same figures appear again in the table underneath, which is
    // the point — they have to match.
    const stats = document.querySelector('.ops-drill__stats') as HTMLElement;
    expect(within(stats).getByText('₹8.58 L')).toBeInTheDocument();
    expect(within(stats).getByText('₹35,750')).toBeInTheDocument();
    expect(within(stats).getByText('₹2.74 L')).toBeInTheDocument();
    expect(screen.getByText(/1–21 Sept/)).toBeInTheDocument();
  });

  it('opens a line in place to show the rows behind it', () => {
    render(<AdminCostDrill cost={cost([slice()])} period="" onClose={vi.fn()} />);

    expect(screen.queryByText('production(oil)')).toBeNull();
    fireEvent.click(row('Labour'));

    // The departments, and the roll-up recomputed from them — not carried down
    // from the row above, so a disagreement would be visible.
    expect(screen.getByText('production(oil)')).toBeInTheDocument();
    expect(screen.getByText('1,128 man-days')).toBeInTheDocument();
    const sub = document.querySelector('.ops-drill__substats');
    expect(sub).toHaveTextContent('4 rows');
    expect(sub).toHaveTextContent('₹8.58 L');
    expect(sub).toHaveTextContent('₹35,750');

    // The line's basis is the lede: why this figure differs from the same one
    // on the expense wall is what a reader with both screens open needs most.
    expect(screen.getByText(/Labour is production\(oil\)/)).toBeInTheDocument();
  });

  it('shuts the open line when it is clicked again', () => {
    vi.useFakeTimers();
    try {
      render(<AdminCostDrill cost={cost([slice()])} period="" onClose={vi.fn()} />);

      fireEvent.click(row('Labour'));
      expect(screen.getByText('Scrap')).toBeInTheDocument();

      fireEvent.click(row('Labour'));
      // Shut to anything that asks, and folding shut on screen: the rows are
      // held for the length of the fold and no longer. See `OpsDrill`.
      expect(row('Labour').getAttribute('aria-expanded')).toBe('false');
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByText('Scrap')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * A row that looks clickable and is not is worse than one that never
   * offered. Maintenance is nil most months and has nothing under it.
   */
  it('does not offer to open a line with nothing behind it', () => {
    render(<AdminCostDrill cost={cost([slice(), MAINTENANCE])} period="" onClose={vi.fn()} />);

    expect(row('Labour').className).toContain('ops-drill__rowopen');
    expect(row('Maintenance').className).not.toContain('ops-drill__rowopen');

    fireEvent.click(row('Maintenance'));
    expect(document.querySelector('.ops-drill__subrow')).toBeNull();
  });

  /*
   * The screen and its server deploy on separate pushes, so a board can be
   * served by a backend that predates the drill and sends no `rows` key at all.
   * That read the whole page down with a TypeError once; a missing key must now
   * mean the same as an empty list — there is no detail to open.
   */
  it('survives a payload from a server that sends no rows at all', () => {
    const older = slice({ rows: undefined });
    render(<AdminCostDrill cost={cost([older])} period="" onClose={vi.fn()} />);

    expect(row('Labour').className).not.toContain('ops-drill__rowopen');
    fireEvent.click(row('Labour'));
    expect(document.querySelector('.ops-drill__subrow')).toBeNull();
  });

  /*
   * "Read, and nothing was spent" and "this payload cannot say" are different
   * answers, and the board renders them differently everywhere else.
   */
  it('tells a real nil today apart from a figure it cannot give', () => {
    const mixed = slice({
      rows: [
        { label: 'production(oil)', detail: '1,128 man-days', amount: 733_200, today: 0 },
        { label: 'A spare', detail: 'Spare', amount: 124_800, today: null },
      ],
    });
    render(<AdminCostDrill cost={cost([mixed])} period="" onClose={vi.fn()} />);
    fireEvent.click(row('Labour'));

    expect(within(row('production(oil)')).getByText('nil')).toBeInTheDocument();
    expect(within(row('A spare')).getByText('—')).toBeInTheDocument();
  });

  it('prints why a line is nil today rather than a zero', () => {
    const power = slice({
      key: 'electricity',
      label: 'Electricity',
      bucket: 'ELECTRICITY',
      today: 0,
      today_detail: 'no reading entered today',
    });
    render(<AdminCostDrill cost={cost([power])} period="" onClose={vi.fn()} />);

    expect(within(row('Electricity')).getByText('no reading entered today')).toBeInTheDocument();
  });

  /*
   * A LINE WHOSE ROWS ARE NOT WHAT IT IS MADE OF. The payload shape below is
   * the electricity line as the server sent it until it moved onto Oil's
   * sub-meters: the whole Daily Electricity register listed, priced off the
   * ONE main meter in it, because the sub-meters re-measure slices of that
   * same supply. A head that added the rows up would state a rival total for a
   * month the tile has just priced at a third of it — which is still what this
   * component must do for any line that sends `rows_sum_to_line: false`, and
   * a backend on the older basis is exactly that until it deploys.
   */
  it('names the row a line was priced from where the rows do not add up to it', () => {
    const power = slice({
      key: 'electricity',
      label: 'Electricity',
      bucket: 'ELECTRICITY',
      amount: 1_203_370,
      detail: 'KWH · 169,730 units',
      detail_value: 169_730,
      today: 0,
      today_detail: 'no reading entered today',
      rows: [
        { label: 'KVAH', detail: '180,840 units at ₹7.00/unit', amount: 1_284_020, today: null },
        {
          label: 'KWH',
          detail: '169,730 units at ₹7.00/unit',
          amount: 1_203_370,
          today: null,
          is_line: true,
        },
        {
          label: 'Production Floor OIL',
          detail: '21,804 units at ₹7.00/unit',
          amount: 152_628,
          today: null,
        },
      ],
      rows_sum_to_line: false,
      basis: 'The main meter Jivo Oil’s supply comes in on, alone.',
    });
    render(<AdminCostDrill cost={cost([power])} period="" onClose={vi.fn()} />);
    fireEvent.click(row('Electricity'));

    const sub = document.querySelector('.ops-drill__substats') as HTMLElement;
    expect(sub).toHaveTextContent('3 rows');
    expect(sub).toHaveTextContent('KWH');
    expect(sub).toHaveTextContent('₹12.03 L');
    // NOT the ₹26.40 L these three add up to: KVAH is the grid's own KWH as
    // apparent energy and the floor is a slice of it, so the sum is the same
    // electricity counted three times.
    expect(sub).not.toHaveTextContent('₹26.40 L');

    // And the row it came from says so, because size does not: the biggest
    // meter in the list is the one that must never be the line.
    const table = document.querySelector('.ops-drill__subtable') as HTMLElement;
    expect(within(table).getByText('KWH').closest('tr')).toHaveTextContent('· the line');
    expect(within(table).getByText('KVAH').closest('tr')).not.toHaveTextContent('the line');
  });

  it('names the lines nobody has sourced', () => {
    const unsourced = slice({
      key: 'salary',
      label: 'Salary',
      bucket: 'SALARY',
      amount: 0,
      has_source: false,
      warning: "No 'factory-salary' rate in force.",
      rows: [],
    });
    render(<AdminCostDrill cost={cost([slice(), unsourced])} period="" onClose={vi.fn()} />);

    // In the stats strip, where a reader looks before trusting the total.
    expect(screen.getByText('Unsourced lines').parentElement).toHaveTextContent('Salary');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<AdminCostDrill cost={cost([slice()])} period="" onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
