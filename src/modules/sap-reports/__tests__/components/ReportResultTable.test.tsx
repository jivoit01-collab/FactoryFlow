import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

    fireEvent.click(screen.getByRole('button', { name: /doc no\./i }));
    fireEvent.click(screen.getByRole('button', { name: /doc no\./i }));

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
  /** The value printed under a totals heading. */
  function totalFor(label: string): string {
    const heading = screen.getByTitle(label);
    return heading.nextElementSibling?.textContent ?? '';
  }

  it('totals the amount columns and leaves the document numbers out', () => {
    renderTable();

    expect(totalFor('Total')).toBe('1,331.50');
    // Doc No. is a label, not an amount — 1001 + 1002 + 1003 is nobody's answer.
    expect(screen.queryByTitle('Doc No.')).toBeNull();
    expect(screen.getByText('all 3 rows')).toBeInTheDocument();
  });

  it('follows the search', async () => {
    renderTable();

    fireEvent.change(screen.getByPlaceholderText(/search these rows/i), {
      target: { value: 'BHARAT' },
    });

    await waitFor(() => expect(totalFor('Total')).toBe('90'));
    expect(screen.getByText(/1 row of 3/)).toBeInTheDocument();
  });

  it('totals only the ticked rows once any are ticked', () => {
    renderTable();

    fireEvent.click(screen.getByLabelText('Select row 3'));

    expect(totalFor('Total')).toBe('7');
    expect(screen.getByText('1 row selected')).toBeInTheDocument();
  });
});
