import { describe, expect, it } from 'vitest';

import type { SalesDispatchDashboardEntry } from '@/modules/gate/api';

import {
  labelColumnValues,
  pendingBookingMatchesFilters,
} from '../../pages/customerSalesFlow/dockingColumns';

const BLANK = '—';

/**
 * The docking board's funnels are the server's work — it is paged, and
 * narrowing the twenty-five rows on a page is not a filter. The one thing the
 * client still has to sieve is the not-yet-docked bookings that ride the top of
 * page one: they come from a different endpoint, which those funnels never
 * reach, so a filtered board would otherwise leave rows standing that plainly
 * do not match it.
 */
function booking(fields: Partial<SalesDispatchDashboardEntry> = {}) {
  return {
    row_type: 'PENDING_BOOKING',
    id: 'p1',
    company_name: 'Jivo Oil',
    vehicle_no: 'DL01LAD0461',
    customer_name: 'THE AREA MANAGER CANTEEN',
    item_summary: 'JIVO CANOLA 1 LTR (20 PCS)',
    document_numbers: ['626090152', '626090170'],
    sap_doc_num: '626090152',
    dispatch_date: '2026-09-23',
    ...fields,
  } as unknown as SalesDispatchDashboardEntry;
}

describe('pendingBookingMatchesFilters', () => {
  it('keeps everything while nothing is ticked', () => {
    expect(pendingBookingMatchesFilters(booking(), {})).toBe(true);
    expect(pendingBookingMatchesFilters(booking(), { vehicle: [] })).toBe(true);
  });

  it('sieves on a ticked value', () => {
    expect(pendingBookingMatchesFilters(booking(), { vehicle: ['DL01LAD0461'] })).toBe(true);
    expect(pendingBookingMatchesFilters(booking(), { vehicle: ['HR69E9959'] })).toBe(false);
  });

  it('is an AND across columns and an OR inside one', () => {
    const row = booking();
    expect(
      pendingBookingMatchesFilters(row, {
        vehicle: ['HR69E9959', 'DL01LAD0461'],
        company: ['Jivo Oil'],
      }),
    ).toBe(true);
    expect(
      pendingBookingMatchesFilters(row, {
        vehicle: ['DL01LAD0461'],
        company: ['Jivo Mart'],
      }),
    ).toBe(false);
  });

  it('matches on any one of a load’s bills, as the cell prints them all', () => {
    expect(pendingBookingMatchesFilters(booking(), { document: ['626090170'] })).toBe(true);
    expect(pendingBookingMatchesFilters(booking(), { document: ['626098188'] })).toBe(false);
  });

  it('is always at the one stage a booking can be at', () => {
    expect(pendingBookingMatchesFilters(booking(), { status: ['READY_TO_DOCK'] })).toBe(true);
    expect(pendingBookingMatchesFilters(booking(), { status: ['DISPATCHED'] })).toBe(false);
  });

  it('answers the blank tick on the columns it has nothing in', () => {
    const row = booking();
    // No entry number until it is docked, and it has been nowhere near the gate.
    expect(pendingBookingMatchesFilters(row, { entry_no: [BLANK] })).toBe(true);
    expect(pendingBookingMatchesFilters(row, { gate_out: [BLANK] })).toBe(true);
    expect(pendingBookingMatchesFilters(row, { gatepass: [BLANK] })).toBe(true);
    expect(pendingBookingMatchesFilters(row, { gatepass: ['GP-1'] })).toBe(false);
  });

  it('reads an empty cell as blank rather than as its own value', () => {
    const row = booking({ customer_name: '   ' } as Partial<SalesDispatchDashboardEntry>);
    expect(pendingBookingMatchesFilters(row, { customer: [BLANK] })).toBe(true);
    expect(pendingBookingMatchesFilters(row, { customer: [''] })).toBe(false);
  });
});

describe('labelColumnValues', () => {
  it('says a stage the way the badge beside it says it', () => {
    const [first] = labelColumnValues('status', [
      { value: 'DOCKED', label: 'DOCKED', count: 3 },
    ]);
    expect(first.label).toBe('docked at dock');
    expect(first.value).toBe('DOCKED');
  });

  it('walks the pipeline rather than the alphabet', () => {
    const ordered = labelColumnValues('status', [
      { value: 'DISPATCHED', label: 'DISPATCHED', count: 1 },
      { value: 'DOCKED', label: 'DOCKED', count: 1 },
      { value: 'GATEPASS_PRINTED', label: 'GATEPASS_PRINTED', count: 1 },
    ]);
    expect(ordered.map((row) => row.value)).toEqual([
      'DOCKED',
      'GATEPASS_PRINTED',
      'DISPATCHED',
    ]);
  });

  it('leaves the blank entry alone, and every other column untouched', () => {
    expect(
      labelColumnValues('status', [{ value: BLANK, label: '(blank)', count: 2 }])[0].label,
    ).toBe('(blank)');
    const vehicles = [{ value: 'DL01LY5728', label: 'DL01LY5728', count: 1 }];
    expect(labelColumnValues('vehicle', vehicles)).toBe(vehicles);
  });
});
