import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/shared/components/ui';
import { formatDate, formatNumber } from '@/shared/utils';

import type { SapDocumentHit } from '../api';
import { universalSearchApi } from '../api';

export interface DocumentDetailPaneProps {
  companyCode: string;
  hit: SapDocumentHit;
}

/**
 * One SAP document's header and lines.
 *
 * Fetched on open rather than with the search: the search asks fifteen tables
 * in every company and has to stay quick, and nobody opens more than one of
 * its hits.
 */
export function DocumentDetailPane({ companyCode, hit }: DocumentDetailPaneProps) {
  const detail = useQuery({
    queryKey: ['universal-search-document', companyCode, hit.kind, hit.doc_entry],
    queryFn: () => universalSearchApi.document(companyCode, hit.kind, hit.doc_entry),
    staleTime: 60_000,
    retry: false,
  });

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading the document…
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        SAP would not hand this document over. It may have been removed.
      </p>
    );
  }

  const document = detail.data;
  // A production order has no partner and no money on it; its lines are
  // components. Everything below adapts rather than showing empty columns.
  const isProduction = document.kind === 'PRODUCTION_ORDER';

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{document.label}</span>
          <span className="tabular-nums">{document.doc_num}</span>
          {document.is_cancelled ? (
            <Badge variant="destructive">Cancelled</Badge>
          ) : (
            document.status && <Badge variant="outline">{document.status}</Badge>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Field label="Date" value={document.doc_date ? formatDate(document.doc_date) : '—'} />
          <Field
            label={isProduction ? 'Item' : document.partner_label || 'Business partner'}
            value={document.card_name || document.card_code || '—'}
          />
          {!isProduction && (
            <Field
              label="Total"
              value={
                document.doc_total === null
                  ? '—'
                  : `${formatNumber(document.doc_total)} ${document.currency}`.trim()
              }
            />
          )}
          {document.ref_no && <Field label="Reference" value={document.ref_no} />}
          <Field label="SAP key" value={`DocEntry ${document.doc_entry}`} />
        </dl>
      </div>

      {document.lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">This document has no lines.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-left font-medium">Whs</th>
                {!isProduction && (
                  <>
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {document.lines.map((line, index) => (
                <tr key={`${line.line_num ?? index}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{line.item_code}</div>
                    <div className="text-xs text-muted-foreground">{line.description}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {line.quantity === null ? '—' : formatNumber(line.quantity, 0)}
                    {line.unit && (
                      <span className="ml-1 text-xs text-muted-foreground">{line.unit}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{line.warehouse}</td>
                  {!isProduction && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {line.price === null ? '—' : formatNumber(line.price)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {line.line_total === null ? '—' : formatNumber(line.line_total)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
