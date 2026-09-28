/**
 * What the bill summary list's search box is allowed to match.
 *
 * The needle arrives already trimmed and lower-cased by the page, the way
 * the transfer list hands its own over.
 */

import { describe, expect, it } from 'vitest';

import type { BillSummary } from '../../../api';
import { matchesBillSummary } from '../billSummarySearch';

const sheet = {
  id: 138,
  source: 'APP',
  key: '138',
  entry_no: 'BS-20260928-002',
  sap_invoice_doc_num: '626090573',
  customer_code: 'CQXPG8530Q',
  customer_name: 'DURGA TRADING COMPANY',
  vehicle_no: 'PB10AB1234',
  transporter_name: 'Sharma Roadways',
  bilty_no: 'BL-7781',
  driver_name: 'Gurdeep',
  warehouse_codes: 'BH-BT',
} as unknown as BillSummary;

describe('matchesBillSummary', () => {
  it('matches everything when there is nothing to search for', () => {
    expect(matchesBillSummary(sheet, '')).toBe(true);
  });

  it.each([
    ['the bill number', '626090573'],
    ['part of the bill number', '0573'],
    ['the sheet number', 'bs-20260928-002'],
    ['the party', 'durga'],
    ['the party code', 'cqxpg'],
    ['the truck', 'pb10ab'],
    ['the transporter', 'sharma'],
    ['the bilty', 'bl-7781'],
    ['the driver', 'gurdeep'],
    ['the godown', 'bh-bt'],
  ])('finds a sheet by %s', (_what, needle) => {
    expect(matchesBillSummary(sheet, needle)).toBe(true);
  });

  it('does not match a sheet that has none of it', () => {
    expect(matchesBillSummary(sheet, 'aggarwal')).toBe(false);
  });

  it('takes a SAP-stamped dispatch whose blank fields are missing', () => {
    const sapRow = {
      source: 'SAP',
      key: 'sap-5101',
      entry_no: 'SAP-626090580',
      sap_invoice_doc_num: '626090580',
      customer_name: 'HARPREET SINGH CASH SALE',
      vehicle_no: null,
    } as unknown as BillSummary;
    expect(matchesBillSummary(sapRow, 'harpreet')).toBe(true);
    expect(matchesBillSummary(sapRow, 'pb10')).toBe(false);
  });
});
