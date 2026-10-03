import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { CustomerLedger, CustomerLedgerLine } from '../../types';
import {
  buildCustomerLedgerWorkbook,
  customerLedgerFileName,
  defaultLedgerRange,
  drCr,
  isOverdue,
} from '../customerLedger';

function makeLine(overrides: Partial<CustomerLedgerLine> = {}): CustomerLedgerLine {
  return {
    trans_id: 227102,
    line_id: 0,
    date: '2026-08-17',
    due_date: '2026-09-07',
    trans_type: '13',
    trans_type_label: 'A/R Invoice',
    doc_num: '626080375',
    reference: '6500260170',
    narration: '',
    offset_account: '4110014',
    offset_name: 'SALES OIL @ 5%',
    debit: 1630020,
    credit: 0,
    balance: 7693559.57,
    open_amount: 1630020,
    ...overrides,
  };
}

function makeLedger(overrides: Partial<CustomerLedger> = {}): CustomerLedger {
  return {
    customer_code: 'CUSTA000486',
    customer_name: 'WAL MART INDIA PVT LTD',
    date_from: '2026-04-01',
    date_to: '2026-10-03',
    currency: 'INR',
    opening_balance: 6063539.57,
    total_debit: 1630020,
    total_credit: 0,
    closing_balance: 7693559.57,
    balance_today: 7693559.57,
    total: 1,
    truncated: false,
    lines: [makeLine()],
    ...overrides,
  };
}

describe('defaultLedgerRange', () => {
  it('opens on the financial year so far', () => {
    expect(defaultLedgerRange(new Date(2026, 9, 3))).toEqual({
      from: '2026-04-01',
      to: '2026-10-03',
    });
  });

  it('keeps January to March in the year that started last April', () => {
    expect(defaultLedgerRange(new Date(2027, 1, 15))).toEqual({
      from: '2026-04-01',
      to: '2027-02-15',
    });
  });

  it('starts a new year on 1 April itself', () => {
    expect(defaultLedgerRange(new Date(2027, 3, 1)).from).toBe('2027-04-01');
  });
});

describe('drCr', () => {
  it('names the side of the balance', () => {
    expect(drCr(7883557.57)).toBe('78,83,557.57 Dr');
    expect(drCr(-217413.56)).toBe('2,17,413.56 Cr');
  });

  it('leaves a nil balance bare, paisa dust included', () => {
    expect(drCr(0)).toBe('0.00');
    expect(drCr(-0.0009)).toBe('0.00');
  });
});

describe('isOverdue', () => {
  const today = new Date(2026, 9, 3);

  it('flags a bill still unpaid after its due date', () => {
    expect(isOverdue(makeLine(), today)).toBe(true);
  });

  it('does not flag a bill that is paid, not yet due, or a receipt', () => {
    expect(isOverdue(makeLine({ open_amount: 0 }), today)).toBe(false);
    expect(isOverdue(makeLine({ due_date: '2026-10-03' }), today)).toBe(false);
    expect(isOverdue(makeLine({ open_amount: -850, debit: 0, credit: 850 }), today)).toBe(false);
  });
});

describe('buildCustomerLedgerWorkbook', () => {
  const sheetRows = (ledger: CustomerLedger) =>
    XLSX.utils.sheet_to_json<(string | number)[]>(
      buildCustomerLedgerWorkbook(ledger).Sheets.Ledger,
      {
        header: 1,
        blankrows: false,
      },
    );

  it('brackets the postings between the opening and closing balances', () => {
    const rows = sheetRows(makeLedger());
    expect(rows[0]).toEqual(['WAL MART INDIA PVT LTD (CUSTA000486)']);
    expect(rows[2][0]).toBe('Date');
    expect(rows[3].slice(1, 2)).toEqual(['Opening balance']);
    expect(rows[3].slice(-2)).toEqual([6063539.57, 'Dr']);
    // The posting keeps its numbers as numbers, so the sheet can add them up.
    expect(rows[4].slice(6, 10)).toEqual([1630020, '', 7693559.57, 'Dr']);
    expect(rows[5].slice(1, 2)).toEqual(['Closing balance']);
    expect(rows[5].slice(6, 10)).toEqual([1630020, 0, 7693559.57, 'Dr']);
  });

  it('says when the listing stops short of the range', () => {
    const rows = sheetRows(makeLedger({ total: 6000, truncated: true }));
    expect(rows[rows.length - 1]).toEqual(['Only the first 1 of 6000 postings are listed.']);
  });
});

describe('customerLedgerFileName', () => {
  it('names the customer and the range', () => {
    expect(customerLedgerFileName(makeLedger())).toBe(
      'ledger_CUSTA000486_2026-04-01_2026-10-03.xlsx',
    );
    expect(customerLedgerFileName(makeLedger({ date_from: null, date_to: null }))).toBe(
      'ledger_CUSTA000486.xlsx',
    );
  });
});
