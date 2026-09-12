import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Hammer,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  type DismantleDetail,
  type DismantlePreview,
  useDeleteDismantle,
  useDismantle,
  useDismantlePreview,
  usePostDismantle,
  useRebuildDismantleComponents,
  useSaveDismantleComponents,
  useUpdateDismantleHeader,
} from '../api';
import {
  DISMANTLE_STATUS_BADGE_CLASS,
  DISMANTLE_STATUS_LABELS,
  formatDateTime,
  formatQty,
} from '../utils';

/** Local edits to one component row, before they are saved. */
type ComponentEdit = { quantity: string; recovered: boolean };

export default function DismantleDetailPage() {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId);

  const { data: detail, isLoading } = useDismantle(id);
  const saveComponents = useSaveDismantleComponents();
  const rebuild = useRebuildDismantleComponents();
  const updateHeader = useUpdateDismantleHeader();
  const preview = useDismantlePreview();
  const postDismantle = usePostDismantle();
  const deleteDismantle = useDeleteDismantle();

  const [edits, setEdits] = useState<Record<number, ComponentEdit>>({});
  const [quantity, setQuantity] = useState('');
  const [checks, setChecks] = useState<DismantlePreview | null>(null);
  const [syncedFrom, setSyncedFrom] = useState<string | null>(null);

  // A fingerprint of the SERVER's copy. It changes when a save comes back, and
  // not while the operator is typing — so the form re-seeds from a fresh record
  // without ever overwriting edits that have not been saved yet.
  const serverStamp = detail
    ? [
        detail.id,
        detail.quantity,
        ...detail.components.map((c) => `${c.id}:${c.quantity}:${c.recovered}`),
      ].join('|')
    : null;

  // Adjusted during render rather than in an effect: seeding local state from
  // props in an effect renders once with the stale value first, and React's own
  // guidance is to do it here.
  if (detail && serverStamp !== syncedFrom) {
    setSyncedFrom(serverStamp);
    setQuantity(String(Number(detail.quantity)));
    setEdits(
      Object.fromEntries(
        detail.components.map((component) => [
          component.id,
          { quantity: String(Number(component.quantity)), recovered: component.recovered },
        ]),
      ),
    );
  }

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  // Captured once so the async handlers below keep the narrowing the guard above
  // established — TypeScript drops it across an await.
  const entry = detail;
  const editable = detail.status === 'DRAFT' || detail.status === 'PARTIALLY_POSTED';
  // Once the order is in SAP its lines are fixed, so the recipe can no longer be
  // changed here — only what is still unposted can move.
  const componentsLocked = detail.sap_order_doc_entry !== null;

  async function handleSaveComponents() {
    try {
      await saveComponents.mutateAsync({
        id,
        components: Object.entries(edits).map(([componentId, edit]) => ({
          id: Number(componentId),
          quantity: edit.quantity,
          recovered: edit.recovered,
        })),
      });
      setChecks(null);
      toast.success('Components saved');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the components.'));
    }
  }

  async function handleSaveQuantity() {
    try {
      await updateHeader.mutateAsync({ id, quantity });
      setChecks(null);
      toast.success('Quantity updated, and the recipe re-scaled');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change the quantity.'));
    }
  }

  async function handleCheck() {
    try {
      setChecks(await preview.mutateAsync(id));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not run the checks.'));
    }
  }

  async function handlePost() {
    const confirmed = await confirmDialog({
      title: `Post ${entry.entry_no} to SAP?`,
      description:
        'This writes three documents — the disassembly order, the receipt that brings the components back and the issue that consumes the finished good. None of them can be undone from this app.',
      confirmLabel: 'Post to SAP',
    });
    if (!confirmed) return;

    try {
      const result = await postDismantle.mutateAsync(id);
      if (result.posting_error) {
        // SAP took some of the three. Say which, and that posting again finishes
        // it rather than starting over.
        toast.error(
          `SAP stopped part-way: ${result.posting_error} — post again to finish what is left.`,
        );
      } else {
        toast.success(`${result.entry_no} posted to SAP`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'SAP refused the disassembly.'));
    }
  }

  async function handleDelete() {
    const confirmed = await confirmDialog({
      title: `Delete ${entry.entry_no}?`,
      description:
        'Nothing has been written to SAP, so this only drops the draft. Any quantity it had claimed off a returned line becomes available again.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteDismantle.mutateAsync(id);
      toast.success(`${entry.entry_no} deleted`);
      navigate('/returns/disassembly');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the disassembly.'));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/returns/disassembly')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{detail.entry_no}</h2>
              <Badge className={cn('border-0', DISMANTLE_STATUS_BADGE_CLASS[detail.status])}>
                {DISMANTLE_STATUS_LABELS[detail.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {detail.item_code} — {detail.item_name}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && !componentsLocked && (
            <Button variant="outline" onClick={handleDelete} disabled={deleteDismantle.isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          {editable && (
            <>
              <Button variant="outline" onClick={handleCheck} disabled={preview.isPending}>
                {preview.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Check
              </Button>
              <Button onClick={handlePost} disabled={postDismantle.isPending}>
                {postDismantle.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Hammer className="mr-2 h-4 w-4" />
                )}
                {detail.status === 'PARTIALLY_POSTED' ? 'Finish posting' : 'Post to SAP'}
              </Button>
            </>
          )}
        </div>
      </div>

      {detail.bom_inflated && (
        <Warning tone="amber">
          SAP’s recipe for {detail.item_code} is written for a batch of{' '}
          {formatQty(detail.bom_batch_size)} while a box holds {formatQty(detail.pieces_per_box)}.
          Every component quantity below is out by that ratio — SAP’s own disassembly screen
          would be wrong in the same way. Check the figures before posting, and ask the SAP team
          to correct the BOM’s batch size.
        </Warning>
      )}

      {detail.sap_post_error && <Warning tone="rose">{detail.sap_post_error}</Warning>}

      {checks && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">
              {checks.can_post ? 'Ready to post.' : 'Not ready to post.'}
              {checks.available_quantity !== null && (
                <span className="ml-2 font-normal text-muted-foreground">
                  SAP holds {formatQty(checks.available_quantity)} of this batch.
                </span>
              )}
            </p>
            {checks.errors.map((message) => (
              <p key={message} className="text-sm text-rose-700">
                {message}
              </p>
            ))}
            {checks.warnings.map((message) => (
              <p key={message} className="text-sm text-amber-700">
                {message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Warehouse" value={detail.warehouse_code} />
          <Field label="Batch consumed" value={detail.batch_number || '—'} />
          <Field label="Source">
            {detail.goods_return_entry_no ? (
              <button
                type="button"
                className="text-left text-sm text-primary underline-offset-2 hover:underline"
                onClick={() => navigate(`/returns/customer/${detail.goods_return}`)}
              >
                {detail.goods_return_entry_no}
                {detail.customer_name ? ` — ${detail.customer_name}` : ''}
              </button>
            ) : (
              <span className="text-sm">Warehouse stock</span>
            )}
          </Field>
          <Field label="Pieces">
            {editable && !componentsLocked ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="h-9"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveQuantity}
                  disabled={updateHeader.isPending || Number(quantity) === Number(detail.quantity)}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <span className="text-sm">{formatQty(detail.quantity)}</span>
            )}
          </Field>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">What comes back</h3>
            <p className="text-sm text-muted-foreground">
              SAP’s recipe, per piece, times {formatQty(detail.quantity)}. Un-tick anything that
              did not survive the disassembly and correct the quantities that came back short.
            </p>
          </div>
          {editable && !componentsLocked && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await rebuild.mutateAsync(id);
                    toast.success('Recipe re-read from SAP');
                  } catch (err) {
                    toast.error(getErrorMessage(err, 'Could not re-read the recipe.'));
                  }
                }}
                disabled={rebuild.isPending}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', rebuild.isPending && 'animate-spin')} />
                Re-read recipe
              </Button>
              <Button size="sm" onClick={handleSaveComponents} disabled={saveComponents.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-16">Back?</th>
                  <th className="px-4 py-3">Component</th>
                  <th className="px-4 py-3 text-right">Per piece</th>
                  <th className="px-4 py-3 text-right w-40">Quantity</th>
                  <th className="px-4 py-3">Into</th>
                  <th className="px-4 py-3">Batch</th>
                </tr>
              </thead>
              <tbody>
                {detail.components.map((component) => {
                  const edit = edits[component.id];
                  const off = edit && Number(edit.quantity) !== Number(component.quantity);
                  return (
                    <tr
                      key={component.id}
                      className={cn(
                        'border-b last:border-0',
                        edit && !edit.recovered && 'opacity-50',
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={edit?.recovered ?? component.recovered}
                          disabled={!editable || componentsLocked}
                          onCheckedChange={(value) =>
                            setEdits((previous) => ({
                              ...previous,
                              [component.id]: {
                                quantity: previous[component.id]?.quantity ?? '0',
                                recovered: value === true,
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{component.item_code}</div>
                        <div className="text-xs text-muted-foreground">{component.item_name}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatQty(component.qty_per_piece)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editable && !componentsLocked ? (
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            className={cn('h-9 text-right', off && 'border-amber-500')}
                            value={edit?.quantity ?? ''}
                            onChange={(event) =>
                              setEdits((previous) => ({
                                ...previous,
                                [component.id]: {
                                  quantity: event.target.value,
                                  recovered: previous[component.id]?.recovered ?? true,
                                },
                              }))
                            }
                          />
                        ) : (
                          <span className="tabular-nums">{formatQty(component.quantity)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{component.warehouse_code}</td>
                      <td className="px-4 py-3 text-xs">
                        {component.is_batch_managed ? component.batch_number : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          {detail.uom === 'PCS' ? 'Quantities are per piece, not per box. ' : ''}
          Components go back into {detail.warehouse_code} rather than the production store, so
          nothing re-enters production until somebody moves it there.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">SAP documents</h3>
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
            <DocumentField
              label="1. Disassembly order"
              docNum={detail.sap_order_doc_num}
              hint={detail.order_closed ? 'Closed' : detail.sap_order_doc_num ? 'Open' : ''}
            />
            <DocumentField
              label="2. Receipt from production"
              docNum={detail.sap_receipt_doc_num}
              hint="Components back in"
            />
            <DocumentField
              label="3. Issue for production"
              docNum={detail.sap_issue_doc_num}
              hint="Finished good consumed"
            />
          </CardContent>
        </Card>
        {detail.posted_at && (
          <p className="text-xs text-muted-foreground">
            Posted {formatDateTime(detail.posted_at)}.
          </p>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children ?? <p className="text-sm">{value}</p>}
    </div>
  );
}

function DocumentField({
  label,
  docNum,
  hint,
}: {
  label: string;
  docNum: string;
  hint?: string;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <p className={cn('text-sm tabular-nums', !docNum && 'text-muted-foreground')}>
        {docNum || 'Not posted'}
      </p>
      {docNum && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Warning({ tone, children }: { tone: 'amber' | 'rose'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-md border p-3 text-sm',
        tone === 'amber'
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-rose-300 bg-rose-50 text-rose-900',
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export type { DismantleDetail };
