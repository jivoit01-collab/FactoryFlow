import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSpreadsheetKeys } from '../components/useSpreadsheetKeys';

/**
 * A register in miniature: three rows, four columns, and a button inside one
 * cell — because the real one has tick boxes and actions, and the arrow keys
 * must leave those alone.
 */
function Grid({ onCopy }: { onCopy?: (text: string) => void } = {}) {
  const { gridProps } = useSpreadsheetKeys({ onCopy });
  return (
    <table {...gridProps}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Branch</th>
          <th>Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {[0, 1, 2].map((r) => (
          <tr key={r}>
            {[0, 1, 2].map((c) => (
              <td key={c} data-testid={`${r}-${c}`}>
                {`r${r}c${c}`}
              </td>
            ))}
            <td data-testid={`${r}-3`}>
              <button type="button">Edit</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cell = (r: number, c: number) => screen.getByTestId(`${r}-${c}`);

describe('useSpreadsheetKeys', () => {
  it('makes every body cell focusable, and no header cell', () => {
    render(<Grid />);
    expect(cell(0, 0).tabIndex).toBe(-1);
    // Tab must step over the table rather than walk every cell.
    expect(cell(0, 0).getAttribute('tabindex')).toBe('-1');
    expect(screen.getByText('Date').getAttribute('tabindex')).toBeNull();
  });

  it('walks the arrow keys in all four directions', () => {
    render(<Grid />);
    cell(1, 1).focus();

    fireEvent.keyDown(cell(1, 1), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cell(2, 1));

    fireEvent.keyDown(cell(2, 1), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell(2, 2));

    fireEvent.keyDown(cell(2, 2), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cell(1, 2));

    fireEvent.keyDown(cell(1, 2), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cell(1, 1));
  });

  it('stops at the edges instead of wrapping round', () => {
    render(<Grid />);
    cell(0, 0).focus();
    fireEvent.keyDown(cell(0, 0), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cell(0, 0));
    fireEvent.keyDown(cell(0, 0), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cell(0, 0));
  });

  it('walks down the column on Enter, and up on Shift+Enter', () => {
    render(<Grid />);
    cell(0, 2).focus();
    fireEvent.keyDown(cell(0, 2), { key: 'Enter' });
    expect(document.activeElement).toBe(cell(1, 2));
    fireEvent.keyDown(cell(1, 2), { key: 'Enter', shiftKey: true });
    expect(document.activeElement).toBe(cell(0, 2));
  });

  it('goes to the ends of a row, and the corners of the grid', () => {
    render(<Grid />);
    cell(1, 1).focus();

    fireEvent.keyDown(cell(1, 1), { key: 'Home' });
    expect(document.activeElement).toBe(cell(1, 0));

    fireEvent.keyDown(cell(1, 0), { key: 'End' });
    expect(document.activeElement).toBe(cell(1, 3));

    fireEvent.keyDown(cell(1, 3), { key: 'Home', ctrlKey: true });
    expect(document.activeElement).toBe(cell(0, 0));

    fireEvent.keyDown(cell(0, 0), { key: 'End', ctrlKey: true });
    expect(document.activeElement).toBe(cell(2, 3));
  });

  it('jumps a screenful, clamped to the last row', () => {
    render(<Grid />);
    cell(0, 0).focus();
    fireEvent.keyDown(cell(0, 0), { key: 'PageDown' });
    expect(document.activeElement).toBe(cell(2, 0));
    fireEvent.keyDown(cell(2, 0), { key: 'PageUp' });
    expect(document.activeElement).toBe(cell(0, 0));
  });

  it('leaves a control inside a cell to handle its own keys', () => {
    // The whole reason the register's tick boxes and buttons still work.
    render(<Grid />);
    const button = screen.getAllByRole('button')[0];
    button.focus();
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(button);
  });

  it('copies the cell under the cursor', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onCopy = vi.fn();

    render(<Grid onCopy={onCopy} />);
    cell(2, 1).focus();
    fireEvent.keyDown(cell(2, 1), { key: 'c', ctrlKey: true });

    expect(writeText).toHaveBeenCalledWith('r2c1');
    await vi.waitFor(() => expect(onCopy).toHaveBeenCalledWith('r2c1'));
  });

  it('keeps the cells reachable after the rows change', () => {
    // Paging, filtering and sorting all replace the body; new cells would be
    // dead if they were only made focusable once.
    const { rerender } = render(<Grid />);
    rerender(<Grid onCopy={() => {}} />);
    expect(cell(2, 2).tabIndex).toBe(-1);
    cell(2, 2).focus();
    fireEvent.keyDown(cell(2, 2), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cell(1, 2));
  });
});
