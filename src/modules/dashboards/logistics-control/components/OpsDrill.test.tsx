import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OpsDrill } from './OpsDrill';

/**
 * A row's own rows, opened underneath it rather than over it.
 *
 * The panel used to answer "which bills?" by replacing itself with a second
 * panel and offering a back arrow. That costs the reader their place: the list
 * they were scanning is gone, and comparing two customers means opening,
 * reading, going back, and opening again from memory. These pin the expansion
 * that replaced it — that the surrounding rows survive it, that the chevron
 * says which way a click goes, and that a table given no way to expand is
 * unchanged.
 */

interface Row {
  key: string;
  name: string;
  bills: number;
}

const ROWS: Row[] = [
  { key: 'a', name: 'Canteen Store', bills: 6 },
  { key: 'b', name: 'Area Manager', bills: 2 },
];

function drill(props: Partial<React.ComponentProps<typeof OpsDrill<Row>>> = {}) {
  return (
    <OpsDrill<Row>
      title="Pending dispatch"
      domain="warehouse"
      rows={ROWS}
      rowKey={(row) => row.key}
      columns={[
        { label: 'Customer', cell: (row) => row.name },
        { label: 'Bills', cell: (row) => row.bills, numeric: true },
      ]}
      onClose={vi.fn()}
      {...props}
    />
  );
}

function renderDrill(props: Partial<React.ComponentProps<typeof OpsDrill<Row>>> = {}) {
  return render(drill(props));
}

