import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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
  return render(
    <ReportResultTable
      columns={columns}
      rows={rows}
      wasTruncated={false}
      rowLimit={5000}
      {...props}
    />,
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
      ['1001', 'ACME TRADERS', '1234.5'],
      ['1002', 'BHARAT OIL', '90'],
      ['1003', 'CHANDNI STORES', '7'],
    ]);
  });

  it('copies only the ticked rows, headings left out', async () => {
    renderTable();

    fireEvent.click(screen.getByLabelText('Select row 2'));
    fireEvent.click(screen.getByRole('button', { name: /copy 1 selected/i }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(copiedGrid()).toEqual([['1002', 'BHARAT OIL', '90']]);
  });

  it('copies what the search left, in the order the sort put it', async () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /doc no\./i }));
    fireEvent.click(screen.getByRole('button', { name: /doc no\./i }));

    fireEvent.click(screen.getByRole('button', { name: /copy 3 rows/i }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(copiedGrid().map((row) => row[0])).toEqual(['1003', '1002', '1001']);
  });

  it('ticks every shown row from the header', async () => {
    renderTable();

    fireEvent.click(screen.getByLabelText('Select every row shown'));

    fireEvent.click(screen.getByRole('button', { name: /copy 3 selected/i }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(copiedGrid()).toHaveLength(3);
  });
});
