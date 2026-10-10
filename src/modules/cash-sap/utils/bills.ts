/**
 * The cash book's own rules (`cash_book.services.ATTACHMENT_EXTENSIONS` /
 * `MAX_ATTACHMENT_BYTES`), which `cash_sap/uploads.py` reads. Checked here
 * only to answer at once; the server checks again.
 */
export const BILL_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
] as const;
export const MAX_BILL_BYTES = 15 * 1024 * 1024;

/** Why the file cannot be a bill, or null when it can. */
export function billFileProblem(file: File): string | null {
  const name = file.name || 'That file';
  const dot = name.lastIndexOf('.');
  const suffix = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  if (!(BILL_EXTENSIONS as readonly string[]).includes(suffix)) {
    return `${name} is not a bill. Attach a photograph or a PDF (${BILL_EXTENSIONS.join(', ')}).`;
  }
  if (file.size <= 0) return `${name} is empty.`;
  if (file.size > MAX_BILL_BYTES) {
    return `${name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The most that can be attached is 15 MB.`;
  }
  return null;
}
