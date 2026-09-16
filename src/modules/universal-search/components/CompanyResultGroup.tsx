import { AlertTriangle, ChevronRight, ExternalLink, Package } from 'lucide-react';

import { Badge } from '@/shared/components/ui';
import { cn, formatDate, formatNumber } from '@/shared/utils';

import type { AppRecordHit, BatchHit, CompanyResults, ItemHit, SapDocumentHit } from '../api';

export interface CompanyResultGroupProps {
  company: CompanyResults;
  onOpenDocument: (hit: SapDocumentHit) => void;
  onNavigate: (route: string) => void;
}

/**
 * One company's answer.
 *
 * Four kinds of hit share the group, in the order someone reads them: the SAP
 * documents the number *is*, the records in this app that *reference* it, then
 * the item and batch it might be instead. Each kind keeps its own row shape
 * rather than being flattened into a common one — a batch's useful fact is
 * where its stock is standing, an invoice's is who it was raised on, and a
 * single generic row would tell you neither.
 */
export function CompanyResultGroup({
  company,
  onOpenDocument,
  onNavigate,
}: CompanyResultGroupProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{company.company_name}</h3>
        {company.total > 0 && (
          <Badge variant="secondary" className="text-xs">
            {company.total}
          </Badge>
        )}
      </div>

      {company.error && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          {/* Said plainly, because "no results" and "we could not look" are
              different answers and only one of them means the number is wrong. */}
          <span>{company.error} Its app records are still listed below.</span>
        </div>
      )}

      <div className="divide-y rounded-md border">
        {company.documents.map((hit) => (
          <DocumentRow
            key={`${hit.kind}-${hit.doc_entry}`}
            hit={hit}
            onClick={() => onOpenDocument(hit)}
          />
        ))}
        {company.app_records.map((hit) => (
          <AppRecordRow
            key={`${hit.kind}-${hit.id}`}
            hit={hit}
            onClick={() => onNavigate(hit.route)}
          />
        ))}
        {company.items.map((item) => (
          <ItemRow key={item.item_code} item={item} />
        ))}
        {company.batches.map((batch) => (
          <BatchRow
            key={`${batch.item_code}-${batch.batch_num}-${batch.warehouse}`}
            batch={batch}
          />
        ))}
      </div>
    </section>
  );
}

function Row({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const className =
    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm first:rounded-t-md last:rounded-b-md';
  if (!onClick) {
    return <div className={className}>{children}</div>;
  }
  return (
    <button type="button" onClick={onClick} className={cn(className, 'hover:bg-muted/60')}>
      {children}
    </button>
  );
}

function DocumentRow({ hit, onClick }: { hit: SapDocumentHit; onClick: () => void }) {
  return (
    <Row onClick={onClick}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{hit.label}</span>
          <span className="tabular-nums text-muted-foreground">{hit.doc_num}</span>
          {hit.is_cancelled && (
            <Badge variant="destructive" className="text-[10px]">
              Cancelled
            </Badge>
          )}
          {hit.status && !hit.is_cancelled && (
            <Badge variant="outline" className="text-[10px]">
              {hit.status}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[
            hit.card_name || hit.card_code,
            hit.doc_date ? formatDate(hit.doc_date) : '',
            hit.ref_no ? `Ref ${hit.ref_no}` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {hit.doc_total !== null && (
        <span className="shrink-0 tabular-nums text-sm">
          {formatNumber(hit.doc_total)}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Row>
  );
}

function AppRecordRow({ hit, onClick }: { hit: AppRecordHit; onClick: () => void }) {
  return (
    <Row onClick={onClick}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{hit.entry_no}</span>
          <Badge variant="secondary" className="text-[10px]">
            {hit.label}
          </Badge>
          {hit.status && (
            <Badge variant="outline" className="text-[10px]">
              {hit.status}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[hit.summary, hit.matched_on ? `matched on ${hit.matched_on}` : '']
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Row>
  );
}

function ItemRow({ item }: { item: ItemHit }) {
  return (
    <Row>
      <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.item_code}</span>
          {item.variety && (
            <Badge variant="outline" className="text-[10px]">
              {item.variety}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[item.item_name, item.item_group].filter(Boolean).join(' · ')}
        </p>
      </div>
      {item.on_hand !== null && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatNumber(item.on_hand, 0)} {item.uom || 'on hand'}
        </span>
      )}
    </Row>
  );
}

function BatchRow({ batch }: { batch: BatchHit }) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Batch {batch.batch_num}</span>
          <Badge variant="secondary" className="text-[10px]">
            {batch.warehouse}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[
            batch.item_code,
            batch.item_name,
            batch.expiry_date ? `expires ${formatDate(batch.expiry_date)}` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {batch.quantity !== null && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatNumber(batch.quantity, 0)}
        </span>
      )}
    </Row>
  );
}
