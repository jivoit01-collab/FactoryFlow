import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type GridCell, WarehouseGrid } from '../components/WarehouseGrid';
import { DEFAULT_NAMING_SCHEME } from '../services';

/**
 * A 3x2 grid: column A (storage, coded), column B is a non-storage "Walkway"
 * spanning both rows (should merge into one plan area), column C storage.
 */
function makeCells(): GridCell[] {
  const cells: GridCell[] = [];
  for (let row = 0; row < 2; row += 1) {
    // A: storage
    cells.push({
      id: `A-${row}`, column: 0, row, code: `A-0${row + 1}`, storage: true, purposeId: 'stock',
      purposeName: 'Finished Goods', purposeColor: '#22c55e', enabled: true,
    });
    // B: non-storage walkway (merges vertically)
    cells.push({
      id: `B-${row}`, column: 1, row, code: '', storage: false, purposeId: 'walk',
      purposeName: 'Walkway', purposeColor: '#64748b', enabled: true,
    });
    // C: storage
    cells.push({
      id: `C-${row}`, column: 2, row, code: `B-0${row + 1}`, storage: true, purposeId: 'stock',
      purposeName: 'Finished Goods', purposeColor: '#22c55e', enabled: true,
    });
  }
  return cells;
}

describe('WarehouseGrid — plan-area merge + interactions', () => {
  it('shows storage codes and labels each merged non-storage region once', () => {
    render(
      <WarehouseGrid columns={3} rows={2} naming={DEFAULT_NAMING_SCHEME} cells={makeCells()} selectable />,
    );
    // Storage cells show their code.
    expect(screen.getByText('A-01')).toBeInTheDocument();
    expect(screen.getByText('A-02')).toBeInTheDocument();
    // The two walkway cells merge: the purpose name appears exactly once (top-left).
    expect(screen.getAllByText('Walkway')).toHaveLength(1);
  });

  it('fires onCellClick for a storage cell', () => {
    const onCellClick = vi.fn();
    render(
      <WarehouseGrid columns={3} rows={2} naming={DEFAULT_NAMING_SCHEME} cells={makeCells()} selectable onCellClick={onCellClick} />,
    );
    fireEvent.click(screen.getByText('A-01'));
    expect(onCellClick).toHaveBeenCalledTimes(1);
    expect(onCellClick.mock.calls[0]?.[0]).toMatchObject({ id: 'A-0', code: 'A-01' });
  });

  it('fires onCellClick for a merged non-storage region cell (still selectable)', () => {
    const onCellClick = vi.fn();
    render(
      <WarehouseGrid columns={3} rows={2} naming={DEFAULT_NAMING_SCHEME} cells={makeCells()} selectable onCellClick={onCellClick} />,
    );
    fireEvent.click(screen.getByText('Walkway'));
    expect(onCellClick).toHaveBeenCalledTimes(1);
    expect(onCellClick.mock.calls[0]?.[0]).toMatchObject({ storage: false, purposeName: 'Walkway' });
  });

  it('selects a whole column via its header (no areas)', () => {
    const onHeaderClick = vi.fn();
    render(
      <WarehouseGrid columns={3} rows={2} naming={DEFAULT_NAMING_SCHEME} cells={makeCells()} selectable onHeaderClick={onHeaderClick} />,
    );
    // Column header 'A' is a clickable button when no areas are defined.
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(onHeaderClick).toHaveBeenCalledWith('column', 0);
  });
});
