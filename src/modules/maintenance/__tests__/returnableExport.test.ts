import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { ReturnableGatePassListItem } from '../types';
import {
  buildReturnableWorkbook,
  RETURNABLE_EXPORT_COLUMNS,
  returnableFileName,
} from '../utils/returnableExport';

function makePass(overrides: Partial<ReturnableGatePassListItem> = {}): ReturnableGatePassListItem {
  return {
    id: 1,
    company: 1,
    pass_no: 'RGP-0001',
    status: 'OUT',
    status_display: 'Out',
    is_returnable: true,
    material_indent_no: '',
    purpose: 'REPAIR',
    purpose_display: 'Repair',
    department: 3,
    department_name: 'Maintenance',
    party_name: 'Sharma Motor Works',
    recipient_name: '',
    destination: 'Sharma Motor Works',
    item_names: 'Gear motor, Coupling',
    expected_return_date: '2026-10-01',
    is_overdue: true,
    days_overdue: 7,
    item_count: 2,
    pending_return_qty: '2.000',
    gate_out_at: '2026-09-20T10:15:00+05:30',
    last_return_at: null,
    created_at: '2026-09-19T16:40:00+05:30',
    created_by_name: 'Ravi',
    ...overrides,
  };
}

function sheetRows(passes: ReturnableGatePassListItem[]) {
  const workbook = buildReturnableWorkbook(passes);
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Gate Passes'], {
    defval: '',
  });
}

describe('buildReturnableWorkbook', () => {
  it('writes one row per pass, headed by every column', () => {
    const workbook = buildReturnableWorkbook([
      makePass(),
      makePass({ id: 2, pass_no: 'RGP-0002' }),
    ]);
    const [header, ...body] = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets['Gate Passes'], {
      header: 1,
    });

    expect(header).toEqual(RETURNABLE_EXPORT_COLUMNS.map((column) => column.label));
    expect(body).toHaveLength(2);
  });

  it('reads a returnable pass the way the screen does', () => {
    const [row] = sheetRows([makePass()]);

    expect(row).toMatchObject({
      'Pass No': 'RGP-0001',
      Type: 'Returnable',
      Status: 'Out',
      'Days Overdue': 7,
      'Going To': 'Sharma Motor Works',
      Items: 2,
      'Pending Qty': 2,
      'Expected Back': '01-10-2026',
      'Last Return': '',
    });
  });

  it('leaves the return columns blank on a non-returnable pass', () => {
    const [row] = sheetRows([
      makePass({
        is_returnable: false,
        status: 'CLOSED',
        status_display: 'Closed',
        is_overdue: false,
        days_overdue: 0,
        expected_return_date: null,
        pending_return_qty: '0.000',
        recipient_name: 'Gurpreet',
        destination: 'Gurpreet',
      }),
    ]);

    expect(row).toMatchObject({
      Type: 'Non-returnable',
      Status: 'Closed',
      'Days Overdue': '',
      'Pending Qty': '',
      'Expected Back': '',
      Recipient: 'Gurpreet',
    });
  });
});

describe('returnableFileName', () => {
  it('is dated by the local day', () => {
    expect(returnableFileName(new Date(2026, 9, 8, 2, 0))).toBe(
      'returnable_gate_passes_2026-10-08.xlsx',
    );
  });
});
