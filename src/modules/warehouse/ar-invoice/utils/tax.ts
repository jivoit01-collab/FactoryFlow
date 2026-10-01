import type { ARInvoiceLine } from '../types';

/** The org's tax codes embed their rate ("CG+SG@5", "IGST@12") — parse it to
 * estimate the gross. SAP's own computation at posting stays authoritative. */
export function taxRate(taxCode: string | null | undefined): number | null {
  const match = /@(\d+(?:\.\d+)?)/.exec(taxCode ?? '');
  return match ? Number(match[1]) : null;
}

/** One line's value including tax, or null when its tax code carries no rate. */
export function lineInclTax(lineTotal: number, taxCode: string | null | undefined): number | null {
  const rate = taxRate(taxCode);
  return rate == null ? null : lineTotal * (1 + rate / 100);
}

export interface BillTotals {
  beforeTax: number;
  /** Null when any line's tax code carries no rate. */
  tax: number | null;
  inclTax: number | null;
}

/**
 * A bill's lines before tax and, estimated from their tax codes, with it — the
 * figure the counter quotes. Until SAP posts the bill this is the only total
 * including tax there is; afterwards SAP's own total replaces it.
 */
export function billTotals(lines: Pick<ARInvoiceLine, 'line_total' | 'tax_code'>[]): BillTotals {
  let beforeTax = 0;
  let inclTax: number | null = 0;
  for (const line of lines) {
    const net = Number(line.line_total) || 0;
    beforeTax += net;
    const gross = lineInclTax(net, line.tax_code);
    inclTax = inclTax == null || gross == null ? null : inclTax + gross;
  }
  return { beforeTax, tax: inclTax == null ? null : inclTax - beforeTax, inclTax };
}
