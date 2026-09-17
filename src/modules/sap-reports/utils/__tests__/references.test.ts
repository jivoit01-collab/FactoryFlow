import { describe, expect, it } from 'vitest';

import type { SapReportColumn } from '../../api';
import { findReferenceColumn } from '../references';

function column(key: string, label = key): SapReportColumn {
  return { key, label, type: 'text' };
}

describe('findReferenceColumn', () => {
  it('finds the movement report’s "Reference No" column', () => {
    const columns = [column('SKU'), column('Warehouse'), column('Reference No')];
    expect(findReferenceColumn(columns)).toBe(2);
  });

  it('finds DocNum however the query author punctuated it', () => {
    expect(findReferenceColumn([column('Doc No.')])).toBe(0);
    expect(findReferenceColumn([column('DOCUMENT NUMBER')])).toBe(0);
    expect(findReferenceColumn([column('BASE_REF')])).toBe(0);
  });

  it('matches on the SAP heading even when the key was suffixed for uniqueness', () => {
    // Duplicated headings get a "(2)" suffix on the key; the label is untouched.
    expect(findReferenceColumn([column('SKU'), column('DocNum (2)', 'DocNum')])).toBe(1);
  });

  it('returns -1 when no column carries a document reference', () => {
    expect(findReferenceColumn([column('SKU'), column('Qty In'), column('Card Name')])).toBe(-1);
  });

  it('does not mistake a date or a quantity for a reference', () => {
    expect(findReferenceColumn([column('Date'), column('Qty Out'), column('Warehouse')])).toBe(-1);
  });
});
