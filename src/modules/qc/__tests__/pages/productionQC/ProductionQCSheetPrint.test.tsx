/**
 * The printed document sheet: the paper form it replaces — controlled
 * header and footer, ten time columns a page, blank columns to fill the page.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProductionQCEntry, ProductionQCResult } from '@/modules/qc/types/productionQC.types';

import { ProductionQCSheet } from '../../../pages/productionQC/ProductionQCSheet';
import {
  type ProductionQCSheetPrintPayload,
  ProductionQCSheetPrintView,
} from '../../../pages/productionQC/ProductionQCSheetPrint';

const result = (overrides: Partial<ProductionQCResult> = {}): ProductionQCResult =>
  ({
    id: 1,
    parameter_id: 1,
    parameter_code: 'FFA',
    parameter_name: 'Free Fatty Acids',
    standard_value: '-',
    parameter_type: 'NUMERIC',
    min_value: null,
    max_value: null,
    uom: '%',
    sequence: 1,
    is_mandatory: true,
    result_value: '0.12',
    result_numeric: null,
    is_within_spec: true,
    remarks: '',
    ...overrides,
  }) as ProductionQCResult;

const entry = (id: number, overrides: Partial<ProductionQCEntry> = {}): ProductionQCEntry =>
  ({
    id,
    submission_entry_ids: [id],
    parameter_type: { id: 3, code: 'OIL_ONLINE_MONITORING', name: 'Oil Plant On-line Monitoring' },
    checked_at: new Date(Date.UTC(2026, 8, 29, 4, id)).toISOString(),
    status: 'APPROVED',
    status_label: 'Approved',
    out_of_spec_count: 0,
    submitted_by_name: 'Chemist',
    submitted_at: null,
    approved_by_name: 'QAM',
    approved_at: null,
    sent_back_by_name: null,
    sent_back_at: null,
    send_back_remarks: '',
    remarks: '',
    approval_remarks: '',
    results: [result()],
    ...overrides,
  }) as ProductionQCEntry;

const payload = (entries: ProductionQCEntry[]): ProductionQCSheetPrintPayload => ({
  title: 'Oil Plant On-line Monitoring',
  documentCode: 'QA-FRM-14-01-05-02',
  revision: '02',
  revisionDate: '2026-05-22',
  day: '2026-09-29',
  entries,
});

const pages = (container: HTMLElement) => [...container.querySelectorAll('.pqc-page')];
const timeHeaders = (page: Element) =>
  [...page.querySelectorAll('thead th')].slice(3).map((th) => th.textContent);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ProductionQCSheetPrintView', () => {
  it('prints on the controlled form: name, revision and the day', () => {
    const { container } = render(<ProductionQCSheetPrintView payload={payload([entry(1)])} />);
    const text = container.textContent ?? '';
    expect(text).toContain('JIVO WELLNESS PVT. LTD.');
    expect(text).toContain('OIL PLANT ON-LINE MONITORING');
    expect(text).toContain('Revision No.: 02/22-05-2026');
    expect(text).toContain('Date: 29-09-2026');
  });

  it('writes the form’s number in the Controlled Document box, not in the header', () => {
    const { container } = render(<ProductionQCSheetPrintView payload={payload([entry(1)])} />);
    const text = container.textContent ?? '';
    // No "Revision No | Document Code" row under the form's name…
    expect(text).not.toContain('Document Code:');
    expect(text).not.toContain('Revision No: 02');
    // …the number sits above "Controlled Document", with no label, as on the paper form.
    expect(text).not.toContain('Document ID:');
    expect(text).toContain('QA-FRM-14-01-05-02Controlled Document');
  });

  it('fills a short day out to the form’s ten time columns', () => {
    const { container } = render(
      <ProductionQCSheetPrintView payload={payload([entry(1), entry(2)])} />,
    );
    const [page] = pages(container);
    const headers = timeHeaders(page);
    expect(headers).toHaveLength(10);
    expect(headers.slice(2)).toEqual(Array(8).fill('Time'));
  });

  it('carries a long day onto another page, ten checks a page', () => {
    const entries = Array.from({ length: 12 }, (_, i) => entry(i + 1));
    const { container } = render(<ProductionQCSheetPrintView payload={payload(entries)} />);
    const printed = pages(container);
    expect(printed).toHaveLength(2);
    expect(timeHeaders(printed[1]).filter((h) => h !== 'Time')).toHaveLength(2);
  });

  it('marks an out-of-spec reading, and says what the mark means', () => {
    const { container } = render(
      <ProductionQCSheetPrintView
        payload={payload([
          entry(1, { results: [result({ result_value: '0.9', is_within_spec: false })] }),
        ])}
      />,
    );
    const flagged = container.querySelector('.pqc-flag');
    expect(flagged?.textContent).toBe('0.9 *');
    expect(container.textContent).toContain('* Out of specification.');
  });

  it('prints who filled and who approved, or that it still waits', () => {
    const { container } = render(
      <ProductionQCSheetPrintView
        payload={payload([entry(1), entry(2, { status: 'PENDING', approved_by_name: null })])}
      />,
    );
    const qam = [...container.querySelectorAll('tbody tr')].find((tr) =>
      tr.textContent?.startsWith('Q.A.M'),
    )!;
    // The print view is hidden from assistive tech, so read its cells directly.
    const cells = [...qam.querySelectorAll('td')].map((c) => c.textContent);
    expect(cells.slice(3, 5)).toEqual(['QAM', 'Pending']);
  });
});

describe('the sheet’s Print button', () => {
  it('opens the print dialog on the printed form', () => {
    vi.useFakeTimers();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <ProductionQCSheet
          title="Oil Plant On-line Monitoring"
          documentCode="QA-FRM-14-01-05-02"
          revision="02"
          revisionDate="2026-05-22"
          day="2026-09-29"
          entries={[entry(1)]}
        />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Print the Oil Plant On-line Monitoring sheet/ }),
    );
    expect(document.body.querySelector('.pqc-print')).not.toBeNull();
    expect(document.body.classList.contains('pqc-printing')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
