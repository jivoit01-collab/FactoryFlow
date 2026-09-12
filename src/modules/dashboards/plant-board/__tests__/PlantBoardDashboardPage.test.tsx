import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { PlantBoardResponse } from '../types';

/**
 * The board renders four bands from one response, and says what it cannot say.
 *
 * These are render tests rather than unit tests because the arithmetic all
 * lives server-side (see `plant_board/tests.py`); what can break here is the
 * composition — a band silently missing, a pending tile rendering as a zero, or
 * a degraded band vanishing instead of explaining itself. Each of those looks
 * completely normal on a wall, which is why they are worth a test.
 */

const { mockUsePlantBoard } = vi.hoisted(() => ({ mockUsePlantBoard: vi.fn() }));

vi.mock('../api', () => ({ usePlantBoard: mockUsePlantBoard }));

import PlantBoardDashboardPage from '../pages/PlantBoardDashboardPage';

const PENDING = {
  stock_space: 'warehouse capacity configuration',
  space_percent: 'warehouse capacity configuration',
  last_audited: 'warehouse audit configuration',
  employee_salary: 'salary module',
  labour_salary: 'salary module',
};

/**
 * One day of the waste register. Raw material is always zero here because it
 * is always zero in the register: 794 of 795 live rows are packing material.
 */
function day(
  date: string,
  logs: number,
  pmValue: number,
  pmPieces: number,
  pmOther: { uom: string; qty: number }[] = [],
) {
  return {
    date,
    logs,
    pm_value: pmValue,
    rm_value: 0,
    other_value: 0,
    total_value: pmValue,
    unpriced: 0,
    pm_pieces: pmPieces,
    pm_other: pmOther,
    rm_litres: 0,
    rm_other: [],
  };
}

