import { describe, expect, it } from 'vitest';

import type { SapReportColumn } from '../../api';
import { buildClipboardText } from '../clipboard';

const columns: SapReportColumn[] = [
  { key: 'DocNum', label: 'Doc No.', type: 'number' },
  { key: 'CardName', label: 'Customer', type: 'text' },
  { key: 'DocTotal', label: 'Total', type: 'number' },
];

describe('buildClipboardText', () => {
  it('writes one tab-separated line per row and no header', () => {
    const text = buildClipboardText(
      [
        [1001, 'ACME TRADERS', 1234.5],
        [1002, 'BHARAT OIL', 90],
      ],
      columns,
    );

    expect(text).toBe('1001\tACME TRADERS\t1234.5\r\n1002\tBHARAT OIL\t90');
  });

  it('adds the headings only when asked', () => {
    const text = buildClipboardText([[1001, 'ACME TRADERS', 1234.5]], columns, {
      includeHeaders: true,
    });

    expect(text.split('\r\n')[0]).toBe('Doc No.\tCustomer\tTotal');
  });

  it('leaves numbers unformatted so the sheet reads them as numbers', () => {
    expect(buildClipboardText([[626080206, '', 1234567.89]], columns)).toBe(
      '626080206\t\t1234567.89',
    );
  });

  it('writes an empty cell for a null and for a missing trailing column', () => {
    expect(buildClipboardText([[null, 'ACME']], columns)).toBe('\tACME\t');
  });

  it('flattens tabs and newlines so a remark cannot shear the grid', () => {
    const text = buildClipboardText([[1, 'LINE ONE\r\nLINE\tTWO', 0]], columns);

    expect(text).toBe('1\tLINE ONE LINE TWO\t0');
  });

  it('keeps the row order it was given', () => {
    const text = buildClipboardText(
      [
        [3, 'C', 0],
        [1, 'A', 0],
      ],
      columns,
    );

    expect(text.split('\r\n').map((line) => line.split('\t')[0])).toEqual(['3', '1']);
  });
});