describe('OpsDrill row expansion', () => {
  it('opens a row detail underneath the row, not over it', () => {
    renderDrill({
      expandedKey: 'a',
      onRowClick: vi.fn(),
      renderExpanded: (row) => <p>The {row.bills} bills waiting</p>,
    });

    const panel = screen.getByRole('dialog');
    expect(panel.textContent).toContain('The 6 bills waiting');
    // The list the reader was scanning is still there — the whole point of
    // expanding rather than navigating.
    expect(panel.textContent).toContain('Canteen Store');
    expect(panel.textContent).toContain('Area Manager');
  });

  it('opens only the row whose key is given', () => {
    renderDrill({
      expandedKey: 'b',
      onRowClick: vi.fn(),
      renderExpanded: (row) => <p>{`detail for ${row.key}`}</p>,
    });

    const panel = screen.getByRole('dialog');
    expect(panel.textContent).toContain('detail for b');
    expect(panel.textContent).not.toContain('detail for a');
  });

  it('turns the chevron to face down on the open row', () => {
    // The chevron is the only thing that says whether a click opens something
    // here or takes the reader somewhere else.
    renderDrill({
      expandedKey: 'a',
      onRowClick: vi.fn(),
      renderExpanded: () => <p>detail</p>,
    });

    const chevrons = [...screen.getByRole('dialog').querySelectorAll('.ops-drill__gocol')]
      .filter((cell) => cell.tagName === 'TD')
      .map((cell) => cell.textContent);
    expect(chevrons).toEqual(['⌄', '›']);
  });

  it('reports the open state to a screen reader, not only in ink', () => {
    renderDrill({
      expandedKey: 'a',
      onRowClick: vi.fn(),
      renderExpanded: () => <p>detail</p>,
    });

    // Found by their own text: the detail row is a table row too, so the
    // closed row is not simply the one after the open one.
    expect(screen.getByText('Canteen Store').closest('tr')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(screen.getByText('Area Manager').closest('tr')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('asks the caller to toggle, passing the row that was clicked', () => {
    const onRowClick = vi.fn();
    renderDrill({ onRowClick, renderExpanded: () => <p>detail</p> });

    fireEvent.click(within(screen.getByRole('dialog')).getByText('Area Manager'));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1], 1);
  });

  it('expands nothing on a table that was given no way to expand', () => {
    // A stale `expandedKey` from a panel with no `renderExpanded` must not
    // open a blank strip under a row.
    renderDrill({ expandedKey: 'a', onRowClick: vi.fn() });

    const rows = screen.getAllByRole('row');
    // A header and the two rows — no detail row between them.
    expect(rows).toHaveLength(3);
    expect(rows[1].getAttribute('aria-expanded')).toBeNull();
  });

  it('leaves a row with nothing under it inert, chevron and all', () => {
    // A day the plant dispatched nothing has no customers to show. A chevron
    // beside it would promise a list that cannot exist.
    renderDrill({
      onRowClick: vi.fn(),
      renderExpanded: () => <p>detail</p>,
      canOpenRow: (row) => row.bills > 0,
      rows: [ROWS[0], { key: 'c', name: 'Quiet Day', bills: 0 }],
    });

    const chevrons = [...screen.getByRole('dialog').querySelectorAll('td.ops-drill__gocol')].map(
      (cell) => cell.textContent,
    );
    expect(chevrons).toEqual(['›', '']);

    const quiet = screen.getByText('Quiet Day').closest('tr');
    expect(quiet?.getAttribute('tabindex')).toBeNull();
    expect(quiet?.getAttribute('aria-expanded')).toBeNull();
    expect(quiet?.className).not.toContain('ops-drill__rowopen');
  });

  it('does not open a row it said could not be opened', () => {
    const onRowClick = vi.fn();
    renderDrill({
      onRowClick,
      renderExpanded: () => <p>detail</p>,
      canOpenRow: (row) => row.bills > 0,
      rows: [{ key: 'c', name: 'Quiet Day', bills: 0 }],
    });

    fireEvent.click(within(screen.getByRole('dialog')).getByText('Quiet Day'));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  /*
   * The detail used to arrive and leave between two frames: the rows below it
   * jumped by however tall it happened to be, and the reader had to find their
   * place again in a list that had just moved under them. These pin the fold
   * that replaced that — the box the animation runs on, and the fact that a
   * closed row survives long enough to play it.
   */
  it('opens the detail inside a box that can be folded', () => {
    renderDrill({
      expandedKey: 'a',
      onRowClick: vi.fn(),
      renderExpanded: () => <p>detail</p>,
    });

    const fold = screen.getByRole('dialog').querySelector('.ops-drill__fold');
    expect(fold).not.toBeNull();
    expect(fold?.className).not.toContain('ops-drill__fold--shut');
    // The clipped child is what makes the `0fr` track mean anything — a fold
    // of one element animates nothing. See ops-board.css.
    expect(fold?.firstElementChild?.textContent).toBe('detail');
  });

  it('holds a closed row on screen while it folds shut, then drops it', () => {
    vi.useFakeTimers();
    try {
      const props = { onRowClick: vi.fn(), renderExpanded: () => <p>detail</p> };
      const { rerender } = render(drill({ ...props, expandedKey: 'a' }));

      rerender(drill({ ...props, expandedKey: null }));

      // Still there, and now on its way out: unmounted on the spot there is
      // nothing left for the fold to run on.
      const fold = screen.getByRole('dialog').querySelector('.ops-drill__fold');
      expect(fold?.className).toContain('ops-drill__fold--shut');
      expect(screen.getByText('Canteen Store').closest('tr')?.getAttribute('aria-expanded')).toBe(
        'false',
      );

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('dialog').querySelector('.ops-drill__fold')).toBeNull();
      expect(screen.getByRole('dialog').textContent).not.toContain('detail');
    } finally {
      vi.useRealTimers();
    }
  });

  it('holds nothing open on a row reopened while it was still folding', () => {
    vi.useFakeTimers();
    try {
      const props = { onRowClick: vi.fn(), renderExpanded: () => <p>detail</p> };
      const { rerender } = render(drill({ ...props, expandedKey: 'a' }));
      rerender(drill({ ...props, expandedKey: null }));
      rerender(drill({ ...props, expandedKey: 'a' }));

      const fold = screen.getByRole('dialog').querySelector('.ops-drill__fold');
      expect(fold?.className).not.toContain('ops-drill__fold--shut');

      // The fold that never finished must not take the reopened row with it.
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('dialog').textContent).toContain('detail');
    } finally {
      vi.useRealTimers();
    }
  });

  it('leaves a plain read-only table alone', () => {
    renderDrill();

    const panel = screen.getByRole('dialog');
    expect(panel.querySelector('.ops-drill__gocol')).toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
});
