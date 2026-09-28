import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { EmptyVehicleGateOutEntry } from '../../api/emptyVehicleOut/emptyVehicleOut.api';
import type { VehicleEntry } from '../../api/vehicle/vehicleEntry.api';
import {
  buildRawMaterialsWorkbook,
  rawMaterialsExportFileName,
  SUMMARY_SHEET_NAME,
  VEHICLES_SHEET_NAME,
} from '../../utils/rawMaterialsExport';

/** An in-time on the local clock, so the sheet reads the same in any timezone. */
const localIso = (day: number, hour: number, minute: number) =>
  new Date(2026, 8, day, hour, minute).toISOString();

const entry = (fields: Partial<VehicleEntry>) =>
  ({
    id: 1,
    entry_no: 'GE-0001',
    status: 'COMPLETED',
    entry_type: 'RAW_MATERIAL',
    suppliers: [{ supplier_code: 'VEND0001', supplier_name: 'Adani Wilmar' }],
    material_type: { code: 'RM', label: 'RM' },
    qc_final_status: null,
    vehicle: {
      id: 1,
      vehicle_number: 'PB10AB1234',
      vehicle_type: { id: 3, name: 'Truck' },
      transporter: { id: 1, name: 'Sharma Roadlines' },
      capacity_ton: '30.00',
    },
    driver: { id: 1, name: 'Balwinder', mobile_no: '9876543210' },
    remarks: '',
    entry_time: localIso(27, 22, 15),
    ...fields,
  }) as VehicleEntry;

const out = (fields: Partial<EmptyVehicleGateOutEntry>) =>
  ({
    id: 1,
    entry_no: 'EVGO-20260928-0001',
    vehicle_entry: 1,
    gate_out_date: '2026-09-28',
    out_time: '06:45:00',
    status: 'COMPLETED',
    ...fields,
  }) as EmptyVehicleGateOutEntry;

const ENTRIES = [
  // Came in late one night, left empty the next morning.
  entry({ id: 1, entry_no: 'GE-0001' }),
  // Still inside: no out yet.
  entry({
    id: 2,
    entry_no: 'GE-0002',
    status: 'QC_AWAITING_QAM',
    suppliers: [
      { supplier_code: 'VEND0002', supplier_name: 'Cargill' },
      { supplier_code: 'VEND0003', supplier_name: 'Bunge' },
    ],
    qc_final_status: {
      code: 'HOLD',
      display: 'QC On Hold',
      accepted_count: 0,
      rejected_count: 0,
      hold_count: 1,
      pending_count: 0,
      total_count: 1,
    },
    remarks: 'Seal broken',
    entry_time: localIso(28, 9, 5),
  }),
];

const OUTS = new Map([[1, out({ vehicle_entry: 1 })]]);

const sheet = (workbook: XLSX.WorkBook, name: string) =>
  XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name]);

const grid = (workbook: XLSX.WorkBook, name: string) =>
  XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, blankrows: false });

/** The workbook as Excel will open it: written to a file and read back. */
const saved = (workbook: XLSX.WorkBook) =>
  XLSX.read(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));

describe('buildRawMaterialsWorkbook', () => {
  const workbook = saved(
    buildRawMaterialsWorkbook(ENTRIES, OUTS, {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-28',
      materialLabel: 'RM only',
      companyName: 'Jivo Oil',
    }),
  );

  it('lists every vehicle on the page, in its order', () => {
    expect(workbook.SheetNames).toEqual([VEHICLES_SHEET_NAME, SUMMARY_SHEET_NAME]);
    expect(sheet(workbook, VEHICLES_SHEET_NAME).map((r) => r['Entry No.'])).toEqual([
      'GE-0001',
      'GE-0002',
    ]);
  });

  it('gives the in date and time, and the out date and time, of each vehicle', () => {
    const [left] = sheet(workbook, VEHICLES_SHEET_NAME);

    expect(left).toMatchObject({
      'Vehicle No.': 'PB10AB1234',
      'Vehicle Type': 'Truck',
      Transporter: 'Sharma Roadlines',
      Driver: 'Balwinder',
      'Driver Mobile': '9876543210',
      'Supplier(s)': 'Adani Wilmar',
      Material: 'RM',
      'In Date': '27-09-2026',
      'In Time': '22:15',
      'Out Date': '28-09-2026',
      'Out Time': '06:45',
      'Hours Inside': 8.5,
      Status: 'Completed',
    });
  });

  it('leaves the out cells empty for a vehicle still inside', () => {
    const [, inside] = sheet(workbook, VEHICLES_SHEET_NAME);

    expect(inside).toMatchObject({
      'Supplier(s)': 'Cargill, Bunge',
      'In Date': '28-09-2026',
      'In Time': '09:05',
      Status: 'QC Awaiting QAM',
      QC: 'QC On Hold',
      Remarks: 'Seal broken',
    });
    // Empty cells -- not a zero, and not an empty text cell.
    expect(inside['Out Date']).toBeUndefined();
    expect(inside['Out Time']).toBeUndefined();
    expect(inside['Hours Inside']).toBeUndefined();
  });

  it('says what the list was narrowed to, and how many vehicles have left', () => {
    const rows = grid(workbook, SUMMARY_SHEET_NAME);

    expect(rows).toContainEqual(['Company', 'Jivo Oil']);
    expect(rows).toContainEqual(['Entry dates', '01-09-2026 to 28-09-2026']);
    expect(rows).toContainEqual(['Material', 'RM only']);
    expect(rows).toContainEqual(['Status', 'All statuses']);
    expect(rows).toContainEqual(['Vehicles', 2]);
    expect(rows).toContainEqual(['Out', 1]);
    expect(rows).toContainEqual(['Not marked out', 1]);
  });
});

describe('rawMaterialsExportFileName', () => {
  it('puts the company and the dates covered in the name', () => {
    expect(rawMaterialsExportFileName('JIVO_OIL', '2026-09-01', '2026-09-28', '2026-09-28')).toBe(
      'rm_pm_gate_jivo_oil_2026-09-01_to_2026-09-28.xlsx',
    );
    expect(rawMaterialsExportFileName('JIVO_OIL', '2026-09-28', '2026-09-28', '2026-09-28')).toBe(
      'rm_pm_gate_jivo_oil_2026-09-28.xlsx',
    );
  });

  it('stamps the day an undated export was taken', () => {
    expect(rawMaterialsExportFileName(undefined, '', '', '2026-09-28')).toBe(
      'rm_pm_gate_all_dates_2026-09-28.xlsx',
    );
  });
});
