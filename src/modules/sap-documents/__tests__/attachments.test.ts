import { afterEach, describe, expect, it, vi } from 'vitest';

import { inlineType, openOrSave } from '../utils/attachments';
import { cleanAddress, sapDate } from '../utils/format';

describe('inlineType', () => {
  it('opens PDFs, pictures and plain text in a tab', () => {
    expect(inlineType('scan.pdf', 'application/pdf')).toBe('application/pdf');
    expect(inlineType('SN.jpeg', 'image/jpeg')).toBe('image/jpeg');
    expect(inlineType('list.txt', 'text/plain; charset=utf-8')).toBe('text/plain');
  });

  it('decides by the name when the server sent no useful type', () => {
    expect(inlineType('scan.PNG', 'application/octet-stream')).toBe('image/png');
    expect(inlineType('scan.pdf', '')).toBe('application/pdf');
  });

  it('never opens HTML, SVG or office files in a tab', () => {
    expect(inlineType('invoice.html', 'text/html')).toBeNull();
    expect(inlineType('logo.svg', 'image/svg+xml')).toBeNull();
    expect(inlineType('invoice.html', 'application/octet-stream')).toBeNull();
    expect(inlineType('rates.xlsx', 'application/octet-stream')).toBeNull();
  });
});

describe('openOrSave', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a PDF and saves a spreadsheet under its SAP name', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    expect(openOrSave(new Blob(['%PDF'], { type: 'application/pdf' }), 'scan.pdf')).toBe('opened');
    expect(open).toHaveBeenCalledWith('blob:x', '_blank', 'noopener');
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe('application/pdf');

    expect(openOrSave(new Blob(['PK']), 'rates.xlsx')).toBe('saved');
    expect(click).toHaveBeenCalledTimes(1);
    expect((createObjectURL.mock.calls[1][0] as Blob).type).toBe('application/octet-stream');
  });
});

describe('format helpers', () => {
  it('drops the empty lines SAP leaves in an address', () => {
    expect(cleanAddress('Plot 1\r-\rBahadurgarh\r\rIN')).toBe('Plot 1\nBahadurgarh\nIN');
    expect(cleanAddress('-\rIN')).toBe('');
  });

  it('shows a missing date as a dash', () => {
    expect(sapDate(null)).toBe('-');
  });
});
