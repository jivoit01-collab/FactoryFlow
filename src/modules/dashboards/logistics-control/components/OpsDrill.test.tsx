import { fireEvent, render, screen, within } from '@testing-library/react';
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

function renderDrill(props: Partial<React.ComponentProps<typeof OpsDrill<Row>>> = {}) {
  return render(
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
    />,
  );
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

  it('leaves a plain read-only table alone', () => {
    renderDrill();

    const panel = screen.getByRole('dialog');
    expect(panel.querySelector('.ops-drill__gocol')).toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
});
