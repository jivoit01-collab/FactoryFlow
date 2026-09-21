import { describe, expect, it } from 'vitest';

import type { SapReportColumn } from '../../api';
import { cellNumber, cellText } from '../cells';

const amount: SapReportColumn = { key: 'DocTotal', label: 'Total', type: 'number' };
const docNum: SapReportColumn = { key: 'DocNum', label: 'Doc No.', type: 'number' };
const text: SapReportColumn = { key: 'CardName', label: 'Customer', type: 'text' };

describe('cellText', () => {
  it('gives decimals two places and whole numbers none', () => {
    expect(cellText(1234.5, amount)).toBe('1,234.50');
    // A document number is a name, not a quantity: "626080206.00" reads as a bug.
    expect(cellText(626080206, docNum)).toBe('626,080,206');
  });

  it('leaves an empty cell empty, so it can be ticked as "(blank)"', () => {
    expect(cellText(null, amount)).toBe('');
    expect(cellText(undefined, text)).toBe('');
    expect(cellText('', text)).toBe('');
  });

  it('passes text through as it came', () => {
    expect(cellText('ACME TRADERS', text)).toBe('ACME TRADERS');
    // A number SAP typed as text is not reformatted — it is not a number here.
    expect(cellText('007', text)).toBe('007');
  });
});

describe('cellNumber', () => {
  it('reads a number, however SAP typed it', () => {
    expect(cellNumber(12.5)).toBe(12.5);
    expect(cellNumber('12.5')).toBe(12.5);
  });

  it('is null for anything that is not one', () => {
    expect(cellNumber(null)).toBeNull();
    expect(cellNumber('')).toBeNull();
    expect(cellNumber('ACME')).toBeNull();
    expect(cellNumber(true)).toBeNull();
  });
});
