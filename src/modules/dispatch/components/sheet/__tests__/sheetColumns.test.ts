import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { DispatchSheetRow } from '../../../types/sheet.types';
import { columnsFor, figure } from '../sheetColumns';
import { buildSheetWorkbook } from '../sheetExport';

const ROW: DispatchSheetRow = {
  plan_id: 1,
  sap_invoice_doc_entry: 4001,
  company_code: 'JIVO_OIL',
  company_name: 'Jivo Oil',
  stream: 'OIL',
  booking_status: 'DISPATCHED',
  vehicle_stage: 'DISPATCHED',
  vehicle_stage_label: 'Dispatched',
  dispatch_date: '2026-04-01',
  invoice_date: '2026-03-30',
  party: 'CHIRAG ENTERPRISES MUMBAI',
  location: 'ANJUR MANKOLI ROAD, BHIWANDI',
  state: 'MH',
  invoice_no: '626030549',
  bilty_no: '1756',
  bilty_date: null,
  vehicle_no: 'RJ09GB9203',
  transport_name: 'Bombay Sri Nagar',
  mobile_no: '9521334090',
  litres: 10913,
  total_boxes: 620,
  priority: 'High',
  kanta_weight: 11996,
  invoice_weight: 11000,
  freight: 2.5,
  total_freight: 29990,
  remarks: 'Lucky- 8130168713',
  eway_bill: '',
};

const labels = (stream: 'OIL' | 'WATER', crossCompany = false) =>
  columnsFor(stream, { crossCompany }).map((column) => column.label);

describe('the workbook’s columns', () => {
  it('gives the oil sheet the columns the oil tab has, in its order', () => {
    expect(labels('OIL')).toEqual([
      'Dispatch Date',
      'Invoice Date',
      'Party',
      'Location',
      'State',
      'Invoice No.',
      'Jivo Mart Invoice',
      'Bilty No.',
      'Vehicle No.',
      'Transport Name',
      'Mobile No',
      'Oil LTR',
      'Priority',
      'Kanta Weight',
      'Freight',
      'Total Freight',
      'Remarks',
      'Factory Bilty Dispatch Date',
      'Bill & Receiving Date',
      'Status',
    ]);
  });

  it('gives the water sheet its own columns — boxes, and the weight before the priority', () => {
    const water = labels('WATER');
    expect(water).toContain('Water+WG Ltr');
    expect(water).toContain('Total Box');
    expect(water).not.toContain('Oil LTR');
    expect(water.indexOf('Kanta Weight')).toBeLessThan(water.indexOf('Priority'));
  });

  it('puts the company first when the register spans more than one', () => {
    expect(labels('OIL', true)[0]).toBe('Company');
    expect(labels('OIL')[0]).toBe('Dispatch Date');
  });

  it('marks the columns the book has that nothing in the app fills', () => {
    const unkept = columnsFor('OIL')
      .filter((column) => column.notKeptYet)
      .map((column) => column.label);
    expect(unkept).toEqual([
      'Jivo Mart Invoice',
      'Factory Bilty Dispatch Date',
      'Bill & Receiving Date',
    ]);
    // Marked, and genuinely empty — never a stale or invented value.
    for (const column of columnsFor('OIL').filter((c) => c.notKeptYet)) {
      expect(column.value(ROW)).toBe('');
    }
  });

  it('leaves a missing figure blank rather than calling it zero', () => {
    expect(figure(null)).toBe('');
    expect(figure(0)).toBe('0');
    expect(figure(10913)).toBe('10,913');
  });
});

describe('the download', () => {
  it('writes figures as numbers, so the file totals in Excel', () => {
    const workbook = buildSheetWorkbook({
      rows: [ROW],
      columns: columnsFor('OIL'),
      stream: 'OIL',
    });

    const sheet = workbook.Sheets.OIL;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    expect(rows[0]['Oil LTR']).toBe(10913);
    expect(rows[0]['Total Freight']).toBe(29990);
    expect(rows[0].Party).toBe('CHIRAG ENTERPRISES MUMBAI');
    // The header row carries Excel's own filter buttons.
    expect(sheet['!autofilter']).toBeTruthy();
  });

  it('still writes the headings when everything has been filtered away', () => {
    const workbook = buildSheetWorkbook({
      rows: [],
      columns: columnsFor('WATER'),
      stream: 'WATER',
    });

    const [headers] = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.WATER, {
      header: 1,
    });
    expect(headers).toContain('Water+WG Ltr');
    expect(headers).toContain('Total Box');
  });
});
