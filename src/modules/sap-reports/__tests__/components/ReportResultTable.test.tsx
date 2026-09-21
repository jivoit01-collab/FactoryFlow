import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// The grid resolves the document numbers on screen to app records. This
// suite is about copying and selection, so nothing resolves.
vi.mock('../../api/sapReports.api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, sapReportsApi: { resolveReferences: vi.fn(async () => ({})) } };
});

import type { SapReportCell, SapReportColumn } from '../../api';
import { ReportResultTable } from '../../components/ReportResultTable';

const columns: SapReportColumn[] = [
  { key: 'DocNum', label: 'Doc No.', type: 'number' },
  { key: 'CardName', label: 'Customer', type: 'text' },
  { key: 'DocTotal', label: 'Total', type: 'number' },
];

const rows: SapReportCell[][] = [
  [1001, 'ACME TRADERS', 1234.5],
  [1002, 'BHARAT OIL', 90],
  [1003, 'CHANDNI STORES', 7],
];

const writeText = vi.fn(() => Promise.resolve());

function renderTable(props: Partial<Parameters<typeof ReportResultTable>[0]> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ReportResultTable
          columns={columns}
          rows={rows}
          wasTruncated={false}
          rowLimit={5000}
          {...props}
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/** The clipboard text of the most recent copy, split back into rows and cells. */
function copiedGrid(): string[][] {
  const text = writeText.mock.calls.at(-1)?.[0] as unknown as string;
  return text.split('\r\n').map((line) => line.split('\t'));
}

describe('ReportResultTable copying', () => {
  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  it('copies every row when nothing is ticked', async () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /copy 3 rows/i }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(copiedGrid()).toEqual([
      ['Doc No.', 'Customer', 'Total'],
      ['1001', 'ACME TRADERS', '1234.5'],
      ['1002', 'BHARAT OIL', '90'],
      ['1003', 'CHANDNI STORES', '7'],
    ]);
  });

  it('copies only the ticked rows, under the headings', async () => {
    renderTable();

    fireEvent.click(screen.getByLabelText('Select row 2'));
    fireEvent.click(screen.getByRole('button', { name: /copy 1 selected/i }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(copiedGrid()).toEqual([
      ['Doc No.', 'Customer', 'Total'],
      ['1002', 'BHARAT OIL', '90'],
    ]);
  });

  it('copies what the search left, in the order the sort put it', async () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Doc No.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Doc No.' }));

    fireEvent.click(screen.getByRole('button', { name: /copy 3 rows/i }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(copiedGrid().map((row) => row[0])).toEqual(['Doc No.', '1003', '1002', '1001']);
  });

  it('ticks every shown row from the header', async () => {
    renderTable();

    fireEvent.click(screen.getByLabelText('Select every row shown'));

    fireEvent.click(screen.getByRole('button', { name: /copy 3 selected/i }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    // Three rows plus the heading line.
    expect(copiedGrid()).toHaveLength(4);
  });
});

describe('ReportResultTable totals', () => {
  /** The totals row, cell by cell, as it sits over the headings. */
  function totalsCells(): string[] {
    const row = screen.getByRole('row', { name: 'Column totals' });
    return [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? '');
  }

  it('puts each total in its own column', () => {
    renderTable();

    // The tick column, then Doc No. carrying the label, Customer, and the total.
    expect(totalsCells()).toEqual(['', 'Total', '', '1,331.50']);
  });

  it('sits above the headings, inside the header that stays put', () => {
    renderTable();

    const row = screen.getByRole('row', { name: 'Column totals' });
    const head = row.closest('thead');
    expect(head?.firstElementChild).toBe(row);
  });

  it('leaves the document numbers out — their sum is nobody’s answer', () => {
    renderTable();

    // 1001 + 1002 + 1003, which no one asked for.
    expect(totalsCells()).not.toContain('3,006');
  });

  it('follows the search, and says so', async () => {
    renderTable();

    fireEvent.change(screen.getByPlaceholderText(/search these rows/i), {
      target: { value: 'BHARAT' },
    });

    await waitFor(() => expect(totalsCells()).toEqual(['', 'Filtered total', '', '90']));
  });

  it('totals only the ticked rows once any are ticked', () => {
    renderTable();

    fireEvent.click(screen.getByLabelText('Select row 3'));

    expect(totalsCells()).toEqual(['', 'Selected total', '', '7']);
  });
});

describe('ReportResultTable column filters', () => {
  /** The rows of the grid itself, by their first real column. */
  function bodyRows(): string[] {
    return [...document.querySelectorAll('tbody tr')].map(
      (row) => row.querySelectorAll('td')[1]?.textContent ?? '',
    );
  }

  async function openFilter(label: string): Promise<HTMLElement> {
    fireEvent.click(screen.getByRole('button', { name: `Filter ${label}` }));
    return screen.findByRole('dialog');
  }

  it('gives every column a funnel', () => {
    renderTable();

    expect(screen.getByRole('button', { name: 'Filter Doc No.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter Customer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter Total' })).toBeInTheDocument();
  });

  it('keeps only the rows a value is ticked for', async () => {
    renderTable();

    const dropdown = await openFilter('Customer');
    fireEvent.click(within(dropdown).getByText('BHARAT OIL'));

    expect(bodyRows()).toEqual(['1,002']);
  });

  it('offers a number the way the cell under it spells it', async () => {
    renderTable();

    const dropdown = await openFilter('Total');
    // 1234.5 reads as 1,234.50 in the grid; a filter offering "1234.5" would
    // look like it belongs to a different table.
    expect(within(dropdown).getByText('1,234.50')).toBeInTheDocument();
  });

  it('counts the totals over what the filters left', async () => {
    renderTable();

    const dropdown = await openFilter('Customer');
    fireEvent.click(within(dropdown).getByText('BHARAT OIL'));

    const totals = screen.getByRole('row', { name: 'Column totals' });
    expect([...totals.querySelectorAll('td')].map((cell) => cell.textContent)).toEqual([
      '',
      'Filtered total',
      '',
      '90',
    ]);
  });

  it('drops every column filter at once', async () => {
    renderTable();

    const dropdown = await openFilter('Customer');
    fireEvent.click(within(dropdown).getByText('BHARAT OIL'));

    fireEvent.click(screen.getByRole('button', { name: /clear filter/i }));

    expect(bodyRows()).toHaveLength(3);
  });

  it('sorts up, down, then back to the order SAP sent', () => {
    renderTable();

    const heading = () => screen.getByRole('button', { name: 'Sort by Total' });

    fireEvent.click(heading());
    expect(bodyRows()).toEqual(['1,003', '1,002', '1,001']);

    fireEvent.click(heading());
    expect(bodyRows()).toEqual(['1,001', '1,002', '1,003']);

    // The third click undoes the sort rather than starting the cycle again —
    // a report's own ORDER BY is an answer in itself.
    fireEvent.click(heading());
    expect(bodyRows()).toEqual(['1,001', '1,002', '1,003']);
  });
});
