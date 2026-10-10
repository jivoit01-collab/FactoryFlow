/**
 * Step 1, Plan — what was made: the product, boxes and loose pieces, the date.
 *
 * Posting creates the SAP production order, planned. Its lines are the
 * product's BOM, sent with it but not asked for here (SAP refuses a standard
 * order that differs from its BOM); the Issue page shows them.
 */
import { Save, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { confirmSapPost, SearchableSelect } from '@/shared/components';
import { EmptyPanel, PageSection } from '@/shared/components/page';
import { Button, Input, Label, Textarea } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils';

import {
  type EntryDetail,
  type PlanInput,
  type ProductionOrdersMe,
  type ProductOption,
  useCreateEntry,
  usePlanPreview,
  useProductSearch,
  useSaveStep,
} from '../api';
import { ChangeState } from '../components/ChangeState';
import { StepShell } from '../components/StepShell';
import { StockCaps } from '../components/StockCaps';
import { useStepEntry } from '../hooks/useStepEntry';
import { boxesLabel, dateLabel, qty, todayIso } from '../utils/format';
import { afterSave, saveFailed } from '../utils/postStep';
import { stepPath } from '../utils/steps';

export default function PlanStepPage() {
  const { entryId, entry, me } = useStepEntry();
  if (entryId !== null && entry.isLoading)
    return <EmptyPanel loading message="Loading the entry…" />;
  if (entryId !== null && !entry.data)
    return <EmptyPanel message="This entry could not be loaded." />;
  return <PlanForm key={entry.data?.id ?? 'new'} entry={entry.data ?? null} me={me} />;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function PlanForm({
  entry,
  me,
}: {
  entry: EntryDetail | null;
  me: ProductionOrdersMe | undefined;
}) {
  const navigate = useNavigate();
  const create = useCreateEntry();
  const saveStep = useSaveStep(entry?.id ?? 0, 'PLAN');
  // Planned in SAP: still changeable, and a change goes straight to SAP.
  const inSap = !!entry && entry.status === 'PLANNED';
  const locked = !!entry && !inSap && (entry.status !== 'DRAFT' || !!entry.sap_order_entry);

  const [product, setProduct] = useState<ProductOption | null>(
    entry
      ? {
          item_code: entry.item_code,
          item_name: entry.item_name,
          uom: entry.uom,
          pieces_per_box: entry.pieces_per_box,
          variety: entry.variety,
          warehouse: entry.warehouse,
        }
      : null,
  );
  const [boxes, setBoxes] = useState(entry?.boxes ? String(entry.boxes) : '');
  const [loose, setLoose] = useState(entry?.loose_pieces ? String(entry.loose_pieces) : '');
  const [postingDate, setPostingDate] = useState(entry?.posting_date ?? todayIso());
  const [remarks, setRemarks] = useState(entry?.remarks ?? '');
  const [search, setSearch] = useState('');
  const products = useProductSearch(useDebounce(search, 300));
  // The picker shows a value only if it is among its items: keep the entry's
  // own product there, so a saved entry opens with it filled in.
  const productOptions = useMemo(() => {
    const found = products.data ?? [];
    return product && !found.some((option) => option.item_code === product.item_code)
      ? [product, ...found]
      : found;
  }, [products.data, product]);

  const input = useMemo<PlanInput | null>(() => {
    const b = Number(boxes || 0);
    const l = Number(loose || 0);
    if (!product || b + l === 0) return null;
    return {
      item_code: product.item_code,
      boxes: b,
      loose_pieces: l,
      posting_date: postingDate,
      remarks: remarks || undefined,
    };
  }, [product, boxes, loose, postingDate, remarks]);
  const debouncedInput = useDebounce(input, 400);
  const preview = usePlanPreview(locked ? null : debouncedInput);
  const built = preview.data;

  const canTake = !!me?.rights.PLAN;
  const busy = create.isPending || saveStep.isPending;

  const save = async (post: boolean) => {
    if (!input) return;
    if (post) {
      const productChanged = inSap && entry && input.item_code !== entry.item_code;
      const ok = await confirmSapPost({
        title: inSap
          ? `Change planned order ${entry?.sap_order_num} in SAP?`
          : 'Create the planned order in SAP?',
        description: productChanged ? "The order's lines become the new product's BOM." : undefined,
        details: [
          { label: 'Product', value: `${input.item_code} — ${built?.item_name ?? ''}` },
          {
            label: 'Quantity',
            value: `${boxesLabel(input.boxes, input.loose_pieces)} (${qty(built?.quantity)} pcs)`,
          },
          { label: 'Lines', value: `${built?.line_count ?? '—'}, from the BOM` },
          { label: 'Posting date', value: dateLabel(input.posting_date) },
        ],
        confirmLabel: inSap ? 'Update planned order' : 'Create planned order',
      });
      if (!ok) return;
    }
    try {
      const response = entry
        ? await saveStep.mutateAsync({ input, post })
        : await create.mutateAsync({ input, post });
      const next = afterSave(response, 'PLAN');
      navigate(next ?? `/production-orders/entries/${response.entry.id}/plan`, {
        replace: !entry,
      });
    } catch (error) {
      saveFailed(error, post);
    }
  };

  if (locked && entry) {
    return (
      <StepShell entry={entry} step="PLAN" sapLogin={me?.sap_login}>
        {entry.status === 'RELEASED' && (
          <p className="text-sm text-muted-foreground">
            The order is released. To change it, take it back to planned on the{' '}
            <Link className="font-medium text-primary underline" to={stepPath(entry.id, 'RELEASE')}>
              Release page
            </Link>{' '}
            first; that works only while nothing is issued to it.
          </p>
        )}
        <PageSection title="The planned order">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div className="sm:col-span-3">
              <dt className="text-xs text-muted-foreground">Product</dt>
              <dd className="font-medium">
                <span className="font-mono">{entry.item_code}</span> — {entry.item_name}
              </dd>
            </div>
            <Fact label="Made">
              {boxesLabel(entry.boxes, entry.loose_pieces)} ({qty(entry.quantity)} pcs)
            </Fact>
            <Fact label="Posting date">{dateLabel(entry.posting_date)}</Fact>
            <Fact label="Received into">{entry.warehouse}</Fact>
            <Fact label="SAP order">{entry.sap_order_num ?? '—'}</Fact>
            <Fact label="Lines">{entry.lines.length}, from the BOM</Fact>
            {entry.remarks && <Fact label="Remarks">{entry.remarks}</Fact>}
          </dl>
        </PageSection>
      </StepShell>
    );
  }

  return (
    <StepShell
      entry={entry}
      step="PLAN"
      sapLogin={me?.sap_login}
      footer={
        canTake && (
          <>
            {!inSap && (
              <Button
                variant="outline"
                onClick={() => save(false)}
                disabled={!input || busy || preview.isError}
              >
                <Save className="mr-2 h-4 w-4" />
                Save draft
              </Button>
            )}
            <Button
              onClick={() => save(true)}
              disabled={!input || !built || busy || preview.isError || !me?.sap_login.ready}
            >
              <Send className="mr-2 h-4 w-4" />
              {busy ? 'Saving…' : inSap ? 'Update planned order' : 'Create planned order'}
            </Button>
          </>
        )
      }
    >
      {inSap && entry && (
        <>
          <p className="text-sm text-muted-foreground">
            Order {entry.sap_order_num} is planned in SAP. Until it is released you can change its
            product, quantity, date or remarks here; the change goes straight to SAP.
          </p>
          <ChangeState posting={entry.changes.replan} />
        </>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <PageSection title="What was made">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="po-product">Product</Label>
              <SearchableSelect<ProductOption>
                inputId="po-product"
                value={product?.item_code ?? ''}
                items={productOptions}
                isLoading={products.isFetching}
                isError={products.isError}
                placeholder="Type an FG code or name…"
                minSearchLength={2}
                minSearchText="Type at least two characters"
                getItemKey={(option) => option.item_code}
                getItemLabel={(option) => `${option.item_code} — ${option.item_name}`}
                filterFn={() => true}
                loadingText="Searching SAP…"
                emptyText="Type to search"
                notFoundText="No finished good with a production BOM matches"
                onSearchChange={setSearch}
                onItemSelect={setProduct}
                onClear={() => setProduct(null)}
              />
              {product && (
                <p className="text-xs text-muted-foreground">
                  {Number(product.pieces_per_box)} pcs a box · received into {product.warehouse}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="po-boxes">Boxes</Label>
                <Input
                  id="po-boxes"
                  inputMode="numeric"
                  value={boxes}
                  onChange={(event) => setBoxes(event.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-loose">Loose pieces</Label>
                <Input
                  id="po-loose"
                  inputMode="numeric"
                  value={loose}
                  onChange={(event) => setLoose(event.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Loose pieces are only the ones that do not fill a box.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="po-posting">Posting date</Label>
              <Input
                id="po-posting"
                type="date"
                max={todayIso()}
                value={postingDate}
                onChange={(event) => setPostingDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-remarks">Remarks</Label>
              <Textarea
                id="po-remarks"
                rows={2}
                maxLength={200}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </div>
          </div>
        </PageSection>

        <div>
          {!input ? (
            <EmptyPanel message="Choose the product and how much was made to see the order." />
          ) : preview.isError ? (
            <EmptyPanel message={getErrorMessage(preview.error, 'SAP could not be read.')} />
          ) : !built ? (
            <EmptyPanel loading message="Reading the product and its BOM from SAP…" />
          ) : (
            <PageSection title="Into SAP">
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Fact label="Planned quantity">
                  {qty(built.quantity)} pcs
                  {built.litres && (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      · {qty(built.litres)} L
                    </span>
                  )}
                </Fact>
                <Fact label="Received into">{built.warehouse}</Fact>
                <Fact label="Lines">{built.line_count}, from its BOM</Fact>
                <Fact label="Series">
                  <span className="font-mono text-xs">{built.series || '—'}</span>
                </Fact>
              </dl>
              {built.warnings.length > 0 && (
                <ul className="mt-4 space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  {built.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <StockCaps caps={built.caps} />
              </div>
            </PageSection>
          )}
        </div>
      </div>
    </StepShell>
  );
}
