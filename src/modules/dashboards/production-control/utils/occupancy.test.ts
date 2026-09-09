import { describe, expect, it } from 'vitest';

import { PALLET_CAPACITY } from '../constants/production-control.constants';
import { looseFormatOf, type OccupancyInput, occupancyNote, summariseOccupancy } from './occupancy';

function boxed(pieces: number, piecesPerBox: number, litresPerPiece = 1): OccupancyInput {
  return { itemCode: `B${pieces}`, itemName: 'Boxed SKU', pieces, piecesPerBox, litresPerPiece };
}

function loose(pieces: number, litresPerPiece: number | null): OccupancyInput {
  return {
    itemCode: `L${pieces}`,
    itemName: 'Loose SKU',
    pieces,
    piecesPerBox: 1,
    litresPerPiece,
  };
}

describe('looseFormatOf', () => {
  it('separates the formats on litres per piece', () => {
    expect(looseFormatOf(200)).toBe('drum');
    expect(looseFormatOf(15)).toBe('jerryCan');
    expect(looseFormatOf(16.4835)).toBe('jerryCan'); // 15 KG mustard
    expect(looseFormatOf(13.1868)).toBe('jerryCan'); // 12 KG soyabean
    expect(looseFormatOf(5)).toBe('bulkTin');
    expect(looseFormatOf(1)).toBe('jar');
    expect(looseFormatOf(0.2)).toBe('jar');
  });

  it('treats an unknown volume as the smallest format, never the largest', () => {
    // A null must not inflate the pallet count by being read as a drum.
    expect(looseFormatOf(null)).toBe('jar');
    expect(looseFormatOf(undefined)).toBe('jar');
    expect(looseFormatOf(0)).toBe('jar');
  });
});

describe('summariseOccupancy', () => {
  it('converts a boxed SKU through boxes at 40 to a pallet', () => {
    // 800 pieces / 20 per box = 40 boxes = exactly 1 pallet.
    const result = summariseOccupancy([boxed(800, 20)]);
    expect(result.rows[0].boxes).toBe(40);
    expect(result.rows[0].pallets).toBe(1);
    expect(result.pallets).toBe(1);
  });

  it('never divides a loose SKU by the box factor', () => {
    // 4,028 jars at SalFactor2 = 1. Dividing by 40 would claim 100 pallets.
    const result = summariseOccupancy([loose(4028, 0.2)]);
    expect(result.rows[0].boxes).toBeNull();
    expect(result.rows[0].looseFormat).toBe('jar');
    expect(result.pallets).toBeLessThan(15);
  });

  it('reports the measured and estimated halves separately', () => {
    const result = summariseOccupancy([boxed(800, 20), loose(100, 15)]);
    expect(result.palletsFromBoxes).toBe(1);
    expect(result.palletsFromLoose).toBe(2); // 100 cans / 50 per pallet
    expect(result.looseSkus).toBe(1);
  });

  it('rounds the total up once, not per SKU', () => {
    // Three SKUs of 13 boxes each = 39 boxes = under one pallet. Rounding each
    // SKU up first would report three pallets for less than one pallet of stock.
    const part = boxed(13 * 20, 20);
    const result = summariseOccupancy([part, part, part]);
    expect(result.rows).toHaveLength(3);
    expect(result.pallets).toBe(1);
  });

  it('rounds a part-pallet up, because it still occupies floor', () => {
    const result = summariseOccupancy([boxed(820, 20)]); // 41 boxes = 1.025 pallets
    expect(result.pallets).toBe(2);
  });

  it('raises the alert at the threshold and flags a genuine overload past capacity', () => {
    const perPallet = 40 * 20;
    const atEighty = summariseOccupancy([boxed(perPallet * 320, 20)]);
    expect(atEighty.percent).toBe(80);
    expect(atEighty.alert).toBe(true);
    expect(atEighty.over).toBe(false);

    const overFull = summariseOccupancy([boxed(perPallet * 473, 20)]);
    expect(overFull.percent).toBeGreaterThan(100);
    expect(overFull.over).toBe(true);
  });

  it('stays quiet below the threshold', () => {
    const result = summariseOccupancy([boxed(40 * 20 * 100, 20)]); // 100 of 400
    expect(result.percent).toBe(25);
    expect(result.alert).toBe(false);
    expect(result.over).toBe(false);
  });

  it('drops zero and negative stock instead of counting it as a pallet', () => {
    const result = summariseOccupancy([boxed(0, 20), boxed(-500, 20), boxed(800, 20)]);
    expect(result.rows).toHaveLength(1);
    expect(result.pallets).toBe(1);
  });

  it('treats a missing or zero pieces-per-box as loose, not as a divide by zero', () => {
    const result = summariseOccupancy([
      { itemCode: 'X', itemName: 'No factor', pieces: 100, piecesPerBox: null, litresPerPiece: 15 },
      { itemCode: 'Y', itemName: 'Zero factor', pieces: 100, piecesPerBox: 0, litresPerPiece: 15 },
    ]);
    expect(result.rows.every((row) => Number.isFinite(row.pallets))).toBe(true);
    expect(result.pallets).toBe(4); // 200 cans / 50 per pallet
  });

  it('ranks rows by the floor they take, not by piece count', () => {
    // 5 drums take 5 pallets; 800 bottles take 1. Pieces would order them the other way.
    const result = summariseOccupancy([boxed(800, 20), loose(5, 200)]);
    expect(result.rows[0].itemCode).toBe('L5');
  });

  it('defaults to the floor capacity and accepts an override', () => {
    expect(summariseOccupancy([boxed(800, 20)]).capacity).toBe(PALLET_CAPACITY);
    expect(summariseOccupancy([boxed(800, 20)], 250).capacity).toBe(250);
  });

  it('returns a usable zero for an empty warehouse', () => {
    const result = summariseOccupancy([]);
    expect(result).toMatchObject({ pallets: 0, percent: 0, alert: false, over: false, boxes: 0 });
  });
});

describe('occupancyNote', () => {
  it('names the capacity and the basis', () => {
    const note = occupancyNote(summariseOccupancy([boxed(800, 20)]));
    expect(note).toContain('400 pallets');
    expect(note).toContain('SalFactor2');
  });

  it('admits which half of the figure is estimated', () => {
    const note = occupancyNote(summariseOccupancy([boxed(800, 20), loose(100, 15)]));
    expect(note).toContain('1 pallets are measured');
    expect(note).toContain('1 SKU');
    expect(note).toContain('estimate');
  });

  it('claims no estimate when every SKU is genuinely boxed', () => {
    const note = occupancyNote(summariseOccupancy([boxed(800, 20)]));
    expect(note).not.toContain('estimate');
  });
});
