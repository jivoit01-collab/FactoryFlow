import type { SapReportColumn } from '../api';

/**
 * Column headings that carry a SAP document number we can look up. A movement
 * report calls it "Reference No" (OINM.BASE_REF); most others say DocNum.
 * Compared with punctuation and case stripped, since the heading is whatever
 * the query author typed in SAP.
 */
const REFERENCE_HEADINGS = new Set([
  'referenceno',
  'reference',
  'refno',
  'baseref',
  'docnum',
  'docno',
  'documentno',
  'documentnumber',
  'sapdocnum',
]);

function normaliseHeading(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The first column whose heading looks like a document reference, or -1. */
export function findReferenceColumn(columns: SapReportColumn[]): number {
  return columns.findIndex(
    (column) =>
      REFERENCE_HEADINGS.has(normaliseHeading(column.key)) ||
      REFERENCE_HEADINGS.has(normaliseHeading(column.label)),
  );
}
