/**
 * The document view's lines on screen (issue #36): each field in its own cell
 * rather than packed under the description, and "Copy for Excel" putting the
 * same columns on the clipboard as a sheet would take them.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/api', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('@/core/auth', () => ({ usePermission: () => ({ hasAllPermissions: () => true }) }));
const copyToClipboard = vi.fn();
vi.mock('@/shared/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/utils')>()),
  copyToClipboard: (text: string) => copyToClipboard(text),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import type { DocumentDetail } from '../api';
import { DocumentDetailBody } from '../components/DocumentDetailDialog';

const doc = {
  type: 'Drafts',
  label: 'Drafts',
  kind: 'draft',
  header: { party_role: 'vendor', card_code: 'VENDA001566', comments: 'A/P Invoices - VENDA001566' },
  totals: {},
  lines: [
    {
      line_num: 0,
      item_code: '',
      description: 'EDIBLE OIL',
      quantity: 0,
      uom: '',
      unit_price: 12598,
      discount_percent: 0,
      line_total: 12598,
      tax_code: 'RIGST@5',
      tax_percent: 5,
      tax_amount: 629.9,
      warehouse_code: '',
      warehouse_name: '',
      from_warehouse_code: '',
      from_warehouse_name: '',
      account_code: '5670001',
      account_name: 'FREIGHT AND CARTAGE OUTWARD-INDIRECT EXP',
      sac_code: '9967',
      sac_name: '',
      location_code: '',
      location_name: 'HARYANA',
      dimensions: [
        { code: 'MUSTARD', name: 'MUSTARD' },
        { code: '09-2026', name: '09-2026' },
        { code: 'DBKP', name: 'Delivery Bhakharpur' },
        { code: '', name: '' },
        { code: 'PB', name: 'PUNJAB' },
      ],
      project: '',
      base_type: '',
      base_label: '',
      base_entry: null,
      base_ref: '',
      received_qty: 0,
      dispatched_qty: 0,
      litres: 10000,
      bilty_no: 'DLH1000554',
      wtax_liable: true,
      bilty_date: '2026-09-09',
      ar_no: '626090278',
      sub_account: 'SALES',
      udf_card_code: 'CUSTA000486',
      purpose: '',
      remarks: 'BILTY NO DLH1000554',
    },
  ],
  tds: [],
  tds_section: '',
  ship_from: null,
  base_documents: [],
  attachment_entry: null,
  journal_entry: null,
  in_transit_journal_entries: [],
  journal_preview: null,
  posted_as: null,
  payment: null,
  warnings: [],
} as unknown as DocumentDetail;

describe('the lines of a freight bill', () => {
  beforeEach(() => {
    copyToClipboard.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it('shows each field under its own heading', () => {
    render(<DocumentDetailBody doc={doc} attachments={null} />);
    const table = screen.getByText('Service lines (1)').closest('section')!.querySelector('table')!;
    const headings = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    const cells = within(table)
      .getAllByRole('cell')
      .map((td) => td.textContent);
    const at = (label: string) => cells[headings.indexOf(label)];

    expect(at('Litre')).toBe('10,000');
    expect(at('Bilty Number')).toBe('DLH1000554');
    expect(at('Bilty Date')).toBe('09-09-2026');
    expect(at('ARNO')).toBe('626090278');
    expect(at('Sub Account')).toBe('SALES');
    expect(at('Customer Code')).toBe('CUSTA000486');
    expect(at('Loc.')).toBe('HARYANA');
    expect(at('Total (LC)')).toBe('12,598.00');
    expect(at('Budget')).toBe('Delivery Bhakharpur');
    // An empty field still holds its column, marked so it reads as empty.
    expect(at('Sub Budget')).toBe('—');
    // The description cell holds the description and nothing else.
    expect(at('Description')).toBe('EDIBLE OIL');
    expect(headings).not.toContain('Item / description');
  });

  it('copies the columns with their headings and plain figures', async () => {
    copyToClipboard.mockResolvedValue(true);
    render(<DocumentDetailBody doc={doc} attachments={null} />);
    fireEvent.click(screen.getByRole('button', { name: /copy for excel/i }));

    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledTimes(1));
    const [head, row] = (copyToClipboard.mock.calls[0][0] as string).split('\r\n').map((r) => r.split('\t'));
    expect(row[head.indexOf('Litre')]).toBe('10000');
    expect(row[head.indexOf('Total (LC)')]).toBe('12598');
    expect(row[head.indexOf('Bilty Date')]).toBe('09-09-2026');
    // The screen's dash is not data: the sheet gets a blank cell.
    expect(row[head.indexOf('Sub Budget')]).toBe('');
    expect(toast.success).toHaveBeenCalled();
  });

  it('says so when the clipboard is refused', async () => {
    copyToClipboard.mockResolvedValue(false);
    render(<DocumentDetailBody doc={doc} attachments={null} />);
    fireEvent.click(screen.getByRole('button', { name: /copy for excel/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
