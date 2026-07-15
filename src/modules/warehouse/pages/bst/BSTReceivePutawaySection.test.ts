import { describe, expect, it } from 'vitest';

import type { BSTBoxScan } from '../../types';
import { groupAcceptedPallets } from './bstReceivePallets';

/** Minimal BSTBoxScan builder — only the fields the grouping reads matter. */
function scan(overrides: Partial<BSTBoxScan>): BSTBoxScan {
  return {
    id: Math.floor(Math.random() * 1e9),
    box: null,
    pallet: null,
    box_barcode: 'BX',
    item_code: 'ITEM1',
    item_name: 'Item One',
    batch_number: 'B1',
    quantity: '10',
    uom: 'EA',
    warehouse_code: 'WH1',
    pallet_code: '',
    scanned_by_name: '',
    scanned_at: '',
    receive_status: 'ACCEPTED',
    reject_reason: '',
    is_unexpected: false,
    received_by_name: '',
    received_at: null,
    ...overrides,
  };
}

describe('groupAcceptedPallets', () => {
  it('groups accepted boxes by pallet, summing box count and quantity', () => {
    const result = groupAcceptedPallets([
      scan({ pallet_code: 'PLT-1', quantity: '10' }),
      scan({ pallet_code: 'PLT-1', quantity: '5' }),
      scan({ pallet_code: 'PLT-2', quantity: '7' }),
    ]);
    expect(result).toHaveLength(2);
    const plt1 = result.find((p) => p.palletCode === 'PLT-1')!;
    expect(plt1.boxCount).toBe(2);
    expect(plt1.quantity).toBe(15);
    expect(result.find((p) => p.palletCode === 'PLT-2')!.quantity).toBe(7);
  });

  it('ignores non-accepted scans and loose boxes with no pallet', () => {
    const result = groupAcceptedPallets([
      scan({ pallet_code: 'PLT-1' }),
      scan({ pallet_code: 'PLT-9', receive_status: 'REJECTED' }),
      scan({ pallet_code: 'PLT-8', receive_status: 'PENDING' }),
      scan({ pallet_code: '' }), // loose box
    ]);
    expect(result.map((p) => p.palletCode)).toEqual(['PLT-1']);
  });

  it('falls back to the box count when boxes carry no unit quantity', () => {
    const result = groupAcceptedPallets([
      scan({ pallet_code: 'PLT-1', quantity: '0' }),
      scan({ pallet_code: 'PLT-1', quantity: '' }),
    ]);
    expect(result[0].quantity).toBe(2); // 0 units → fall back to 2 boxes
    expect(result[0].boxCount).toBe(2);
  });

  it('carries item identity from the first box of each pallet', () => {
    const [pallet] = groupAcceptedPallets([
      scan({ pallet_code: 'PLT-1', item_code: 'OIL', item_name: 'Jivo Oil', uom: 'CTN', batch_number: 'L42' }),
    ]);
    expect(pallet).toMatchObject({
      palletCode: 'PLT-1',
      itemCode: 'OIL',
      itemName: 'Jivo Oil',
      uom: 'CTN',
      batchNumber: 'L42',
    });
  });
});
