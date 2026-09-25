import { describe, expect, it } from 'vitest';

import { isLiveBst } from './bstFormat';

describe('isLiveBst', () => {
  it('treats any transfer without a truck as live, whatever its source', () => {
    const stockTransfer = { source_type: 'STOCK_TRANSFER', requires_gate: false };
    // An Oil → Mart invoice with no truck is receivable from its first scan too.
    const invoice = { source_type: 'INVOICE', requires_gate: false };
    expect(isLiveBst(stockTransfer)).toBe(true);
    expect(isLiveBst(invoice)).toBe(true);
  });

  it('keeps a gated transfer sequential', () => {
    expect(isLiveBst({ requires_gate: true })).toBe(false);
  });
});
