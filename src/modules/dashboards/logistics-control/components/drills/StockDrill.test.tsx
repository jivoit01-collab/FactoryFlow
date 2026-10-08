import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SideStockRow } from '../../utils';
import { StockDrill } from './StockDrill';

/**
 * The Stock on hand panel as the Beverages board opens it.
 *
 * On a board that counts boxes, an item's on-hand reads in boxes with the unit
 * BOX — and an item with no pack factor keeps its own pieces and its own unit,
 * because a loose bottle printed as a box would be a lie on the floor.
 */

function stockRow(over: Partial<SideStockRow>): SideStockRow {
  return {
    company_code: 'JIVO_BEVERAGES',
    item_code: 'I1',
    item_name: 'Item',
    on_hand: 0,
    pieces_per_box: null,
    litres_per_piece: null,
    stock_value: 0,
    sub_group: 'JUICE',
    uom: 'PCS',
    gross_weight_per_case: null,
    warehouse: 'BH-FG',
    ...over,
  };
}

const ROWS = [
  stockRow({ item_code: 'BOXED', item_name: 'Boxed juice', on_hand: 480, pieces_per_box: 24 }),
  stockRow({ item_code: 'LOOSE', item_name: 'Loose juice', on_hand: 37, pieces_per_box: 1 }),
];

function renderStock(measure: 'tonnes' | 'boxes') {
  render(
    <StockDrill
      caption="BH-FG"
      sides={[]}
      stockTonnage={{ tonnes: 0, weighedItems: 0, unweighedItems: 2, nonPieceItems: 0 }}
      stockBoxes={{ boxes: 20, boxedItems: 1, unboxedItems: 1 }}
      stockRows={ROWS}
      loading={false}
      measure={measure}
      onClose={vi.fn()}
    />,
  );
  // Open the variety for its items.
  fireEvent.click(screen.getByText('JUICE'));
}

/** The cells of the item row naming `name`. */
function cellsOf(name: string): string[] {
  const tr = screen.getByText(name).closest('tr');
  return [...(tr?.querySelectorAll('td') ?? [])].map((cell) => cell.textContent ?? '');
}

describe('StockDrill in boxes', () => {
  it('reads a boxed item in boxes and a loose one in its own pieces', () => {
    renderStock('boxes');

    expect(cellsOf('Boxed juice')).toEqual(expect.arrayContaining(['20', 'BOX']));
    expect(cellsOf('Loose juice')).toEqual(expect.arrayContaining(['37', 'PCS']));
    // The tonnes column is gone, and the summary says boxes.
    expect(screen.queryByText('Tonnes')).toBeNull();
    expect(screen.getByText('No box size')).toBeTruthy();
  });

  it('leaves the Oil board in pieces and tonnes', () => {
    renderStock('tonnes');

    expect(cellsOf('Boxed juice')).toEqual(expect.arrayContaining(['480', 'PCS']));
    expect(cellsOf('Boxed juice')).not.toContain('BOX');
    expect(screen.getAllByText('Tonnes').length).toBeGreaterThan(0);
  });
});
