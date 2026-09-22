import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CivilProject } from '../types';
import { CivilProjectTable } from './CivilProjectTable';

/**
 * A fixed "today" for every case below.
 *
 * The board judges work against time elapsed, so a test that used the real
 * clock would report a project as on programme in March and behind in
 * September. Every date in the fixtures is placed relative to this one.
 */
const TODAY = new Date('2026-09-21T09:00:00');

function project(over: Partial<CivilProject> = {}): CivilProject {
  return {
    id: 'p1',
    name: 'New Warehouse',
    location: 'North yard',
    contractor: 'Awarded',
    stage: 'structure',
    area_sqft: 40_500,
    plot: { length_ft: 300, width_ft: 135 },
    money: { budget: 35_000_000, spent: 15_000_000 },
    progress_pct: 38,
    // Half the programme gone on TODAY: 1 Apr 2026 to 28 Feb 2027.
    schedule: { start: '2026-04-01', end: '2027-02-28', baseline_end: null },
    note: null,
    ...over,
  };
}

/** The row a project prints, found by its name. */
function row(name: string): HTMLElement {
  const cell = screen.getByText(name).closest('tr');
  if (!cell) throw new Error(`no row for ${name}`);
  return cell as HTMLElement;
}

describe('CivilProjectTable — a figure with no source is a rule, never a zero', () => {
  it('draws a hatched track and no share where nothing has been billed', () => {
    render(
      <CivilProjectTable
        projects={[project({ money: { budget: 21_000_000, spent: null } })]}
        today={TODAY}
      />,
    );

    const cells = within(row('New Warehouse'));
    // The sanction is known, so it prints.
    expect(cells.getByText('₹2.10 Cr')).toBeInTheDocument();
    // The spend is not, and must not read as ₹0 — nor may the bar read as an
    // empty track, which is what an unbilled and an unfunded project would
    // otherwise have in common.
    expect(cells.getByText('nothing billed yet')).toBeInTheDocument();
    expect(row('New Warehouse').querySelector('.civ-unknown')).not.toBeNull();
  });

  it('says a project is uncertified rather than quietly passing it', () => {
    render(<CivilProjectTable projects={[project({ progress_pct: null })]} today={TODAY} />);

    const cells = within(row('New Warehouse'));
    // NOT "on programme". A project nobody has measured is not one going well,
    // and the tag that says so must be the nil tone rather than a condition.
    expect(cells.getByText('not certified')).toBeInTheDocument();
    expect(cells.getByText('not certified').className).toContain('ops-t-nil');
    expect(row('New Warehouse').querySelector('.civ-ring[data-nil]')).not.toBeNull();
  });

  it('names the missing drawing instead of printing a nil area', () => {
    render(
      <CivilProjectTable projects={[project({ area_sqft: null, plot: null })]} today={TODAY} />,
    );

    expect(within(row('New Warehouse')).getByText('no approved drawing')).toBeInTheDocument();
  });
});

describe('CivilProjectTable — slippage is work against time, not against money', () => {
  it('reports a project behind its calendar even though its spend looks modest', () => {
    // 38% built, ~52% of the programme gone, and only 43% of the budget drawn.
    // Read against MONEY this project is comfortable; read against the
    // calendar it is two weeks' work short, which is the honest answer.
    render(<CivilProjectTable projects={[project()]} today={TODAY} />);

    const cells = within(row('New Warehouse'));
    expect(cells.getByText(/pts behind/)).toBeInTheDocument();
    expect(cells.getByText(/pts behind/).className).toContain('ops-t-bad');
    expect(cells.getByText('43% drawn')).toBeInTheDocument();
  });

  it('leaves a project inside the slack on programme', () => {
    render(<CivilProjectTable projects={[project({ progress_pct: 50 })]} today={TODAY} />);

    expect(within(row('New Warehouse')).getByText('on programme')).toBeInTheDocument();
  });

  it('states an overrun in words rather than as a negative duration', () => {
    render(
      <CivilProjectTable
        projects={[
          project({ schedule: { start: '2026-01-01', end: '2026-08-31', baseline_end: null } }),
        ]}
        today={TODAY}
      />,
    );

    expect(within(row('New Warehouse')).getByText(/over$/)).toBeInTheDocument();
  });
});

describe('CivilProjectTable — the register it is not', () => {
  it('marks every sample row, not only the board header', () => {
    render(<CivilProjectTable projects={[project()]} sample today={TODAY} />);

    // A screenshot of one row is how a figure from this board reaches somebody
    // who never saw the notice at the top of it.
    expect(within(row('New Warehouse')).getByText('sample')).toBeInTheDocument();
    expect(row('New Warehouse').getAttribute('data-sample')).toBe('1');
  });

  it('keeps the original committed date where the programme has been re-based', () => {
    render(
      <CivilProjectTable
        projects={[
          project({
            schedule: { start: '2026-04-01', end: '2027-02-28', baseline_end: '2026-12-31' },
          }),
        ]}
        today={TODAY}
      />,
    );

    expect(within(row('New Warehouse')).getByText(/first committed Dec 2026/)).toBeInTheDocument();
  });

  it('shows nothing rather than a row standing in for one', () => {
    render(<CivilProjectTable projects={[]} today={TODAY} />);

    expect(screen.getByText(/No project is on the board/)).toBeInTheDocument();
  });
});
