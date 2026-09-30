/**
 * New BOM change request — a new BOM, or a change to one SAP already holds.
 *
 * Ported from SAP Portal's BOM page ("+ Create BOM" / "Update BOM"). A change
 * starts from the tree as SAP holds it (`?kind=UPDATE&tree=<code>`, or picked
 * here) and replaces it whole, so a line removed here disappears from SAP.
 *
 * Two ways to send it, each offered only with the right its endpoint checks:
 * "Submit for approval" (`can_request_bom_changes`) queues it for level 1;
 * "Write to SAP now" (`can_push_bom_directly`, the portal admin's direct push)
 * asks through `confirmSapPost` first, because it writes SAP at once.
 */
import { GitBranch, Send, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { BOM_CHANGES_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { confirmSapPost, SearchableSelect } from '@/shared/components';
import { EmptyPanel, PageHeader, PageSection } from '@/shared/components/page';
import { Button, Input, Label, NativeSelect, SelectOption, Textarea } from '@/shared/components/ui';

import {
  type BomKind,
  type BomType,
  type SapBomSummary,
  useCreateChangeRequest,
  useDirectPush,
  useSapBom,
  useSapBoms,
} from '../api';
import { ComponentsEditor } from '../components/ComponentsEditor';
import { SapCodePicker } from '../components/SapCodePicker';
import { WarehouseSelect } from '../components/WarehouseSelect';
import {
  blankDraft,
  BOM_TYPES,
  draftError,
  draftFromSapBom,
  draftTotalCost,
  filledLines,
  type RequestDraft,
  toPayload,
} from '../utils/requestDraft';

export default function RequestFormPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { hasPermission } = usePermission();
  const canRequest = hasPermission(BOM_CHANGES_PERMISSIONS.REQUEST);
  const canPushDirectly = hasPermission(BOM_CHANGES_PERMISSIONS.PUSH_DIRECTLY);

  const initialKind: BomKind = params.get('kind') === 'UPDATE' ? 'UPDATE' : 'CREATE';
  const treeCode = initialKind === 'UPDATE' ? params.get('tree') : null;
  const [draft, setDraft] = useState<RequestDraft>(() => blankDraft(initialKind));
  const [loadedTree, setLoadedTree] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const tree = useSapBom(treeCode);
  const create = useCreateChangeRequest();
  const direct = useDirectPush();
  const sending = create.isPending || direct.isPending;

  // A change starts from the tree SAP holds: load it once per chosen tree.
  useEffect(() => {
    if (tree.data && tree.data.tree_code !== loadedTree) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Pre-filling the form from SAP's answer.
      setDraft(draftFromSapBom(tree.data));
      setLoadedTree(tree.data.tree_code);
    }
  }, [tree.data, loadedTree]);

  const setKind = (kind: BomKind) => {
    const next = new URLSearchParams(params);
    next.set('kind', kind);
    next.delete('tree');
    setParams(next, { replace: true });
    setDraft(blankDraft(kind));
    setLoadedTree(null);
  };
  const chooseTree = (code: string) => {
    const next = new URLSearchParams(params);
    next.set('kind', 'UPDATE');
    next.set('tree', code);
    setParams(next, { replace: true });
  };
  const set = (patch: Partial<RequestDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const error = draftError(draft);
  const isChange = draft.kind === 'UPDATE';
  const waitingForTree = isChange && (!treeCode || tree.isLoading || !loadedTree);

  const submit = async () => {
    if (error) return;
    try {
      const result = await create.mutateAsync(toPayload(draft, remarks));
      toast.success(`Request #${result.id} sent for level 1 approval`);
      navigate(`/bom-changes/requests/${result.id}`);
    } catch {
      // The API client has already shown why (a 409 names the BOM SAP already has).
    }
  };

  const pushNow = async () => {
    if (error) return;
    const lines = filledLines(draft);
    const ok = await confirmSapPost({
      title: isChange
        ? `Replace the BOM for ${draft.item_code} in SAP now?`
        : `Create the BOM for ${draft.item_code} in SAP now?`,
      description: isChange
        ? 'This skips the approval levels. SAP keeps exactly the lines below — any line left out is removed from the BOM in SAP.'
        : 'This skips the approval levels and creates the BOM in SAP straight away.',
      details: [
        { label: 'Item', value: `${draft.item_code} — ${draft.item_name || '(name from SAP)'}` },
        { label: 'Type / quantity', value: `${draft.bom_type}, makes ${draft.quantity}` },
        !!draft.warehouse && { label: 'Warehouse', value: draft.warehouse },
        {
          label: 'Lines',
          value: `${lines.filter((l) => l.item_type === 'item').length} items, ${lines.filter((l) => l.item_type === 'resource').length} resources`,
        },
        !isChange && { label: 'Total cost', value: `INR ${draftTotalCost(draft).toFixed(2)}` },
      ],
      confirmLabel: isChange ? 'Replace in SAP' : 'Create in SAP',
    });
    if (!ok) return;
    try {
      const result = await direct.mutateAsync(toPayload(draft, remarks));
      toast.success(`BOM ${result.item_code} ${isChange ? 'updated' : 'created'} in SAP`);
      navigate(`/bom-changes/requests/${result.id}`);
    } catch {
      // SAP's own words are already on screen; nothing was saved here.
    }
  };

  if (!canRequest && !canPushDirectly) {
    return <EmptyPanel message="You cannot raise BOM change requests." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isChange ? 'Change a BOM' : 'New BOM'}
        icon={GitBranch}
        accent="indigo"
        backTo="/bom-changes/requests"
        backLabel="Change requests"
      />

      <div
        className="inline-flex rounded-lg bg-muted p-1"
        role="tablist"
        aria-label="Kind of request"
      >
        {(['CREATE', 'UPDATE'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={draft.kind === kind}
            onClick={() => draft.kind !== kind && setKind(kind)}
            className={
              draft.kind === kind
                ? 'rounded-md bg-background px-3 py-1 text-sm font-medium shadow'
                : 'rounded-md px-3 py-1 text-sm font-medium text-muted-foreground'
            }
          >
            {kind === 'CREATE' ? 'New BOM' : 'Change an existing BOM'}
          </button>
        ))}
      </div>

      <PageSection
        title="The BOM"
        description={isChange ? 'Pick the BOM; the form starts from what SAP holds' : undefined}
      >
        <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 lg:grid-cols-3">
          <div className="md:col-span-2 lg:col-span-1">
            {isChange ? (
              <TreePicker value={treeCode ?? ''} onSelect={chooseTree} />
            ) : (
              <SapCodePicker
                kind="item"
                inputId="bom-parent-item"
                label="Item the BOM makes"
                required
                value={draft.item_code}
                onSelect={(picked) => set({ item_code: picked.code, item_name: picked.name })}
                onClear={() => set({ item_code: '', item_name: '' })}
              />
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bom-description">Description</Label>
            <Input
              id="bom-description"
              value={draft.item_name}
              maxLength={200}
              onChange={(event) => set({ item_name: event.target.value })}
              placeholder={isChange ? 'As SAP has it' : 'The item name, from SAP'}
            />
            {draft.item_name.length > 100 && (
              <p className="text-xs text-muted-foreground">
                SAP keeps the first 100 characters as the BOM description.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bom-quantity">Quantity it makes</Label>
            <Input
              id="bom-quantity"
              inputMode="decimal"
              value={draft.quantity}
              onChange={(event) => set({ quantity: event.target.value })}
              className="text-right tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bom-type">BOM type</Label>
            <NativeSelect
              id="bom-type"
              value={draft.bom_type}
              onChange={(event) => set({ bom_type: event.target.value as BomType })}
            >
              {BOM_TYPES.map((type) => (
                <SelectOption key={type} value={type}>
                  {type}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bom-warehouse">Warehouse</Label>
            <WarehouseSelect
              id="bom-warehouse"
              value={draft.warehouse}
              onChange={(code) => set({ warehouse: code })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bom-distribution-rule">Distribution rule</Label>
            <Input
              id="bom-distribution-rule"
              value={draft.distribution_rule}
              maxLength={50}
              onChange={(event) => set({ distribution_rule: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bom-project">Project</Label>
            <Input
              id="bom-project"
              value={draft.project}
              maxLength={50}
              onChange={(event) => set({ project: event.target.value })}
            />
          </div>
        </div>
      </PageSection>

      {waitingForTree ? (
        <EmptyPanel
          message={
            treeCode
              ? tree.isError
                ? 'SAP could not return this BOM'
                : 'Reading the BOM from SAP…'
              : 'Pick the BOM to change'
          }
          loading={!!treeCode && tree.isLoading}
        />
      ) : (
        <PageSection
          title="Components"
          description={
            isChange
              ? 'The whole tree as it should be after the change. Line prices and comments are not sent on a change, as in SAP Portal.'
              : 'Items and resources, in the order SAP will list them. A line without a warehouse uses the BOM’s.'
          }
        >
          {draft.droppedTextLines > 0 && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
              The BOM in SAP has {draft.droppedTextLines} text line
              {draft.droppedTextLines === 1 ? '' : 's'}. A change replaces the whole BOM, so they
              will not be kept.
            </p>
          )}
          <ComponentsEditor
            kind={draft.kind}
            lines={draft.lines}
            onChange={(lines) => set({ lines })}
          />
        </PageSection>
      )}

      <PageSection title="Note for the approvers" description="Optional">
        <Textarea
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          rows={2}
          placeholder="Why the BOM is needed or changing"
          aria-label="Note for the approvers"
        />
      </PageSection>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {error && !waitingForTree && <p className="mr-auto text-sm text-destructive">{error}</p>}
        <Button
          variant="outline"
          onClick={() => navigate('/bom-changes/requests')}
          disabled={sending}
        >
          Cancel
        </Button>
        {canPushDirectly && (
          <Button
            variant={canRequest ? 'outline' : 'default'}
            onClick={pushNow}
            disabled={!!error || sending || waitingForTree}
          >
            <Upload className="mr-2 h-4 w-4" />
            {direct.isPending ? 'Writing to SAP…' : 'Write to SAP now'}
          </Button>
        )}
        {canRequest && (
          <Button onClick={submit} disabled={!!error || sending || waitingForTree}>
            <Send className="mr-2 h-4 w-4" />
            {create.isPending ? 'Sending…' : 'Submit for approval'}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Search the trees SAP holds, for a change. */
function TreePicker({ value, onSelect }: { value: string; onSelect: (code: string) => void }) {
  const [search, setSearch] = useState('');
  const trees = useSapBoms(search);
  return (
    <SearchableSelect<SapBomSummary>
      inputId="bom-tree"
      label="BOM to change"
      required
      value={value}
      defaultDisplayText={value}
      items={trees.data ?? []}
      isLoading={trees.isLoading}
      isError={trees.isError}
      placeholder="Search SAP BOMs by code or name"
      loadingText="Searching SAP…"
      emptyText="No BOMs in SAP"
      notFoundText="No BOM matches."
      errorText="SAP BOM search is unavailable."
      getItemKey={(row) => row.tree_code}
      getItemLabel={(row) => row.tree_code}
      filterFn={() => true}
      renderItem={(row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.tree_code}</span>
          <span className="text-xs text-muted-foreground">
            {row.description} · {row.item_count} items, {row.resource_count} resources
          </span>
        </div>
      )}
      onSearchChange={(next) => setSearch(next.trim())}
      onItemSelect={(row) => onSelect(row.tree_code)}
      onClear={() => undefined}
    />
  );
}