function board(overrides: Partial<PlantBoardResponse> = {}): PlantBoardResponse {
  return {
    purchase: {
      planning_qty: 1_250_000,
      planning_unit: 'PCS',
      planning_value: 8_000_000,
      issued_value: 2_000_000,
      on_hand_value: 3_000_000,
      open_po_value: 900_000,
      unpriced_count: 0,
      reached_floor_qty: 400_000,
      consumed_qty: 310_000,
      on_hand_qty: 300_000,
      po_count: 14,
      po_lines: 41,
      ordered_qty: 120_000,
      po_received_qty: 78_000,
      po_open_qty: 42_000,
      ordered_value: 1_200_000,
      po_received_value: 780_000,
      po_open_value: 420_000,
      po_closed_lines: 26,
      po_basis: 'POs raised this plan month',
      open_po_qty: 90_000,
      open_po_overdue_count: 172,
      grpo_received_qty: 55_000,
      grpo_basis: 'gate receipts',
      over_purchased_qty: 2_456_000,
      over_purchased_count: 12,
      over_purchase_value: 1_820_000,
      over_purchase_basis: 'PM Requirement: Req after PO on over-purchased rows',
      over_issued_count: 4,
      short_count: 31,
      short_value: 1_820_000,
      sku_count: 196,
      healthy_count: 176,
      below_benchmark_count: 20,
      low_count: 14,
      critical_count: 6,
      below_benchmark_tonnes: 12.5,
      unweighed_below_benchmark: 3,
      benchmark_basis: 'Stock Benchmark filters',
      stores: ['BH-PM', 'BH-BS', 'BH-PC'],
      worst: [],
    },
    store: {
      stock_space: {
        // The business's own three-row area table, minus FR: 16,900 shared
        // across BH-PM/NM/BS, 15,000 more for BH-PM, 7,000 for BH-PC.
        area: {
          sqft: 38_900,
          blocks: [
            {
              key: 'shared',
              label: 'BH-PM, BH-NM, BH-BS',
              warehouses: ['BH-PM', 'BH-NM', 'BH-BS'],
              sqft: 16_900,
            },
            { key: 'pm', label: 'BH-PM', warehouses: ['BH-PM'], sqft: 15_000 },
            { key: 'pc', label: 'BH-PC', warehouses: ['BH-PC'], sqft: 7_000 },
          ],
          store_count: 4,
          held_pieces: 13_474_123,
          held_value: 38_363_431,
          held_items: 761,
          unpriced_items: 0,
          by_store: [],
          // Cleared, so the tile must still read correctly with no occupancy:
          // the state when nobody stands behind the pallet footprint.
          pallets: 0,
          sqft_per_pallet: null,
          stacking_measured_on: '2026-09-11',
          unmeasured_items: 0,
          unmeasured_pieces: 0,
          occupied_sqft: null,
          free_sqft: null,
          occupied_pct: null,
          occupancy_blocked_on: 'Square feet per thousand pieces.',
        },
        stores: [
          { warehouse: 'BH-PM', capacity_tonnes: 500, last_audit_date: '2026-08-01', audit_days_ago: 41 },
          { warehouse: 'BH-BS', capacity_tonnes: 300, last_audit_date: '2026-06-02', audit_days_ago: 101 },
          { warehouse: 'BH-PC', capacity_tonnes: 120, last_audit_date: null, audit_days_ago: null },
        ],
        capacity_tonnes: null,
        capacity_configured: 3,
        store_count: 3,
        last_audit_date: '2026-06-02',
        last_audit_warehouse: 'BH-BS',
        audit_days_ago: 101,
        audit_configured: 2,
        basis: 'settings page',
      },
      non_moving: {
        item_count: 44,
        total_value: 980_000,
        slow_moving_count: 18,
        non_moving_count: 26,
        slow_moving_value: 280_000,
        non_moving_value: 700_000,
        oldest_days: 210,
        recent_count: 100,
        warehouses: ['BH-BS', 'BH-PC', 'BH-PM'],
        items: [],
        basis: 'Non-Moving dashboard rules',
      },
      pm_vehicles_today: {
        count: 6,
        po_count: 8,
        line_count: 19,
        received_qty: 12_000,
        accepted_qty: 9_000,
        rejected_qty: 40,
        awaiting_grpo_qty: 2_960,
      },
      blowing: {
        window_from: '2026-09-01',
        window_to: '2026-09-10',
        daily: [
          { date: '2026-09-04', bottles: 187_000 },
          { date: '2026-09-05', bottles: 84_000 },
          { date: '2026-09-06', bottles: 0 },
          { date: '2026-09-07', bottles: 92_000 },
          { date: '2026-09-08', bottles: 140_000 },
          { date: '2026-09-09', bottles: 145_000 },
          { date: '2026-09-10', bottles: 41_000 },
        ],
        runs: 12,
        uncosted_runs: 1,
        active_days: 8,
        bottles_made: 960_000,
        bottles_rejected: 9_000,
        bottles_good: 951_000,
        avg_bottles_per_day: 120_000,
        cost: 384_000,
        preform_cost: 240_000,
        conversion_cost: 144_000,
        avg_cost_per_day: 48_000,
        cost_per_bottle: 0.4,
        running_runs: 2,
        running_bottles: 41_000,
        running_preform_cost: 180_000,
        running_blowing_cost: 60_000,
        running_cost: 240_000,
        running_uncosted: 0,
        running_started_earlier: 0,
        basis: 'machine counter; cost net of scrap',
      },
    },
    production: {
      planned_qty: 1_040_000,
      produced_qty: 832_000,
      planned_cases: 52_000,
      produced_cases: 41_600,
      attainment_pct: 80,
      // Deliberately NOT 80%: the tonnage ratio is 76%, so a tile printing the
      // piece ratio beside tonne figures fails this fixture.
      planned_tons: 1_040,
      produced_tons: 790,
      attainment_tons_pct: 76,
      unweighed_lines: 2,
      avg_qty_per_active_day: 104_000,
      active_days: 8,
      elapsed_days: 10,
      daily: [],
      // Today off the lines' own register: seven runs across three lines,
      // 4,500 cases planned and 3,150 packed at 20 bottles a case.
      today: {
        date: '2026-09-11',
        planned_qty: 90_000,
        produced_qty: 63_000,
        planned_cases: 4_500,
        produced_cases: 3_150,
        attainment_pct: 70,
        runs: 7,
        lines: 3,
        completed_runs: 4,
        unconverted_runs: 0,
      },
      floor: {
        warehouse: 'BH-PF',
        stock_value: 56_600_000,
        total_pieces: 208_328,
        tons: 190,
        item_count: 121,
        unconfigured_items: 3,
        unweighed_items: 0,
        age: {
          fresh: {
            value: 30_000_000, pieces: 100_000, litres: 100_000,
            tons: 100, items: 60, unweighed: 0,
          },
          d4_7: {
            value: 15_000_000, pieces: 60_000, litres: 60_000,
            tons: 60, items: 40, unweighed: 0,
          },
          d7_plus: {
            value: 9_000_000, pieces: 40_000, litres: 40_000,
            tons: 40, items: 18, unweighed: 0,
          },
          never_shipped: {
            value: 2_600_000, pieces: 8_328, litres: 8_328,
            tons: 8.328, items: 3, unweighed: 0,
          },
        },
        age_basis: 'since stock last left',
      },
      wastage: {
        oil_issued_litres: 500_000,
        oil_packed_litres: 494_000,
        oil_loss_litres: 6_000,
        oil_loss_tons: 6,
        oil_loss_pct: 1.2,
        oil_basis: 'issued vs packed',
        oil_assumed_litre_lines: 0,
        pm_logged_qty: 320,
        pm_log_count: 11,
        pm_approved_count: 9,
        pm_unclassified_count: 0,
        oil_logged_qty: 0,
        pm_basis: 'app logs',
        pm_logged_value: 79_280.0,
        rm_logged_value: 0,
        logged_unpriced_count: 0,
        // The register read day by day on the RUN's date. Nothing against the
        // 6th (a Sunday) and nothing yet against today, because waste is
        // written up a day or more after the shift.
        logged_daily: [
          day('2026-09-05', 20, 4_681.47, 1_895),
          day('2026-09-06', 0, 0, 0),
          day('2026-09-07', 19, 12_181.52, 3_126, [{ uom: 'MTR', qty: 200 }]),
          day('2026-09-08', 25, 9_207.6, 3_142, [{ uom: 'MTR', qty: 80 }]),
          day('2026-09-09', 27, 7_783.9, 3_100, [{ uom: 'MTR', qty: 60 }]),
          day('2026-09-10', 16, 45_425.5, 10_498, [{ uom: 'MTR', qty: 40 }]),
          day('2026-09-11', 0, 0, 0),
        ],
        logged_today: day('2026-09-11', 0, 0, 0),
        logged_latest: day('2026-09-10', 16, 45_425.5, 10_498, [{ uom: 'MTR', qty: 40 }]),
        logged_latest_date: '2026-09-10',
        logged_days_behind: 1,
        logged_standalone_count: 0,
        logged_basis: 'waste logs dated by the run',
      },
    },
    shifting: {
      // The keeper's declaration, off the Godown Stock Movements page. Two
      // rows: no standing dispatch column on this half.
      allocated: {
        transfers: 6,
        boxes: 3_000,
        total_pieces: 60_000,
        total_tons: 60,
        tonnage_available: true,
        unweighed_items: 1,
        retracted_movements: 0,
        retracted_pieces: 0,
        routes: [
          {
            route: 'BH-BT',
            name: 'Bhakharpur New Basement',
            is_dispatch: false,
            pieces: 30_000,
            litres: 30_000,
            tons: 30,
            boxes: 1_500,
            item_count: 4,
          },
        ],
      },
      shipped: {
        transfers: 4,
        boxes: 2_600,
        total_pieces: 52_000,
        total_tons: 52,
        tonnage_available: true,
        unweighed_items: 0,
        rejected_pieces: 0,
        rejected_tons: 0,
        routes: [
          {
            route: 'BH-BT',
            name: 'Bhakharpur New Basement',
            is_dispatch: false,
            pieces: 26_000,
            litres: 26_000,
            tons: 26,
            boxes: 1_300,
            item_count: 4,
          },
          {
            route: 'DISPATCH',
            name: 'Sold on to Mart',
            is_dispatch: true,
            pieces: 18_000,
            litres: 18_000,
            tons: 18,
            boxes: 900,
            item_count: 7,
          },
        ],
      },
      basis: 'declaration vs SAP',
    },
    // The business's own six-department table, folded onto the four bands.
    // 30-day month, so a monthly bill divides by 30.
    workforce: {
      days_in_month: 30,
      bands: {
        purchase: {
          employees: null,
          employee_salary_monthly: null,
          employee_cost_per_day: null,
          labour: null,
          labour_salary_monthly: null,
          labour_cost_per_day: null,
          departments: [],
        },
        store: {
          employees: 13,
          employee_salary_monthly: 229_506,
          employee_cost_per_day: 7_650.2,
          labour: 10,
          labour_salary_monthly: 103_000,
          labour_cost_per_day: 3_433.33,
          departments: [],
        },
        production: {
          employees: 85,
          employee_salary_monthly: 1_565_504,
          employee_cost_per_day: 52_183.47,
          labour: 31,
          labour_salary_monthly: 867_695,
          labour_cost_per_day: 28_923.17,
          departments: [],
        },
        shifting: {
          employees: 5,
          employee_salary_monthly: 117_172,
          employee_cost_per_day: 3_905.73,
          labour: null,
          labour_salary_monthly: null,
          labour_cost_per_day: null,
          departments: [],
        },
      },
      total_people: 144,
      total_salary_monthly: 2_882_877,
      total_cost_per_day: 96_095.9,
      unconfigured: [],
      basis: 'typed on the settings page',
    },
    meta: {
      company_code: 'JIVO_OIL',
      date: '2026-09-10',
      plan: {
        abs_id: 24,
        code: 'FCT-24',
        name: 'OIL Monthly Production Planning for the September 2026',
        start_date: '2026-09-01',
        end_date: '2026-09-30',
        is_current: true,
        days_total: 30,
        days_elapsed: 10,
      },
      refresh_seconds: 60,
      generated_at: '2026-09-10T09:00:00Z',
      degraded: [],
      pending: PENDING,
      warnings: [],
      tonnage_basis: '1000 litres = 1 ton, oil and finished goods only.',
    },
    ...overrides,
  };
}

