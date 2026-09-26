/**
 * Opening a downloaded SAP attachment.
 *
 * An object URL runs in this app's origin, so only types a browser shows
 * without running anything — PDFs, pictures, plain text — open in a tab. The
 * rest (spreadsheets, Word files, ZIPs, and HTML or SVG that could carry a
 * script) are saved under their SAP name instead. The server applies the same
 * rule; this keeps a mislabelled file from slipping through.
 */

const INLINE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'text/plain',
  'text/csv',
]);

const INLINE_EXTENSIONS: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  txt: 'text/plain',
  csv: 'text/csv',
};

/** The type to open a file under in a tab, or null to save it instead. */
export function inlineType(fileName: string, blobType: string): string | null {
  const base = (blobType || '').split(';')[0].trim().toLowerCase();
  if (INLINE_TYPES.has(base)) return base;
  if (!base || base === 'application/octet-stream') {
    const extension = (fileName.split('.').pop() ?? '').toLowerCase();
    return INLINE_EXTENSIONS[extension] ?? null;
  }
  return null;
}

/** Open the file in a new tab, or save it; frees the object URL after a minute. */
export function openOrSave(blob: Blob, fileName: string): 'opened' | 'saved' {
  const type = inlineType(fileName, blob.type);
  const url = URL.createObjectURL(new Blob([blob], { type: type ?? 'application/octet-stream' }));
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (type) {
    window.open(url, '_blank', 'noopener');
    return 'opened';
  }
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'attachment';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return 'saved';
}
