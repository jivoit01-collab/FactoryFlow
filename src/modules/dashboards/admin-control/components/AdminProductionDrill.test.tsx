import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProduction } from '../types';
import { AdminProductionDrill } from './AdminProductionDrill';

function production(over: Partial<AdminProduction> = {}): AdminProduction {
  return {
    mtd_tons: 2_151.7,
    mtd_pieces: 180_400,
    planned_items_tons: 1_610.9,
    planned_items_pct: 46.2,
    unplanned_tons: 540.8,
    today_tons: 45.3,
    producing_days: 22,
    avg_tons_per_producing_day: 97.8,
    plan_tons: 4_320.3,
    plan_to_date_tons: 3_456.2,
    plan_pct: 49.8,
    required_tons_per_day: 361.4,
    remaining_days: 6,
    plan_name: 'September plan',
    warehouse: 'BH-BT',
    unweighed_lines: 0,
    basis: 'Every production receipt onto the finished floor.',
    trend: [
      { date: '2026-09-22', label: '22', tons: 118.4 },
      { date: '2026-09-23', label: '23', tons: 0 },
      { date: '2026-09-24', label: '24', tons: 45.3 },
    ],
    ...over,
  };
}

/** A row of the panel's own table, by the day it names. */
function row(label: string) {
  const node = screen.getByText(label).closest('tr');
  if (!node) throw new Error(`no row for ${label}`);
  return node as HTMLTableRowElement;
}

const stats = () => document.querySelector('.ops-drill__stats') as HTMLElement;
const cut = () => document.querySelector('.ops-drill__cut') as HTMLElement;

describe('AdminProductionDrill', () => {
  it('opens with the tile’s own figures above the days that make them up', () => {
    render(
      <AdminProductionDrill production={production()} period="1–24 Sept" onClose={vi.fn()} />,
    );

    // A panel that quietly disagrees with the tile that opened it is worse than
    // none, so the stats strip repeats what the tile said.
    expect(within(stats()).getByText('2,151.7 T')).toBeInTheDocument();
    expect(within(stats()).getByText('45.3 T')).toBeInTheDocument();
  });

  it('says out loud that the table does not add up to the month above it', () => {
    // THE ONE PANEL ON THIS BOARD WHOSE ROWS ARE NOT ITS FIGURE SPLIT. The
    // stats are the month; the table is the trend window. Everywhere else a
    // breakdown that failed to add up would be a bug, so the place it is
    // intended has to be stated rather than discovered by summing the column.
    render(
      <AdminProductionDrill production={production()} period="1–24 Sept" onClose={vi.fn()} />,
    );

    expect(screen.getByText(/the last 3 days in the table below/)).toHaveTextContent(
      'which do not add up to it',
    );
  });

  it('carries the denominator with the average rather than the average alone', () => {
    // "97.8 T" over four producing days and over twenty-two are different
    // claims about the same plant.
    render(<AdminProductionDrill production={production()} period="" onClose={vi.fn()} />);

    expect(within(stats()).getByText('97.8 T over 22 days')).toBeInTheDocument();
  });

  it('names a day of nothing rather than printing it as a tonnage', () => {
    // `0.0 T` and a day nobody reported look identical in a column of figures,
    // and only one of them is a fact about the plant.
    render(<AdminProductionDrill production={production()} period="" onClose={vi.fn()} />);

    expect(within(row('23')).getByText('nothing made')).toBeInTheDocument();
    expect(within(row('22')).getByText('118.4 T')).toBeInTheDocument();
    expect(within(row('22')).getByText('+20.6 T')).toBeInTheDocument();
    expect(within(row('24')).getByText('−52.5 T')).toBeInTheDocument();
  });

  it('does not measure a shut day against an average that excluded it', () => {
    // The average's denominator is PRODUCING days, so a day that made nothing
    // is not 97.8 T below it — it is outside the population it was taken over.
    render(<AdminProductionDrill production={production()} period="" onClose={vi.fn()} />);

    expect(within(row('23')).getByText('not a producing day')).toBeInTheDocument();
  });

  it('cannot compare against an average that does not exist', () => {
    // No producing day yet is not "every day is average". A rule says the
    // comparison could not be made; a zero would say it was made and came out
    // even.
    render(
      <AdminProductionDrill
        production={production({ avg_tons_per_producing_day: null, producing_days: 0 })}
        period=""
        onClose={vi.fn()}
      />,
    );

    expect(within(stats()).getByText('—')).toBeInTheDocument();
    expect(within(row('22')).getByText('—')).toBeInTheDocument();
    // Still a real nil, which does not depend on there being an average.
    expect(within(row('23')).getByText('nothing made')).toBeInTheDocument();
    expect(within(row('23')).getByText('not a producing day')).toBeInTheDocument();
  });

  it('states a plan nobody filed instead of drawing four rules', () => {
    render(
      <AdminProductionDrill
        production={production({
          plan_tons: null,
          plan_to_date_tons: null,
          plan_pct: null,
          planned_items_tons: null,
          planned_items_pct: null,
          unplanned_tons: null,
          required_tons_per_day: null,
          plan_name: null,
        })}
        period=""
        onClose={vi.fn()}
      />,
    );

    expect(within(cut()).getByText(/No plan is filed for this month/)).toBeInTheDocument();
    // And the stat that would otherwise read "0 T a day" — which is a plan
    // already met, the opposite of what is true.
    expect(within(stats()).getByText('no plan filed')).toBeInTheDocument();
  });

  it('names the plan and separates what it never listed from what it did', () => {
    render(<AdminProductionDrill production={production()} period="" onClose={vi.fn()} />);

    expect(within(cut()).getByText('September plan')).toBeInTheDocument();
    expect(within(cut()).getByText('4,320.3 T')).toBeInTheDocument();
    // The headline counts unplanned output and the target cannot speak for it,
    // so the panel keeps the two apart.
    expect(within(cut()).getByText('The plan never listed')).toBeInTheDocument();
    expect(within(cut()).getByText('540.8 T')).toBeInTheDocument();
    expect(within(cut()).getByText('46% attained')).toBeInTheDocument();
  });

  it('names lines made in pieces, which the tonnage cannot speak for', () => {
    render(
      <AdminProductionDrill
        production={production({ unweighed_lines: 7 })}
        period=""
        onClose={vi.fn()}
      />,
    );

    expect(within(cut()).getByText('Lines with no litre volume')).toBeInTheDocument();
    expect(
      within(cut()).getByText('made in pieces, absent from the tonnage'),
    ).toBeInTheDocument();
  });

  it('states an empty trend window rather than drawing a blank table', () => {
    render(
      <AdminProductionDrill production={production({ trend: [] })} period="" onClose={vi.fn()} />,
    );

    expect(screen.getByText('The trend window carries no days.')).toBeInTheDocument();
  });
});
