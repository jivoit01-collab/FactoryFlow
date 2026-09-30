/**
 * The sheet view: a day's checks laid out as the paper record — a column per
 * check, the product / SKU / line on top, each parameter with its unit.
 */

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { ProductionQCEntry, ProductionQCResult } from '@/modules/qc/types/productionQC.types';

import { ProductionQCSheet } from '../../../pages/productionQC/ProductionQCSheet';

const result = (overrides: Partial<ProductionQCResult>): ProductionQCResult =>
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
    sequence: 2,
    is_mandatory: true,
    result_value: '0.12',
    result_numeric: '0.1200',
    is_within_spec: true,
    remarks: '',
    ...overrides,
  }) as ProductionQCResult;

const entry = (overrides: Partial<ProductionQCEntry>): ProductionQCEntry =>
  ({
    id: 3,
    line_id: 1,
    line_name: 'Water Line',
    run_id: 4,
    run_number: 4,
    item_code: '',
    product: 'REFINED COTTON SEED OIL 13 KGS',
    parameter_type: { id: 3, code: 'OIL_ONLINE_MONITORING', name: 'Oil Plant On-line Monitoring' },
    checked_at: '2026-09-29T12:00:00Z',
    status: 'APPROVED',
    status_label: 'Approved',
    out_of_spec_count: 0,
    submitted_by_name: 'Test User',
    submitted_at: '2026-09-29T12:00:00Z',
    approved_by_name: 'QA Manager',
    approved_at: '2026-09-29T12:30:00Z',
    sent_back_by_name: null,
    sent_back_at: null,
    send_back_remarks: '',
    remarks: '',
    approval_remarks: '',
    results: [
      result({
        id: 1,
        parameter_code: 'BATCH_NO',
        parameter_name: 'Batch No.',
        uom: '',
        sequence: 1,
        parameter_type: 'TEXT',
        result_value: 'B-17',
      }),
      result({ id: 2 }),
    ],
    ...overrides,
  }) as ProductionQCEntry;

function renderSheet(entries: ProductionQCEntry[]) {
  render(
    <MemoryRouter>
      <ProductionQCSheet
        title="Oil Plant On-line Monitoring"
        description="QA-FRM-14-01-05-02, Rev. 02/22-05-2026"
        day="2026-09-29"
        entries={entries}
      />
    </MemoryRouter>,
  );
  return screen.getByRole('region', { name: /Oil Plant On-line Monitoring record/ });
}

const rowOf = (label: string) => screen.getByRole('cell', { name: label }).closest('tr')!;

describe('ProductionQCSheet', () => {
  it('heads the form with its title, the date and its document code', () => {
    const sheet = renderSheet([entry({})]);
    expect(within(sheet).getByRole('heading')).toHaveTextContent('Oil Plant On-line Monitoring');
    expect(sheet).toHaveTextContent('Date: 29-09-2026');
    expect(sheet).toHaveTextContent('QA-FRM-14-01-05-02');
  });

  it('puts each check in its own column, in time order, linked to the entry', () => {
    renderSheet([
      entry({ id: 4, checked_at: '2026-09-29T12:24:00Z', line_name: '10 Head' }),
      entry({ id: 3, checked_at: '2026-09-29T12:00:00Z' }),
    ]);
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/qc/production/entries/3',
      '/qc/production/entries/4',
    ]);
    const line = within(rowOf('LINE ID'))
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(line.slice(3)).toEqual(['Water Line', '10 Head']);
  });

  it('lists product, SKU and line first, then the parameters in their order with units', () => {
    renderSheet([entry({ item_code: 'FG0000121' })]);
    const names = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[1].textContent);
    expect(names.slice(0, 5)).toEqual([
      'PRODUCT',
      'SKU',
      'LINE ID',
      'Batch No.',
      'Free Fatty Acids',
    ]);
    expect(within(rowOf('Free Fatty Acids')).getAllByRole('cell')[2]).toHaveTextContent('%');
    expect(within(rowOf('SKU')).getAllByRole('cell')[3]).toHaveTextContent('FG0000121');
  });

  it('marks an out-of-spec reading', () => {
    renderSheet([
      entry({
        results: [
          result({ result_value: '0.9', is_within_spec: false, standard_value: 'NMT 0.5' }),
        ],
      }),
    ]);
    const value = within(rowOf('Free Fatty Acids')).getAllByRole('cell')[3];
    expect(value).toHaveTextContent('0.9');
    expect(value).toHaveAttribute('title', 'Out of spec (NMT 0.5)');
  });

  it('shows who filled and who approved, or that it still waits', () => {
    renderSheet([
      entry({ id: 3 }),
      entry({
        id: 5,
        status: 'PENDING',
        approved_by_name: null,
        checked_at: '2026-09-29T13:00:00Z',
      }),
    ]);
    const qam = within(rowOf('Q.A.M'))
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(qam.slice(3)).toEqual(['QA Manager', 'Pending']);
    const chemist = within(rowOf('Q.A Chemist'))
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(chemist.slice(3)).toEqual(['Test User', 'Test User']);
  });
});
