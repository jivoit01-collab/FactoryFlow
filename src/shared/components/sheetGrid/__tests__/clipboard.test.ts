import { afterEach, describe, expect, it, vi } from 'vitest';

import { blockToHtml, blockToPng, blockToTsv, type CopyBlock, copyBlock } from '../clipboard';

const BLOCK: CopyBlock = {
  headers: ['Party', 'Oil LTR'],
  alignRight: [false, true],
  rows: [
    ['CHIRAG ENTERPRISES <MUMBAI>', '10,913'],
    ['ARJUN DASS & SONS', '11,996'],
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a block on the clipboard', () => {
  it('writes the cells tab-separated, a line per row', () => {
    expect(blockToTsv(BLOCK)).toBe(
      'CHIRAG ENTERPRISES <MUMBAI>\t10,913\nARJUN DASS & SONS\t11,996',
    );
  });

  it('writes a real table, which is what makes a spreadsheet paste cells', () => {
    const html = blockToHtml(BLOCK);
    expect(html).toContain('<table');
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html).toContain('text-align:right');
  });

  it('escapes what would otherwise be markup', () => {
    const html = blockToHtml(BLOCK);
    expect(html).toContain('CHIRAG ENTERPRISES &lt;MUMBAI&gt;');
    expect(html).toContain('ARJUN DASS &amp; SONS');
  });

  it('leaves the headings out of the cells — they belong to the picture', () => {
    // Pasted under existing rows in a spreadsheet, a heading nobody picked
    // would arrive as data.
    expect(blockToTsv(BLOCK)).not.toContain('Party');
    expect(blockToHtml(BLOCK)).not.toContain('Oil LTR');
  });

  it('gives up on the picture rather than throwing where there is no canvas', async () => {
    // jsdom has no 2d context, which is the same shape as a browser refusing
    // one: the copy must still happen, without the image.
    await expect(blockToPng(BLOCK)).resolves.toBeNull();
  });
});

describe('copying', () => {
  it('offers the text, the table and the picture in one write', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const parts: Record<string, Blob>[] = [];
    vi.stubGlobal('ClipboardItem', class {
      constructor(items: Record<string, Blob>) {
        parts.push(items);
      }
    });
    vi.stubGlobal('navigator', { clipboard: { write, writeText: vi.fn() } });

    await expect(copyBlock(BLOCK)).resolves.toBe(true);

    expect(write).toHaveBeenCalledOnce();
    // No picture here — jsdom has no canvas — but both text forms are there,
    // which is what a spreadsheet and a text box read.
    expect(Object.keys(parts[0]).sort()).toEqual(['text/html', 'text/plain']);
  });

  it('falls back to plain text when the rich write is refused', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('ClipboardItem', class {});
    vi.stubGlobal('navigator', {
      clipboard: { write: vi.fn().mockRejectedValue(new Error('denied')), writeText },
    });

    await expect(copyBlock(BLOCK)).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith(blockToTsv(BLOCK));
  });

  it('says so when the clipboard cannot be had at all', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    await expect(copyBlock(BLOCK)).resolves.toBe(false);
  });
});
