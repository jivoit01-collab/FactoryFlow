import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { DispatchTrackingTruck } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';

import {
  buildTrackingWorkbook,
  TRACKING_COLUMNS,
  TRACKING_SHEET_NAME,
  trackingFileName,
} from '../trackingExport';

const TRUCK: DispatchTrackingTruck = {
  arrival: 7,
  arrival_no: 'ARV-0007',
  arrival_status: 'DEPARTED',
  vehicle: 3,
  vehicle_number: 'PB10AB1234',
  transporter_name: 'Bhargave Road Carrier',
  driver_name: 'Gurpreet',
  driver_mobile: '09876543210',
  gatepass_no: 'GP-114',
  dispatched_at: '2026-09-20T09:15:00',
  companies: ['Jivo Oil', 'Jivo Beverages'],
  documents: ['626030549', '626030604'],
  customers: ['R K WORLDINFOCOM PVT LTD'],
  customer_locations: [],
  current_status: 'IN_TRANSIT',
  current_status_display: 'In Transit',
  last_update_at: '2026-09-21T18:40:00',
  update_count: 2,
  expected_reach_date: '2026-09-22',
  is_late: true,
  days_overdue: 2,
};

const rowsOf = (workbook: XLSX.WorkBook) =>
  XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[TRACKING_SHEET_NAME]);

describe('buildTrackingWorkbook', () => {
  it('writes what the card shows, dates as the card prints them', () => {
    const [row] = rowsOf(buildTrackingWorkbook([TRUCK]));

    expect(row).toEqual({
      Vehicle: 'PB10AB1234',
      'Arrival No': 'ARV-0007',
      Status: 'In Transit',
      'Days Overdue': 2,
      Companies: 'Jivo Oil, Jivo Beverages',
      'Reach By': '22 Sep 2026',
      Transporter: 'Bhargave Road Carrier',
      Dispatched: '20 Sep 2026, 09:15',
      Driver: 'Gurpreet',
      // Kept as text: a leading zero is part of the number to dial.
      'Driver Mobile': '09876543210',
      'Gatepass No': 'GP-114',
      Bills: '626030549, 626030604',
      Customers: 'R K WORLDINFOCOM PVT LTD',
      Updates: 2,
      'Last Update': '21 Sep 2026, 18:40',
    });
  });

  it('leaves a blank, not a zero, for a truck that is not late', () => {
    const [row] = rowsOf(
      buildTrackingWorkbook([
        { ...TRUCK, is_late: false, days_overdue: 0, expected_reach_date: null, gatepass_no: null },
      ]),
    );

    expect(row).not.toHaveProperty('Days Overdue');
    expect(row).not.toHaveProperty('Reach By');
    expect(row).not.toHaveProperty('Gatepass No');
  });

  it('keeps the board order and opens with filter buttons', () => {
    const workbook = buildTrackingWorkbook([
      TRUCK,
      { ...TRUCK, arrival: 8, vehicle_number: 'HR55C0001' },
    ]);

    expect(rowsOf(workbook).map((row) => row.Vehicle)).toEqual(['PB10AB1234', 'HR55C0001']);
    expect(workbook.Sheets[TRACKING_SHEET_NAME]['!autofilter']).toBeTruthy();
  });

  it('still writes the headings for an empty board', () => {
    const sheet = buildTrackingWorkbook([]).Sheets[TRACKING_SHEET_NAME];
    const [headings] = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    expect(headings).toEqual(TRACKING_COLUMNS.map((column) => column.label));
  });
});

describe('trackingFileName', () => {
  it('names the window, and the page when the board runs to more than one', () => {
    expect(
      trackingFileName({ dateFrom: '2026-09-01', dateTo: '2026-09-24', page: 2, totalPages: 5 }),
    ).toBe('Dispatch Tracking from 2026-09-01 to 2026-09-24 page 2 of 5.xlsx');
    expect(
      trackingFileName({ dateFrom: '2026-09-01', dateTo: '2026-09-24', page: 1, totalPages: 1 }),
    ).toBe('Dispatch Tracking from 2026-09-01 to 2026-09-24.xlsx');
    expect(trackingFileName({ dateFrom: '', dateTo: '', page: 1, totalPages: 1 })).toBe(
      'Dispatch Tracking.xlsx',
    );
  });
});
