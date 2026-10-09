import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  blockToHtml,
  blockToPng,
  blockToTsv,
  type CopyBlock,
  copyBlock,
  plainFigure,
} from '../clipboard';

const BLOCK: CopyBlock = {
  headers: ['Party', 'Oil LTR'],
  alignRight: [false, true],
  rows: [
    ['CHIRAG ENTERPRISES <MUMBAI>', '10,913'],
    ['ARJUN DASS & SONS', '7,75,000'],
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * A canvas that draws nothing but says yes, so a picture CAN be made — which
 * jsdom, having no 2d context, otherwise never allows.
 */
function fakeCanvas() {
  const ctx = new Proxy(
    {},
    {
      get: (_target, name) => (name === 'measureText' ? () => ({ width: 40 }) : () => undefined),
      set: () => true,
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) =>
    done(new Blob(['png'], { type: 'image/png' })),
  );
}

/** A clipboard that records what each write offered. */
function recordingClipboard() {
  const write = vi.fn().mockResolvedValue(undefined);
  const parts: Record<string, Blob>[] = [];
  vi.stubGlobal(
    'ClipboardItem',
    class {
      constructor(items: Record<string, Blob>) {
        parts.push(items);
      }
    },
  );
  vi.stubGlobal('navigator', { clipboard: { write, writeText: vi.fn() } });
  return { write, parts };
}

describe('a figure for a spreadsheet', () => {
  it('drops the grouping, lakh or thousand', () => {
    // Calc in English (USA) reads "7,75,000" as text; "775000" as a number.
    expect(plainFigure('7,75,000')).toBe('775000');
    expect(plainFigure('12,34,56,789')).toBe('123456789');
    expect(plainFigure('1,234,567')).toBe('1234567');
    expect(plainFigure('-2,19,125.50')).toBe('-219125.50');
  });

  it('leaves alone what is not a grouped figure', () => {
    expect(plainFigure('607')).toBe('607');
    expect(plainFigure('')).toBe('');
    expect(plainFigure('—')).toBe('—');
    expect(plainFigure('1,2')).toBe('1,2');
    expect(plainFigure('PET, 1 LTR')).toBe('PET, 1 LTR');
  });
});

describe('a block on the clipboard', () => {
  it('writes the cells tab-separated, a line per row, the figures plain', () => {
    expect(blockToTsv(BLOCK)).toBe('CHIRAG ENTERPRISES <MUMBAI>\t10913\nARJUN DASS & SONS\t775000');
  });

  it('touches the grouping only in figure columns', () => {
    // An item code or a remark that happens to read like a number is still text.
    const block: CopyBlock = {
      headers: ['Ref', 'Qty'],
      alignRight: [false, true],
      rows: [['1,234', '1,234']],
    };
    expect(blockToTsv(block)).toBe('1,234\t1234');
  });

  it('writes a real table, which is what makes a spreadsheet paste cells', () => {
    const html = blockToHtml(BLOCK);
    expect(html).toContain('<table');
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html).toContain('text-align:right');
    expect(html).toContain('>775000</td>');
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
    // jsdom has no 2d context, which is the same shape as a browser refusing one.
    await expect(blockToPng(BLOCK)).resolves.toBeNull();
  });
});

describe('copying as cells', () => {
  it('offers the table and the text, and never the picture', async () => {
    // The bug: offered a picture beside the table, LibreOffice Calc pasted
    // the picture. So even where one could be drawn, cells go alone.
    fakeCanvas();
    await expect(blockToPng(BLOCK)).resolves.not.toBeNull();
    const { write, parts } = recordingClipboard();

    await expect(copyBlock(BLOCK)).resolves.toBe(true);

    expect(write).toHaveBeenCalledOnce();
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

describe('copying as a picture', () => {
  it('offers the picture alone', async () => {
    fakeCanvas();
    const { write, parts } = recordingClipboard();

    await expect(copyBlock(BLOCK, 'picture')).resolves.toBe(true);

    expect(write).toHaveBeenCalledOnce();
    expect(Object.keys(parts[0])).toEqual(['image/png']);
  });

  it('says it could not, rather than copying text the user did not ask for', async () => {
    // No canvas here, so no picture.
    const { write } = recordingClipboard();
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { write, writeText } });

    await expect(copyBlock(BLOCK, 'picture')).resolves.toBe(false);

    expect(write).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });
});
