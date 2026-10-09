import { describe, expect, it } from 'vitest';

import { billNumbersFromClipboard, billNumbersFromText } from '../utils/pastedBillNumbers';

const clipboard = (types: Record<string, string>) => ({
  getData: (type: string) => types[type] ?? '',
});

describe('billNumbersFromText', () => {
  it('reads a column copied from Excel, one number per CRLF line', () => {
    expect(billNumbersFromText('626100246\r\n626100247\r\n626100250\r\n')).toEqual([
      '626100246',
      '626100247',
      '626100250',
    ]);
  });

  it('reads a block copied from Google Sheets or Zoho Sheet, tab between cells', () => {
    const block = '626100246\tJIVO MART PVT LTD\t120\n626100247\tSHARMA TRADERS\t45';
    expect(billNumbersFromText(block)).toEqual(['626100246', '626100247']);
  });

  it('reads a list typed in a chat, split by commas, spaces or both', () => {
    expect(billNumbersFromText('626100246, 626100247 626100248;626100249,626100250')).toEqual([
      '626100246',
      '626100247',
      '626100248',
      '626100249',
      '626100250',
    ]);
  });

  it('reads a number the sheet shows with digit grouping as one number', () => {
    expect(billNumbersFromText('626,100,246\n62,61,00,247\n"626,100,248"')).toEqual([
      '626100246',
      '626100247',
      '626100248',
    ]);
  });

  it('leaves out runs too short to be a bill, such as decimals and dates', () => {
    expect(billNumbersFromText('626100246.00\t09/10/2026\t1500')).toEqual(['626100246']);
  });

  it('keeps the order and drops repeats', () => {
    expect(billNumbersFromText('626100247\n626100246\n626100247')).toEqual([
      '626100247',
      '626100246',
    ]);
  });

  it('finds nothing in part of a number, so it is typed into the search box', () => {
    expect(billNumbersFromText('00246')).toEqual([]);
    expect(billNumbersFromText('JIVO MART')).toEqual([]);
  });
});

describe('billNumbersFromClipboard', () => {
  it('reads the plain-text copy when there is one', () => {
    const data = clipboard({
      'text/plain': '626100246\n626100247',
      'text/html': '<table><tr><td>999999999</td></tr></table>',
    });
    expect(billNumbersFromClipboard(data)).toEqual(['626100246', '626100247']);
  });

  it('falls back to the cells of the HTML copy, ignoring its styles', () => {
    const data = clipboard({
      'text/html':
        '<html><head><style>td { color: #000000; }</style></head><body><table>' +
        '<tr><td>626100246</td></tr><tr><td>626100247</td></tr></table></body></html>',
    });
    expect(billNumbersFromClipboard(data)).toEqual(['626100246', '626100247']);
  });
});
