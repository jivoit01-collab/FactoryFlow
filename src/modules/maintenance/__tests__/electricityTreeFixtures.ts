// Shared fixtures for the Daily Electricity++ tests: a small tree — KWH feeding
// the ground floor (with the lab under it) — as the API serves it.

import type {
  DaySheet,
  MeterSetup,
  SplitReport,
  TreeMeter,
} from '../types';

export function setup(overrides: Partial<MeterSetup> = {}): MeterSetup {
  return {
    id: 1,
    effective_from: '2026-09-01',
    in_service: true,
    parent: null,
    parent_name: null,
    basis: 'FIXED',
    basis_label: 'Fixed shares',
    shares: [
      {
        party: 'company:JIVO_BEVERAGES',
        party_name: 'Jivo Beverages',
        company: 'JIVO_BEVERAGES',
        consumer: null,
        percent: '100',
      },
    ],
    drivers: [],
    summary: 'Jivo Beverages 100%',
    note: '',
    ...overrides,
  };
}

export function meter(overrides: Partial<TreeMeter> = {}): TreeMeter {
  return {
    id: 1,
    name: 'KWH',
    meter_number: '',
    location: 'Near Boundary Wall',
    company_codes: [],
    consumer_codes: [],
    companies_display: '',
    is_main: true,
    supply_source: 'GRID',
    supply_source_display: 'Grid',
    counts_as_supply: true,
    register_of: null,
    register_of_name: null,
    rate_per_unit: '9.0000',
    multiplying_factor: '10.0000',
    last_reading_date: '2026-09-22',
    last_closing_reading: '1000.00',
    readings_count: 20,
    tree: {
      in_service: true,
      order: 0,
      depth: 0,
      parent: null,
      parent_name: null,
      unplaced: false,
      setup: setup({ id: 11, basis: 'UNASSIGNED', basis_label: 'Not decided yet', shares: [], summary: 'Not decided yet' }),
    },
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

export const KWH = meter();

export const GROUND = meter({
  id: 2,
  name: 'Production Floor Beverage',
  location: 'Ground Floor',
  is_main: false,
  supply_source: '',
  supply_source_display: '',
  multiplying_factor: '1.0000',
  tree: {
    in_service: true,
    order: 1,
    depth: 1,
    parent: 1,
    parent_name: 'KWH',
    unplaced: false,
    setup: setup({ id: 12, parent: 1, parent_name: 'KWH' }),
  },
});

export const LAB = meter({
  id: 3,
  name: 'Lab',
  location: 'Inside Beverages floor',
  is_main: false,
  supply_source: '',
  supply_source_display: '',
  multiplying_factor: '1.0000',
  tree: {
    in_service: true,
    order: 2,
    depth: 2,
    parent: 2,
    parent_name: 'Production Floor Beverage',
    unplaced: false,
    setup: setup({
      id: 13,
      parent: 2,
      parent_name: 'Production Floor Beverage',
      shares: [
        { party: 'company:JIVO_OIL', party_name: 'Jivo Oil', company: 'JIVO_OIL', consumer: null, percent: '50' },
        {
          party: 'company:JIVO_BEVERAGES',
          party_name: 'Jivo Beverages',
          company: 'JIVO_BEVERAGES',
          consumer: null,
          percent: '50',
        },
      ],
      summary: 'Jivo Oil 50% · Jivo Beverages 50%',
    }),
  },
});

export const METERS = [KWH, GROUND, LAB];

export const DAY_SHEET: DaySheet = {
  date: '2026-09-23',
  rows: [
    {
      meter: 1,
      name: 'KWH',
      location: '',
      depth: 0,
      parent: null,
      parent_name: null,
      is_register: false,
      register_of: null,
      multiplying_factor: '10.0000',
      rate_per_unit: '9.0000',
      keeps: true,
      split: 'Not decided yet',
      previous: { date: '2026-09-22', closing_reading: '1000.00' },
      reading: null,
      next: null,
    },
    {
      meter: 2,
      name: 'Production Floor Beverage',
      location: '',
      depth: 1,
      parent: 1,
      parent_name: 'KWH',
      is_register: false,
      register_of: null,
      multiplying_factor: '1.0000',
      rate_per_unit: '9.0000',
      keeps: true,
      split: 'Jivo Beverages 100%',
      previous: { date: '2026-09-22', closing_reading: '5000.00' },
      reading: null,
      next: null,
    },
    {
      meter: 3,
      name: 'Lab',
      location: '',
      depth: 2,
      parent: 2,
      parent_name: 'Production Floor Beverage',
      is_register: false,
      register_of: null,
      multiplying_factor: '1.0000',
      rate_per_unit: '9.0000',
      keeps: false,
      split: 'Jivo Oil 50% · Jivo Beverages 50%',
      previous: { date: '2026-09-22', closing_reading: '300.00' },
      reading: { id: 90, opening_reading: '300.00', closing_reading: '340.00', units_consumed: '40.00', meter_reset: false, reading_time: null, remarks: '' },
      next: null,
    },
  ],
};

export const SPLIT: SplitReport = {
  date_from: '2026-09-01',
  date_to: '2026-09-22',
  days: 22,
  entered_days: 22,
  parties: [
    { key: 'company:JIVO_BEVERAGES', code: 'JIVO_BEVERAGES', name: 'Jivo Beverages', kind: 'COMPANY' },
    { key: 'company:JIVO_OIL', code: 'JIVO_OIL', name: 'Jivo Oil', kind: 'COMPANY' },
    { key: 'unassigned', code: '', name: 'Unassigned', kind: 'UNASSIGNED' },
  ],
  totals: {
    supply_units: '1000.00',
    supply_cost: '9000.00',
    allocated_units: '1000.00',
    allocated_cost: '9000.00',
    over_read_units: '0.00',
    by_party: [
      { party: 'company:JIVO_BEVERAGES', units: '380.00', cost: '3420.00', share_pct: '38.0' },
      { party: 'company:JIVO_OIL', units: '520.00', cost: '4680.00', share_pct: '52.0' },
      { party: 'unassigned', units: '100.00', cost: '900.00', share_pct: '10.0' },
    ],
  },
  meters: [
    {
      id: 1, name: 'KWH', location: '', depth: 0, parent_id: null, children: [2], is_register: false, register_of: null,
      rule: KWH.tree?.setup, units: '1000.00', sub_metered_units: '900.00', own_units: '100.00', own_cost: '900.00',
      over_read_units: '0.00', days_in_service: 22, days_read: 22, spread_days: 0, fallback_days: 0,
      split: [{ party: 'unassigned', units: '100.00', cost: '900.00', share_pct: '100.0' }], drivers: [],
    },
    {
      id: 2, name: 'Production Floor Beverage', location: '', depth: 1, parent_id: 1, children: [3], is_register: false,
      register_of: null, rule: GROUND.tree?.setup, units: '400.00', sub_metered_units: '40.00', own_units: '360.00',
      own_cost: '3240.00', over_read_units: '0.00', days_in_service: 22, days_read: 20, spread_days: 0, fallback_days: 0,
      split: [{ party: 'company:JIVO_BEVERAGES', units: '360.00', cost: '3240.00', share_pct: '100.0' }], drivers: [],
    },
    {
      id: 3, name: 'Lab', location: '', depth: 2, parent_id: 2, children: [], is_register: false, register_of: null,
      rule: LAB.tree?.setup, units: '40.00', sub_metered_units: '0.00', own_units: '40.00', own_cost: '360.00',
      over_read_units: '0.00', days_in_service: 22, days_read: 22, spread_days: 0, fallback_days: 0,
      split: [
        { party: 'company:JIVO_OIL', units: '20.00', cost: '180.00', share_pct: '50.0' },
        { party: 'company:JIVO_BEVERAGES', units: '20.00', cost: '180.00', share_pct: '50.0' },
      ],
      drivers: [],
    },
    {
      id: 4, name: 'First Floor', location: '', depth: 1, parent_id: 1, children: [], is_register: false, register_of: null,
      rule: setup({ id: 14, shares: [{ party: 'company:JIVO_OIL', party_name: 'Jivo Oil', company: 'JIVO_OIL', consumer: null, percent: '100' }], summary: 'Jivo Oil 100%' }),
      units: '500.00', sub_metered_units: '0.00', own_units: '500.00', own_cost: '4500.00', over_read_units: '0.00',
      days_in_service: 22, days_read: 22, spread_days: 0, fallback_days: 0,
      split: [{ party: 'company:JIVO_OIL', units: '500.00', cost: '4500.00', share_pct: '100.0' }], drivers: [],
    },
  ],
  daily: [
    { date: '2026-09-22', entered: true, supply_units: '1000.00', by_party: {}, cost_by_party: {} },
  ],
  meter_daily: [
    { meter_id: 2, party: 'company:JIVO_BEVERAGES', units: ['360.00'] },
    { meter_id: 3, party: 'company:JIVO_OIL', units: ['20.00'] },
    { meter_id: 3, party: 'company:JIVO_BEVERAGES', units: ['20.00'] },
    { meter_id: 4, party: 'company:JIVO_OIL', units: ['500.00'] },
  ],
  issues: [
    {
      kind: 'UNASSIGNED', severity: 'error', meter_id: 1, meter_name: 'KWH', days: ['2026-09-22'], count: 1,
      units: '100.00', message: 'KWH: nobody is set to pay for it. 100.00 units are unassigned.', detail: {},
    },
    {
      kind: 'NOT_READ', severity: 'warning', meter_id: 2, meter_name: 'Production Floor Beverage',
      days: ['2026-09-10', '2026-09-11'], count: 2, units: '0.00',
      message: 'Production Floor Beverage was not read on 2 days. Its load on those days is counted in the rest of KWH.', detail: {},
    },
  ],
  unplaced_meters: [],
  generated_at: '2026-09-24T10:00:00Z',
};