function renderBoard(data: PlantBoardResponse | undefined, extra: Record<string, unknown> = {}) {
  mockUsePlantBoard.mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
    dataUpdatedAt: new Date('2026-09-10T14:29:30+05:30').getTime(),
    ...extra,
  });

  // A router, because the header's settings cog is a Link. The board has
  // exactly one navigation target and this is it.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <PlantBoardDashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/**
 * One tile, by its name.
 *
 * Scoped rather than global because the board deliberately repeats itself: the
 * topbar carries a "Shipped today" total over a "Shipped today" tile, which is
 * the point — the header summarises what the bands detail. A global text query
 * cannot tell them apart, and asserting on the wrong one would pass while
 * testing nothing.
 */
function tile(container: HTMLElement, name: string): HTMLElement {
  const match = [...container.querySelectorAll('.ops-grp')].find(
    (el) => el.querySelector('.ops-nm')?.textContent?.trim() === name,
  );
  if (!match) throw new Error(`No tile named "${name}" on the board`);
  return match as HTMLElement;
}

describe('PlantBoardDashboardPage', () => {
  it('renders all four bands in the order material moves', () => {
    const { container } = renderBoard(board());

    // The rail is the only place a band is named, so it is what proves the
    // band rendered — and its order proves the reading order.
    const rails = [...container.querySelectorAll('.ops-rail p')].map((el) =>
      el.textContent?.trim().split(' ')[0],
    );
    expect(rails).toEqual(['Purchase', 'Store', 'Production', 'Shifting']);
  });

  it('names the plan month it is measured against, not the calendar month', () => {
    renderBoard(board());

    expect(
      screen.getByText(/OIL Monthly Production Planning for the September 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText(/day 10 of 30/)).toBeInTheDocument();
  });

  it('draws a rule where a figure has no source, and says what it waits on', () => {
    const { container } = renderBoard(board());

    // Stock space leads the Store band and carries the audit date with it:
    // both describe the building rather than the stock in it.
    const storeTiles = [...container.querySelectorAll('.ops-b-store .ops-nm')].map((el) =>
      el.textContent?.trim(),
    );
    expect(storeTiles).toEqual([
      'Stock space',
      'Non-moving stock',
      'Packing material in',
      'Blowing this month',
    ]);

    // The Production band reads the daily rate first, then the month against
    // its plan. Pinned so a later edit cannot quietly reshuffle it.
    const productionTiles = [...container.querySelectorAll('.ops-b-production .ops-nm')].map(
      (el) => el.textContent?.trim(),
    );
    expect(productionTiles).toEqual([
      'Today on the lines',
      'Monthly planning',
      'Total stock',
      'Wastage',
    ]);
    // Stock space reports the floor it has and the stock on it; what it
    // cannot say until somebody measures the factor is how much of that floor
    // is in use. The gap is named on the tile rather than filled with an
    // invented number.
    expect(screen.getByText('set the floor a pallet takes')).toBeInTheDocument();

    // An unset figure and a zero must not look the same. Stock space now HAS a
    // count date, so the remaining sourceless figures are the workforce ones,
    // and every one of them draws a rule.
    expect(container.querySelectorAll('.ops-people .ops-nil').length).toBeGreaterThan(0);
  });

  it('gives each band its own people, split company against outside', () => {
    const { container } = renderBoard(board());

    const strip = (band: string) =>
      container.querySelector(`.ops-b-${band} .ops-people`)!;
    const read = (band: string) =>
      [...strip(band).querySelectorAll('.ops-prole')].map((role) => [
        role.querySelector('.k')?.textContent?.trim(),
        role.querySelector('.n')?.textContent?.trim(),
        role.querySelector('.s')?.textContent?.trim(),
      ]);

    // Production: the business's 85 on the payroll and 31 hired in. The money
    // is the MONTHLY bill divided by the 30 days of this month, because a wage
    // is paid for the Sunday too.
    expect(read('production')).toEqual([
      ['Employees', '85', '\u20b952.2k a day'],
      ['Labour', '31', '\u20b928.9k a day'],
    ]);
    expect(strip('production').querySelector('.ops-pcap b')?.textContent).toBe('116');

    // Store: two departments share the employee half \u2014 4 on the blowing line
    // and 9 in the PM warehouse.
    expect(read('store')[0]).toEqual(['Employees', '13', '\u20b97.7k a day']);
  });

  it('draws a rule for a band nobody staffs, never a zero', () => {
    const { container } = renderBoard(board());

    // Purchase has no department at all: buying is desk work, and the people
    // who receive the material are the PM warehouse, under Store. A zero here
    // would say the band is unstaffed and nobody would question it.
    expect(
      container.querySelector('.ops-b-purchase .ops-people')?.textContent,
    ).not.toMatch(/\u20b90/);
    const counts = [
      ...container.querySelectorAll('.ops-b-purchase .ops-prole .n'),
    ].map((el) => el.textContent?.trim());
    expect(counts).toEqual(['\u2014', '\u2014']);

    // And Shifting has staff but no hired labour \u2014 one half known, one not.
    const shifting = [
      ...container.querySelectorAll('.ops-b-shifting .ops-prole .n'),
    ].map((el) => el.textContent?.trim());
    expect(shifting).toEqual(['5', '\u2014']);
  });

  it('totals the whole factory once in the header, and says what it omits', () => {
    renderBoard(board());

    // 144 people and \u20b928.8 L a month across all six departments.
    expect(screen.getByText('\u20b928.8 L')).toBeInTheDocument();
    expect(screen.getByText('144')).toBeInTheDocument();
    expect(screen.getByText('every department counted')).toBeInTheDocument();
    // 103 on the payroll -- 85 production, 4 blowing, 9 warehouse, 5 shifting --
    // against 41 hired in: 31 production and 10 blowing.
    expect(screen.getByText('103 \u00b7 41')).toBeInTheDocument();
  });

  it('names the departments nobody has filled in rather than quietly dropping them', () => {
    const data = board();
    data.workforce!.unconfigured = ['Pm Warehouse', 'Fg Shifting'];
    renderBoard(data);

    expect(screen.getByText('2 departments not counted')).toBeInTheDocument();
  });

  it('says nobody is configured rather than showing an empty factory', () => {
    const data = board({ workforce: null });
    const { container } = renderBoard(data);

    // Every strip a rule, on every band.
    const counts = [...container.querySelectorAll('.ops-prole .n')].map((el) =>
      el.textContent?.trim(),
    );
    expect(counts).toEqual(Array(8).fill('\u2014'));
    expect(
      [...container.querySelectorAll('.ops-prole .s')].every(
        (el) => el.textContent?.trim() === 'Cost unavailable',
      ),
    ).toBe(true);

    // And the reason stated ONCE, in the header, rather than under all four.
    expect(screen.getByText('nobody configured')).toBeInTheDocument();
  });

  it('keeps a degraded band in place and explains it', () => {
    const data = board({ production: null });
    data.meta.degraded = ['production'];
    const { container } = renderBoard(data);

    // The band must still be there — a stage of the factory that vanished
    // reads as a stage with nothing to report.
    const rails = [...container.querySelectorAll('.ops-rail p')].map((el) =>
      el.textContent?.trim().split(' ')[0],
    );
    expect(rails).toContain('Production');
    expect(screen.getByText(/SAP did not answer for the plan and the floor/)).toBeInTheDocument();
    expect(screen.getByText(/1 band unread/)).toBeInTheDocument();

    // And the bands that do not need SAP are untouched.
    expect(tile(container, 'Shipped today')).toBeInTheDocument();
  });

  it('reads two registers down one set of routes, in tonnes', () => {
    const { container } = renderBoard(board());

    // The band is TWO tiles now. The declaration register it used to compare
    // against has never been written to — zero rows, all time — so a third
    // tile could only ever have shown nothing.
    const tiles = [...container.querySelectorAll('.ops-b-shifting .ops-nm')].map((el) =>
      el.textContent?.trim(),
    );
    expect(tiles).toEqual(['Declared today', 'Shipped today']);

    const allocated = tile(container, 'Declared today');
    const shipped = tile(container, 'Shipped today');

    // Tonnes lead both, off the same register at two stages.
    expect(allocated.querySelector('.ops-val b')?.textContent).toBe('60.0');
    expect(allocated.querySelector('.ops-val u')?.textContent).toBe('tonnes');
    expect(shipped.querySelector('.ops-val b')?.textContent).toBe('52.0');

    // The routes read in the SAME ORDER down both tiles, which is what lets a
    // reader compare them by eye. Zero rows stay in place rather than
    // disappearing and shuffling the ones below.
    const routesOf = (card: HTMLElement) =>
      [...card.querySelectorAll('.ops-mkey span')].map((el) => el.textContent?.trim());
    // ONE godown row on the declaration half. A sale off this floor is raised
    // as an invoice and reaches the board through BST, so a standing dispatch
    // row here would read 0.0 t every day of the year. And there is no Gupta
    // row on either half: that godown holds Mart's stock, so a load into it is
    // the sale the Dispatch row already carries.
    expect(routesOf(allocated)).toEqual([
      'BH-BT basement30.0 t',
      'No litre volume1 SKUs',
    ]);
    expect(routesOf(shipped)).toEqual([
      'BH-BT basement26.0 t',
      'Dispatch to Mart18.0 t',
    ]);

    // And each route wears a FIXED tint, so a destination never changes colour
    // on the day it happens to be the biggest.
    const fillsOf = (card: HTMLElement) =>
      [...card.querySelectorAll('.ops-meter i')].map((el) => el.className);
    expect(fillsOf(shipped)).toEqual(['ops-f-main', 'ops-f-light']);
    expect(fillsOf(allocated)).toEqual([
      'ops-f-main',
      // The disclosure row, drawn at zero width.
      'ops-f-mute',
    ]);
  });

  it('counts the declarations, and names any the keeper withdrew', () => {
    const { container } = renderBoard(board());

    expect(tile(container, 'Declared today').querySelector('.ops-tag')?.textContent).toContain(
      '6 declarations',
    );
    expect(tile(container, 'Declared today').querySelector('.ops-sub')?.textContent).toBe(
      "60,000 pcs in 3,000 boxes \u00b7 the keeper's own note",
    );

    // A withdrawn declaration leads the pill: only this register keeps one,
    // because it deactivates rather than deletes.
    const withdrawn = board();
    withdrawn.shifting!.allocated.retracted_movements = 2;
    const third = renderBoard(withdrawn);
    const pill = tile(third.container, 'Declared today').querySelector('.ops-tag');
    expect(pill?.textContent).toContain('2 retracted');
    expect(pill?.className).toContain('ops-t-warn');

    // Nothing rejected today, so the shipped tile's pill carries the count out.
    expect(tile(container, 'Shipped today').querySelector('.ops-tag')?.textContent).toContain(
      '4 transfers out',
    );

    // Both, as the backend sends them: the pill keys off the PIECES so it
    // still names a rejection on a day SAP could not weigh it.
    const rejected = board();
    rejected.shifting!.shipped.rejected_pieces = 3_500;
    rejected.shifting!.shipped.rejected_tons = 3.5;
    const second = renderBoard(rejected);
    const tag = tile(second.container, 'Shipped today').querySelector('.ops-tag');
    expect(tag?.textContent).toContain('3.5 t rejected');
    expect(tag?.className).toContain('ops-t-bad');
  });

  it('keeps the Shifting band alive when SAP cannot weigh it', () => {
    // The box scans are FactoryFlow's own register; only the litres are SAP's.
    // An outage must cost this band its UNIT, not its figures — and the tonnage
    // is withheld rather than printed as a zero, which would read as a quiet day.
    const data = board();
    data.shifting!.shipped = {
      ...data.shifting!.shipped,
      tonnage_available: false,
      total_tons: null,
      routes: data.shifting!.shipped.routes.map((row) => ({ ...row, tons: null, litres: null })),
    };
    const { container } = renderBoard(data);
    const card = tile(container, 'Shipped today');

    expect(card.querySelector('.ops-val b')?.textContent).toBe('52,000');
    expect(card.querySelector('.ops-val u')?.textContent).toBe('pcs, SAP not answering');
    expect(
      [...card.querySelectorAll('.ops-mkey span')].map((el) => el.textContent?.trim()),
    ).toEqual(['BH-BT basement26,000 pcs', 'Dispatch to Mart18,000 pcs']);
  });

  it('names the retired Gupta code inside Elsewhere rather than swallowing it', () => {
    // GP-FG has no row of its own: the Gupta godown holds Mart's stock, so a
    // load into it is the same event as the sale to Mart. But real volume still
    // moves on that code — 236,582 pieces in sixty days — so it must not go
    // anonymous either. It folds into Elsewhere, and Elsewhere says what it
    // folded.
    const data = board();
    data.shifting!.shipped.routes = [
      ...data.shifting!.shipped.routes,
      {
        route: 'ELSEWHERE',
        name: 'Other destinations',
        is_dispatch: false,
        pieces: 4_000,
        litres: 4_000,
        tons: 4,
        boxes: 200,
        item_count: 1,
        codes: ['GP-FG'],
      },
    ];
    const { container } = renderBoard(data);

    expect(
      [...tile(container, 'Shipped today').querySelectorAll('.ops-mkey span')].map((el) =>
        el.textContent?.trim(),
      ),
    ).toEqual([
      'BH-BT basement26.0 t',
      'Dispatch to Mart18.0 t',
      'Elsewhere · GP-FG4.0 t',
    ]);
  });

  it('says nothing was declared rather than leaving the pill empty', () => {
    // The register has been empty since it was built. On a wall that has to
    // read as an answer, not as a gap.
    const data = board();
    data.shifting!.allocated.transfers = 0;
    const { container } = renderBoard(data);

    const tag = tile(container, 'Declared today').querySelector('.ops-tag');
    expect(tag?.textContent).toContain('nothing declared');
    expect(tag?.className).toContain('ops-t-nil');
  });

  it('surfaces a warning about its own figures', () => {
    const data = board();
    data.meta.warnings = ['3 blowing runs today have no cost row yet.'];
    renderBoard(data);

    expect(screen.getByText(/no cost row yet/)).toBeInTheDocument();
  });

  it('states the tonnage rule once, in the header, not on each tonne tile', () => {
    renderBoard(board());
    // getByText throws on more than one match, which is the assertion: two
    // tiles read in tonnes and the rule must not be restated on either.
    expect(screen.getByText(/1000 L = 1 t/)).toBeInTheDocument();
  });

  it('reports the floor and the stock separately before the factor is set', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Stock space');

    // 16,900 + 15,000 + 7,000, excluding FR.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('38,900');
    expect(card.querySelector('.ops-val u')?.textContent).toBe('sq ft of floor');
    expect(card.querySelector('.ops-sub')?.textContent).toBe(
      '38,900 sq ft \u00b7 1.35 Cr pcs \u00b7 ₹3.84 Cr held',
    );

    // The floor divided the way it was actually MEASURED. The first block
    // covers three warehouses as one physical space and cannot be split, so
    // the bar does not pretend to an area per warehouse.
    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(legend).toEqual([
      'BH-PM, BH-NM, BH-BS16,900 sq ft',
      'BH-PM15,000 sq ft',
      'BH-PC7,000 sq ft',
      // Named, not invented. SAP holds no footprint to derive it from.
      'In useset the floor a pallet takes',
    ]);
  });

  it('shows how much floor there is and how much of it is in use', () => {
    // 1,634.9 pallets at 15 sq ft is 24,523 sq ft of 38,900 \u2014 63%, leaving
    // 14,377 free. The pallets come from the factory's own stacking sheet,
    // item by item.
    const data = board();
    data.store!.stock_space.area = {
      ...data.store!.stock_space.area,
      pallets: 1_634.9,
      sqft_per_pallet: 15,
      unmeasured_items: 108,
      unmeasured_pieces: 1_222_640,
      occupied_sqft: 24_523,
      free_sqft: 14_377,
      occupied_pct: 63,
    };
    const { container } = renderBoard(data);
    const card = tile(container, 'Stock space');

    expect(card.querySelector('.ops-val b')?.textContent).toBe('63.0');
    expect(card.querySelector('.ops-val u')?.textContent).toBe('% of the floor in use');
    expect(card.querySelector('.ops-sub')?.textContent).toBe(
      '38,900 sq ft across 4 stores \u00b7 1,634.9 pallets standing',
    );

    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    // Two rows and no footnotes. What the figure rests on and what it leaves
    // out are reported through the header's Check chip instead.
    expect(legend).toEqual(['In use24,523 sq ft', 'Free14,377 sq ft']);
  });

  it('reports the OLDEST count as the pill, and flags a stale one', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Stock space');

    // 101 days, from BH-BS — one store counted six weeks ago must not hide
    // the one nobody has been to since June. It qualifies every figure on the
    // tile: an uncounted store's stock is SAP's opinion, which is why it is a
    // condition pill rather than a line of prose.
    expect(card.querySelector('.ops-tag')?.textContent).toContain('counted 101d ago');
    expect(card.querySelector('.ops-tag')?.className).toContain('ops-t-bad');
  });

  it('says never counted rather than implying a fresh count', () => {
    const data = board();
    data.store!.stock_space.last_audit_date = null;
    data.store!.stock_space.audit_days_ago = null;
    data.store!.stock_space.audit_configured = 0;
    const { container } = renderBoard(data);
    const card = tile(container, 'Stock space');

    const tag = card.querySelector('.ops-tag');
    expect(tag?.textContent).toContain('never counted');
    expect(tag?.className).toContain('ops-t-nil');
    // The floor and the stock are still reported — they do not depend on
    // anybody having counted.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('38,900');
  });

  it('offers one control, in the header, pointing at the store settings', () => {
    const { container } = renderBoard(board());

    const cog = container.querySelector('a[aria-label="Board settings"]');
    expect(cog).not.toBeNull();
    expect(cog?.getAttribute('href')).toBe('/dashboards/plant-board/settings');
  });

  it('reports blowing as two figures and a week of bars', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Blowing this month');

    // Two figures and no more: bottles, and what the month cost.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('9.60 L');
    expect(card.querySelector('.ops-sub')?.textContent).toBe('₹3.8 L this month');

    // Plus what is turning right now, summed across the running runs — a day
    // often carries more than one, and the two costs are per run.
    expect(card.querySelector('.ops-tag')?.textContent).toBe(
      '2 running · ₹2.4 L so far',
    );

    // A week of bars, today last, each carrying its own figure.
    const labels = [...card.querySelectorAll('.ops-blab span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toEqual(['04', '05', '06', '07', '08', '09', 'Today']);

    // A day that blew nothing shows no figure: an empty column already says
    // it, and a "0" above it reads as a measurement somebody took.
    const values = [...card.querySelectorAll('.ops-bval')].map((el) => el.textContent?.trim());
    expect(values).toEqual(['1.87 L', '84,000', '92,000', '1.40 L', '1.45 L', '41,000']);
  });

  it('states total PM required, PM on hand and PM to purchase', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Plan this month');

    // The PACKING MATERIAL the plan needs, priced: every BOM component
    // exploded off the month's plan and valued at last purchase price. Not
    // what the month's output is worth.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('₹80.0 L');
    expect(card.querySelector('.ops-val u')?.textContent).toBe('total PM required');

    // The requirement in the three states it can be in, and THEY ADD UP TO THE
    // HEADLINE: 20 + 30 + 30 = 80. To purchase is the plan less BOTH the stock
    // and what the floor has already taken -- subtracting only the stock would
    // ask the buyer to re-buy what the line has already used.
    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(legend).toEqual([
      'Already drawn₹20.0 L',
      'PM on hand₹30.0 L',
      'PM to purchase₹30.0 L',
    ]);
    expect(card.querySelector('.ops-tag')?.textContent).toBe('38% still to buy');

    // NO SUBTITLE. The headline, the bar and the pill say the whole tile.
    expect(card.querySelector('.ops-sub')?.textContent).toBe('');
  });

  it('still says when a component carries no price, since that understates the plan', () => {
    // The one thing the stripped subtitle keeps. Every rupee here is priced off
    // the item master, so an unpriced component is simply missing from the
    // total — and a buying figure that reads low with nothing saying why is
    // the one thing this tile must never be.
    const data = board();
    data.purchase!.unpriced_count = 3;
    const { container } = renderBoard(data);

    expect(tile(container, 'Plan this month').querySelector('.ops-sub')?.textContent).toBe(
      '3 components carry no price',
    );
  });

  const planWidths = (container: HTMLElement) =>
    [...tile(container, 'Plan this month').querySelectorAll('.ops-meter i')].map(
      (el) => (el as HTMLElement).style.width,
    );

  it('fills the bar with the whole requirement, leaving no unexplained gap', () => {
    // 20 drawn + 30 on hand + 30 to buy against an 80 requirement: the three
    // fill it exactly, so a reader can check the tile against its own headline.
    const { container } = renderBoard(board());
    expect(planWidths(container)).toEqual(['25%', '37.5%', '37.5%']);
  });

  it('does not overflow when the floor has eaten last month stock', () => {
    // At the start of a plan the line runs on material bought for the month
    // before, so drawn plus on hand can legitimately exceed the month's own
    // requirement. The figures stay real; only the widths are normalised.
    const data = board();
    data.purchase!.issued_value = 9_000_000; // more drawn than the 80 L plan
    const { container } = renderBoard(data);

    const widths = planWidths(container);
    const total = widths.reduce((sum, w) => sum + Number.parseFloat(w), 0);
    expect(Math.round(total)).toBe(100);

    // Nothing left to buy, and it says zero rather than a negative.
    const legend = [...tile(container, 'Plan this month').querySelectorAll('.ops-mkey span')]
      .map((el) => el.textContent?.trim());
    expect(legend[2]).toBe('PM to purchase₹0');
  });

  it('says which components carry no price, since each one understates the plan', () => {
    const data = board();
    data.purchase!.unpriced_count = 7;
    const { container } = renderBoard(data);

    expect(tile(container, 'Plan this month').querySelector('.ops-sub')?.textContent).toContain(
      '7 components carry no price',
    );
  });

  it('shows BH-PF stock, its value, and how long it has stood', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Total stock');

    // Tonnes lead, the value is the pill beside them.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('190.0');
    expect(card.querySelector('.ops-val u')?.textContent).toBe('tonnes at BH-PF');
    expect(card.querySelector('.ops-tag')?.textContent).toBe('₹5.66 Cr');

    // Three age buckets in tonnes, aged on when stock last LEFT. Stock that
    // has never shipped folds into the oldest: 40 t + 8.3 t.
    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(legend).toEqual([
      'Up to 3 days100.0 t',
      '4–7 days60.0 t',
      'Over 7 days48.3 t',
    ]);
  });

  it('says how much of the floor has never shipped at all', () => {
    const { container } = renderBoard(board());
    // Worse than "has not shipped for eight days", so it is called out rather
    // than left inside the oldest bucket unremarked.
    expect(tile(container, 'Total stock').querySelector('.ops-sub')?.textContent).toContain(
      '3 have never shipped from here',
    );
  });

  it('says when SKUs are missing from the tonnage for want of a litre volume', () => {
    const data = board();
    data.production!.floor.unweighed_items = 9;
    const { container } = renderBoard(data);
    // Every such SKU makes the tonnage an understatement, which a tile showing
    // tonnes has to be able to say.
    expect(tile(container, 'Total stock').querySelector('.ops-sub')?.textContent).toContain(
      '9 carry no litre volume',
    );
  });

  it('leads with the SAP plan in tonnes and measures output against it', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Monthly planning');

    // The plan off SAP's monthly forecast, converted at 1000 L = 1 t.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('1,040');
    expect(card.querySelector('.ops-val u')?.textContent).toBe('t planned');
    // Output off SAP's movement journal, with the pieces it came from kept
    // alongside — SAP holds both sides in `OITM.InvntryUom`, so the comparison
    // needs no pack factor, which is where the existing plan-vs-production
    // report goes wrong.
    expect(card.querySelector('.ops-sub')?.textContent).toBe('790 t produced · 8.32 L pcs');
    // The percentage is the TONNAGE ratio, not the piece one, so it matches
    // the figures printed beside it.
    expect(card.querySelector('.ops-tag')?.textContent).toContain('76% produced');

    // The remainder, and the SKUs no tonnage can speak for.
    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(legend).toEqual(['Left to make250 t', 'No litre volume2 SKUs']);
  });

  it('drops the litre-volume note when every planned SKU is weighed', () => {
    const data = board();
    data.production!.unweighed_lines = 0;
    const { container } = renderBoard(data);

    const legend = [...tile(container, 'Monthly planning').querySelectorAll('.ops-mkey span')].map(
      (el) => el.textContent?.trim(),
    );
    expect(legend).toEqual(['Left to make250 t']);
  });

  /**
   * Today on the lines.
   *
   * The one tile on the board that does not read SAP. SAP holds no plan for a
   * single day and only learns of output when the receipt is posted after the
   * shift, so while the day is still running neither half of this comparison
   * exists in the journal — only in the supervisor's own register.
   */
  describe('today on the lines', () => {
    it('sums every run on every line into two figures, in cases', () => {
      const { container } = renderBoard(board());
      const card = tile(container, 'Today on the lines');

      // Packed so far is the headline; planned sits beside it. Two figures,
      // both in CASES — the unit the run is planned in, so the wall shows the
      // figure the supervisor typed rather than a converted one they would
      // have to work back from.
      expect(card.querySelector('.ops-val b')?.textContent).toBe('3,150');
      expect(card.querySelector('.ops-val u')?.textContent).toBe('cases');
      expect(card.querySelector('.ops-sub')?.textContent).toContain('Planned 4,500 cases');

      // Never the piece figures, which are in the payload but are not this
      // tile's unit. 90,000 and 63,000 must appear nowhere on the card.
      expect(card.textContent).not.toContain('90,000');
      expect(card.textContent).not.toContain('63,000');

      // A day runs many runs on many lines, and the tag says how many were
      // summed rather than leaving the reader to assume one.
      expect(card.querySelector('.ops-tag')?.textContent).toBe('7 runs · 3 lines');

      const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
        el.textContent?.trim(),
      );
      expect(legend).toEqual(['Left to make1,350']);
    });

    it('says nothing is planned rather than showing a zero out of zero', () => {
      const data = board();
      data.production!.today = {
        ...data.production!.today,
        planned_qty: 0,
        produced_qty: 0,
        planned_cases: 0,
        produced_cases: 0,
        attainment_pct: null,
        runs: 0,
        lines: 0,
        completed_runs: 0,
      };
      const { container } = renderBoard(data);

      const tag = tile(container, 'Today on the lines').querySelector('.ops-tag');
      expect(tag?.textContent).toBe('nothing planned');
      expect(tag?.className).toContain('ops-t-nil');
    });

    it('carries no missing-run caveat, because a case count needs no factor', () => {
      // A run whose SKU never resolved has no bottles-per-case and so cannot
      // be converted to pieces — but its CASES are known, so it is inside
      // these totals like any other. The tile must not inherit the caveat that
      // belongs to the piece figures.
      const data = board();
      data.production!.today = { ...data.production!.today, unconverted_runs: 2 };
      const { container } = renderBoard(data);

      const card = tile(container, 'Today on the lines');
      expect(card.querySelector('.ops-val b')?.textContent).toBe('3,150');
      expect(card.textContent).not.toContain('left out');
    });
  });

  /**
   * Wastage, read off the production runs day by day.
   *
   * The trap this tile is built around is the date. A waste row is typed one to
   * eight days after the shift it belongs to, so read on its typing date a
   * day's waste is not that day's waste — it is whatever the clerk worked
   * through that morning. Every figure here is dated by the run instead.
   */
  describe('wastage per run day', () => {
    it('headlines the last day logged, and says which day that was', () => {
      const { container } = renderBoard(board());
      const card = tile(container, 'Wastage');

      // 10 Sep, not today: today's runs have nothing written up yet, and a
      // tile that headlined them would report a clean shift on the strength of
      // missing paperwork.
      expect(card.querySelector('.ops-val b')?.textContent).toBe('₹45.4k');
      expect(card.querySelector('.ops-val u')?.textContent).toBe('packing material');
      expect(card.querySelector('.ops-tag')?.textContent).toBe('10 Sep · 1d behind');
    });

    it('shows raw material beside it, at the zero the register holds', () => {
      const card = tile(renderBoard(board()).container, 'Wastage');
      expect(card.querySelector('.ops-sub')?.textContent).toContain('Raw material ₹0');
    });

    it('values the day, and still names the quantity behind the money', () => {
      // Money because the register holds pieces AND metres: 10,498 pieces plus
      // 40 metres is 10,538 of no unit at all. The quantities stay on the sub
      // line, each in its own unit, so the rupees can be checked.
      const card = tile(renderBoard(board()).container, 'Wastage');
      expect(card.querySelector('.ops-val b')?.textContent).toBe('₹45.4k');
      const sub = card.querySelector('.ops-sub')?.textContent ?? '';
      expect(sub).toContain('packing 10,498 pcs');
      expect(sub).toContain('40 MTR');
      // Never a total across units.
      expect(sub).not.toContain('10,538');
    });

    it('draws a bar per day, and leaves a day nobody logged blank', () => {
      const card = tile(renderBoard(board()).container, 'Wastage');
      const bars = [...card.querySelectorAll('.ops-bars > div')];
      expect(bars).toHaveLength(7);

      // The 6th was a Sunday with no runs. It keeps its column — a week with
      // days removed has the wrong shape — but carries no figure, because a
      // "0" above an empty bar reads as a measured clean shift.
      const figures = bars.map((el) => el.querySelector('.ops-bval')?.textContent?.trim() ?? '');
      expect(figures[1]).toBe('');
      expect(figures[5]).toBe('₹45.4k');
      // The empty day also gets no stub: the component's 2% floor must not
      // apply to it, or a day of nothing reads as a small amount spoiled.
      expect((bars[1].querySelector('i') as HTMLElement).style.height).toBe('0%');

      const labels = [...card.querySelectorAll('.ops-blab span')].map((el) =>
        el.textContent?.trim(),
      );
      expect(labels).toEqual(['05', '06', '07', '08', '09', '10', 'Today']);
    });

    it('says nothing is logged rather than drawing a zero, on an empty register', () => {
      const data = board();
      data.production!.wastage = {
        ...data.production!.wastage,
        logged_latest: null,
        logged_latest_date: null,
        logged_days_behind: null,
      };
      const { container } = renderBoard(data);

      const card = tile(container, 'Wastage');
      const tag = card.querySelector('.ops-tag');
      expect(tag?.textContent).toBe('nothing logged');
      expect(tag?.className).toContain('ops-t-nil');
      expect(card.querySelector('.ops-val b')?.textContent).toBe('—');
    });

    it('warns once the paperwork is more than two days behind', () => {
      const data = board();
      data.production!.wastage = { ...data.production!.wastage, logged_days_behind: 4 };
      const { container } = renderBoard(data);

      const tag = tile(container, 'Wastage').querySelector('.ops-tag');
      expect(tag?.textContent).toBe('10 Sep · 4d behind');
      expect(tag?.className).toContain('ops-t-warn');
    });
  });

  it('says so plainly when no blowing line is turning', () => {
    const data = board();
    data.store!.blowing.running_runs = 0;
    data.store!.blowing.running_cost = 0;
    const { container } = renderBoard(data);

    // A rule, not a zero: no line running and a line running at zero cost are
    // different things.
    const tag = tile(container, 'Blowing this month').querySelector('.ops-tag');
    expect(tag?.textContent).toBe('no line running');
    expect(tag?.className).toContain('ops-t-nil');
  });

  it('shows the trucks, their orders, and what QC made of the pieces', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Packing material in');

    // Vehicles lead, orders and lines in the tag, the pieces received beneath.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('6');
    expect(card.querySelector('.ops-tag')?.textContent).toContain('8 POs \u00b7 19 lines');
    expect(card.querySelector('.ops-sub')?.textContent).toBe('Total 12,000 pcs');

    // Accepted and rejected are written at GRPO posting, not at the gate, so
    // the remainder is stock SAP does not have yet rather than stock nobody
    // has inspected. The tile must not call that a quality problem.
    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(legend).toEqual(['Booked to SAP9,000', 'Rejected40', 'Awaiting GRPO2,960']);
  });

  it('hides the awaiting segment once every receipt is posted', () => {
    const data = board();
    data.store!.pm_vehicles_today.accepted_qty = 11_960;
    data.store!.pm_vehicles_today.awaiting_grpo_qty = 0;
    const { container } = renderBoard(data);

    const legend = [...tile(container, 'Packing material in').querySelectorAll('.ops-mkey span')].map(
      (el) => el.textContent?.trim(),
    );
    expect(legend).toEqual(['Booked to SAP11,960', 'Rejected40']);
  });

  it('reports non-moving stock on the Non-Moving dashboard rules', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Non-moving stock');

    // How many SKUs are idle, and what they are worth.
    expect(card.querySelector('.ops-tag')?.textContent).toContain('44 SKUs idle');
    expect(card.querySelector('.ops-val b')?.textContent).toBe('₹9.8 L');

    // Split on that page's own thresholds, and the two add to the count.
    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(legend).toEqual(['Slow 30-45d18', 'Non-moving 45d +26']);

    // The SKUs that page sets aside as still moving, so the scope is visible
    // rather than implied.
    expect(card.querySelector('.ops-sub')?.textContent).toContain('100 SKUs still moving');
  });

  it('shows the requirement sheet own Req-after-PO figure, not a second one', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Over purchased');

    // WHAT THE OVER-BUYING IS WORTH, not how many pieces it is. The tiles
    // either side are in rupees, and a surplus in pieces compares with
    // neither of them.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('₹18.2 L');
    // The rupee sign is the unit; the tile's own name says what the figure is.
    expect(card.querySelector('.ops-val u')).toBeNull();
    expect(card.querySelector('.ops-tag')?.textContent).toContain('12 SKUs over');
    // The count is in the pill and the value is the headline, so the subtitle
    // only has to say which figure this is.
    expect(card.querySelector('.ops-sub')?.textContent).toBe(
      'Req after PO on the over-purchased rows',
    );

    // One figure and nothing beside it. Everything tried in the bar was a
    // restatement of the headline rather than a second fact about it, and two
    // near-identical numbers on one tile is worse than one.
    expect(card.querySelectorAll('.ops-meter').length).toBe(0);
    expect(card.querySelectorAll('.ops-mkey').length).toBe(0);
  });

  it('reports how many items are below benchmark, and on which side', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Against benchmark');

    // How many items are under their benchmark, and nothing else in words.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('20');
    expect(card.querySelector('.ops-sub')?.textContent).toBe('');

    // ONLY the items below benchmark are drawn. The bar splits the headline
    // into its two halves; the healthy SKUs are not drawn at all, because a
    // tile about what is missing should not spend its bar on what is fine.
    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(legend).toEqual(['Low14', 'Critical6']);

    // And they are scaled against the 20 below benchmark, not the 196 in range,
    // so the two widths fill the bar between them.
    const widths = [...card.querySelectorAll('.ops-meter i')].map(
      (el) => (el as HTMLElement).style.width,
    );
    expect(widths).toEqual(['70%', '30%']);
  });

  it('shows orders raised, ordered quantity and received on the Purchased card', () => {
    const { container } = renderBoard(board());
    const card = tile(container, 'Purchased');

    // How many POs were created.
    expect(card.querySelector('.ops-tag')?.textContent).toContain('14 POs raised');
    // How much was ordered on them, in money.
    expect(card.querySelector('.ops-val b')?.textContent).toBe('₹12.0 L');
    // How much of it has arrived and what is still to come. The two must tie
    // back to the ordered figure above them.
    const legend = [...card.querySelectorAll('.ops-mkey span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(legend).toEqual([
      'Received₹7.8 L',
      'Still to come₹4.2 L',
    ]);
  });

  it('renders a rule, never NaN, when the API omits a figure', () => {
    // Exactly what a stale backend produces: the band answers, but without the
    // fields a newer board expects. Every one of these must degrade to a dash.
    const data = board();
    const stale = { ...data.purchase } as Record<string, unknown>;
    for (const key of [
      'po_count',
      'po_lines',
      'ordered_qty',
      'ordered_value',
      'po_received_value',
      'po_open_value',
    ]) {
      delete stale[key];
    }
    const { container } = renderBoard({
      ...data,
      purchase: stale as unknown as NonNullable<PlantBoardResponse['purchase']>,
    });

    expect(container.textContent).not.toContain('NaN');

    const card = tile(container, 'Purchased');
    expect(card.querySelector('.ops-val b')?.textContent).toBe('—');
  });

  /**
   * The board says each figure once.
   *
   * These two are structural rather than about any one tile, because that is
   * how the duplication got in: three band headlines were copied into the
   * header, and inside a tile the meter legend named the same segment the big
   * figure already was. Both read as extra information and are not, and a
   * reader who learns the header repeats the body stops reading the header.
   */
  describe('says each figure once', () => {
    function headlines(container: HTMLElement): string[] {
      return [...container.querySelectorAll('.ops-val b')]
        .map((el) => el.textContent?.trim() ?? '')
        .filter((text) => text && text !== '—');
    }

    it('never repeats a band headline in the header totals', () => {
      const { container } = renderBoard(board());

      const totals = [...container.querySelectorAll('.ops-tot .n')]
        .map((el) => el.textContent?.trim() ?? '')
        .filter((text) => text && text !== '—');

      const repeated = totals.filter((total) => headlines(container).includes(total));
      expect(repeated).toEqual([]);
    });

    it('never repeats a tile headline in that tile own legend', () => {
      const { container } = renderBoard(board());

      const offenders: string[] = [];
      for (const tileEl of container.querySelectorAll('.ops-grp')) {
        const headline = tileEl.querySelector('.ops-val b')?.textContent?.trim();
        if (!headline || headline === '—') continue;

        const legend = [...tileEl.querySelectorAll('.ops-mkey b')].map((el) =>
          el.textContent?.trim(),
        );
        if (legend.includes(headline)) {
          offenders.push(`${tileEl.querySelector('.ops-nm')?.textContent}: ${headline}`);
        }
      }

      expect(offenders).toEqual([]);
    });
  });
});
