/** Masters — SKU→FG mappings, combos (JI sales-BOM), and channel→SAP warehouse links. */
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import {
  useCombos,
  useDeleteCombo,
  useDeleteSkuMapping,
  useDeleteWarehouse,
  useMpWarehouses,
  useSapWarehouses,
  useSkuMappings,
  useUpsertCombo,
  useUpsertSkuMapping,
  useUpsertWarehouse,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { MpFilterBar, MpFilterChips, MpResultCount, MpSearchInput } from '../components/MpFilters';
import { SapItemInput } from '../components/SapItemInput';
import type {
  ComboComponent,
  ComboComponentOption,
  ComboDefinition,
  ComboDefinitionUpsert,
  MarketplaceChannel,
  MarketplaceWarehouse,
  MarketplaceWarehouseUpsert,
  SkuMapping,
  SkuMappingOption,
  SkuMappingUpsert,
} from '../types/marketplace.types';

/** Find the SKU mapping a deep-link points at (by fsn, marketplace sku, or the
 *  SAP item code it ships as — including any alternative option). */
function findSkuForDeepLink(
  mappings: SkuMapping[],
  { item, fsn, sku }: { item: string; fsn: string; sku: string },
): SkuMapping | null {
  if (fsn) {
    const byFsn = mappings.find((m) => m.fsn && m.fsn === fsn);
    if (byFsn) return byFsn;
  }
  if (sku) {
    const bySku = mappings.find((m) => m.marketplace_sku === sku);
    if (bySku) return bySku;
  }
  if (item) {
    const byItem = mappings.find(
      (m) =>
        m.fg_item_code === item ||
        (m.options ?? []).some((o) => o.fg_item_code === item),
    );
    if (byItem) return byItem;
  }
  return null;
}

/** Find the combo whose components (or component alternatives) use a SAP item. */
function findComboForItem(combos: ComboDefinition[], item: string): ComboDefinition | null {
  if (!item) return null;
  return (
    combos.find((c) =>
      (c.components ?? []).some(
        (cc) => cc.item_code === item || (cc.options ?? []).some((o) => o.item_code === item),
      ),
    ) ?? null
  );
}

export default function MpMastersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepItem = searchParams.get('item') ?? '';
  const deepFsn = searchParams.get('fsn') ?? '';
  const deepSku = searchParams.get('sku') ?? '';
  const deepChannel = searchParams.get('channel') as MarketplaceChannel | null;
  const hasDeepLink = !!(deepItem || deepFsn || deepSku);

  const [channel, setChannel] = useState<MarketplaceChannel>(deepChannel ?? 'FLIPKART');
  const [tab, setTab] = useState<'skus' | 'combos' | 'warehouses'>('skus');

  // Data is also queried inside the tabs; react-query dedupes on the shared key.
  const { data: mappings } = useSkuMappings({ channel });
  const { data: combos } = useCombos(channel);

  // When another screen deep-links here ("add an alternative for this item"),
  // resolve the target to a SKU mapping or a combo and auto-open its editor.
  const [autoOpenSku, setAutoOpenSku] = useState<SkuMapping | 'create' | null>(null);
  const [autoOpenCombo, setAutoOpenCombo] = useState<ComboDefinition | null>(null);

  useEffect(() => {
    if (!hasDeepLink || !mappings || !combos) return;

    const sku = findSkuForDeepLink(mappings, { item: deepItem, fsn: deepFsn, sku: deepSku });
    if (sku) {
      setTab('skus');
      setAutoOpenSku(sku);
    } else {
      const combo = findComboForItem(combos, deepItem);
      if (combo) {
        setTab('combos');
        setAutoOpenCombo(combo);
      } else {
        // Unmapped item — open a fresh SKU editor prefilled with what we know.
        setTab('skus');
        setAutoOpenSku('create');
      }
    }

    // Consume the params so a refresh / re-render doesn't reopen the editor.
    const next = new URLSearchParams(searchParams);
    ['item', 'fsn', 'sku', 'channel'].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDeepLink, mappings, combos]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace Masters</h1>
          <p className="text-sm text-muted-foreground">
            SKU→FG mappings, combos, and channel→SAP warehouse links.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="skus">SKU Mappings</TabsTrigger>
          <TabsTrigger value="combos">Combos</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>
        <TabsContent value="skus">
          <SkuTab
            channel={channel}
            autoOpen={autoOpenSku}
            onAutoOpenHandled={() => setAutoOpenSku(null)}
            prefill={{ item: deepItem, fsn: deepFsn, sku: deepSku }}
          />
        </TabsContent>
        <TabsContent value="combos">
          <CombosTab
            channel={channel}
            autoOpen={autoOpenCombo}
            onAutoOpenHandled={() => setAutoOpenCombo(null)}
          />
        </TabsContent>
        <TabsContent value="warehouses">
          <WarehousesTab channel={channel} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── SKU Mappings ─────────────────────────────────────────────────────────────
const EMPTY_SKU = (channel: MarketplaceChannel): SkuMapping => ({
  id: 0,
  channel,
  marketplace_sku: '',
  fsn: '',
  sku_name: '',
  sku_type: 'RAW',
  fg_item_code: '',
  fg_item_name: '',
  combo: null,
  default_uom: '',
  is_active: true,
  // One SAP item row to start — the normal case is a single item.
  options: [{ label: '', sku_type: 'RAW', fg_item_code: '', fg_item_name: '', combo: null, is_default: true }],
});

/** Open a saved mapping in the editor: older rows have no `options` list, so seed
 *  one from the item they already point at. */
function toEditable(m: SkuMapping): SkuMapping {
  if (m.options && m.options.length) return m;
  return {
    ...m,
    options: [{
      label: '',
      sku_type: m.sku_type,
      fg_item_code: m.fg_item_code ?? '',
      fg_item_name: m.fg_item_name ?? '',
      combo: m.combo ?? null,
      is_default: true,
    }],
  };
}

function SkuTab({
  channel,
  autoOpen = null,
  onAutoOpenHandled,
  prefill,
}: {
  channel: MarketplaceChannel;
  autoOpen?: SkuMapping | 'create' | null;
  onAutoOpenHandled?: () => void;
  prefill?: { item: string; fsn: string; sku: string };
}) {
  const { data: mappings } = useSkuMappings({ channel });
  const { data: combos } = useCombos(channel);
  const upsert = useUpsertSkuMapping();
  const remove = useDeleteSkuMapping();
  const [editing, setEditing] = useState<SkuMapping | null>(null);
  const [toDelete, setToDelete] = useState<SkuMapping | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'ALL' | 'RAW' | 'COMBO'>('ALL');

  // Open a mapping's editor when a deep-link asks for it (see MpMastersPage).
  useEffect(() => {
    if (!autoOpen) return;
    if (autoOpen === 'create') {
      const seed = EMPTY_SKU(channel);
      setEditing({
        ...seed,
        fsn: prefill?.fsn || '',
        marketplace_sku: prefill?.sku || '',
        // Seed the first option with the short item so the user only has to add
        // the alternative alongside it.
        fg_item_code: prefill?.item || '',
        options: [
          { label: '', sku_type: 'RAW', fg_item_code: prefill?.item || '', fg_item_name: '', combo: null, is_default: true },
        ],
      });
    } else {
      setEditing(toEditable(autoOpen));
    }
    onAutoOpenHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'VARIANTS'>('ALL');

  function save() {
    if (!editing) return;
    if (!editing.marketplace_sku.trim()) {
      toast.error('Enter the marketplace SKU.');
      return;
    }
    const opts = editing.options ?? [];
    if (opts.length === 0) {
      toast.error('Add the SAP item this SKU ships as.');
      return;
    }
    for (const o of opts) {
      if (o.sku_type === 'RAW' && !o.fg_item_code?.trim()) {
        toast.error('Every SAP item row needs an item code.');
        return;
      }
      if (o.sku_type === 'COMBO' && !o.combo) {
        toast.error('Every combo row needs a combo selected.');
        return;
      }
    }
    // The base item mirrors the default variant (when variants are used), so
    // legacy displays and single-item resolution stay consistent.
    let base = {
      sku_type: editing.sku_type,
      fg_item_code: editing.fg_item_code ?? '',
      fg_item_name: editing.fg_item_name ?? '',
      combo: editing.combo ?? null,
    };
    if (opts.length) {
      const def = opts.find((o) => o.is_default) ?? opts[0];
      base = {
        sku_type: def.sku_type,
        fg_item_code: def.fg_item_code ?? '',
        fg_item_name: def.fg_item_name ?? '',
        combo: def.combo ?? null,
      };
    }
    const payload: SkuMappingUpsert = {
      channel: editing.channel,
      marketplace_sku: editing.marketplace_sku.trim(),
      fsn: editing.fsn?.trim() ?? '',
      sku_name: editing.sku_name,
      sku_type: base.sku_type,
      // Only send the branch that applies, so a RAW→COMBO switch can't leave a stale code.
      fg_item_code: base.sku_type === 'RAW' ? base.fg_item_code : '',
      fg_item_name: base.sku_type === 'RAW' ? base.fg_item_name : '',
      combo: base.sku_type === 'COMBO' ? base.combo : null,
      default_uom: editing.default_uom,
      is_active: editing.is_active,
      options: opts,
      ...(editing.id ? { id: editing.id } : {}),
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        toast.success('Mapping saved');
        setEditing(null);
      },
      onError: (e) => toast.error(errMsg(e, 'Could not save mapping')),
    });
  }

  function doDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Mapping deleted');
        setToDelete(null);
      },
      onError: (e) => toast.error(errMsg(e, 'Could not delete')),
    });
  }

  const all = mappings ?? [];
  const filtered = all.filter((m) => {
    if (type !== 'ALL' && m.sku_type !== type) return false;
    if (status === 'ACTIVE' && !m.is_active) return false;
    if (status === 'INACTIVE' && m.is_active) return false;
    if (status === 'VARIANTS' && !(m.options && m.options.length > 1)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      m.fsn, m.marketplace_sku, m.sku_name, m.fg_item_code, m.fg_item_name,
      m.combo_code, m.combo_name,
    ].some((f) => (f ?? '').toLowerCase().includes(q));
  });

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <MpFilterBar>
          <MpSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search FSN, SKU, item code or name…"
            className="w-full sm:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <MpFilterChips
              value={type}
              onChange={setType}
              options={[
                { value: 'ALL', label: 'All', count: all.length },
                { value: 'RAW', label: 'Raw', count: all.filter((m) => m.sku_type === 'RAW').length },
                { value: 'COMBO', label: 'Combo', count: all.filter((m) => m.sku_type === 'COMBO').length },
              ]}
            />
            <MpFilterChips
              value={status}
              onChange={setStatus}
              options={[
                { value: 'ALL', label: 'Any' },
                { value: 'ACTIVE', label: 'Active', count: all.filter((m) => m.is_active).length },
                { value: 'INACTIVE', label: 'Inactive', count: all.filter((m) => !m.is_active).length },
                { value: 'VARIANTS', label: 'Variants', count: all.filter((m) => (m.options?.length ?? 0) > 1).length },
              ]}
            />
            <Button size="sm" onClick={() => setEditing(EMPTY_SKU(channel))}>
              <Plus className="mr-2 h-4 w-4" /> Add mapping
            </Button>
          </div>
        </MpFilterBar>
        <MpResultCount shown={filtered.length} total={all.length} noun="mapping" />
        <MasterTable
          headers={['FSN', 'Marketplace SKU', 'Type', 'Ships as (SAP item)', 'Active', '']}
          rows={filtered.map((m) => {
            const isCombo = m.sku_type === 'COMBO';
            // Always show a readable SAP identifier — never a raw "#<id>".
            const code = isCombo ? m.combo_code || m.combo_name || 'Combo' : m.fg_item_code;
            const name = isCombo ? m.combo_name : m.fg_item_name;
            const extra = (m.options?.length ?? 0) - 1;
            return (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="py-2 px-2 font-mono text-xs">{m.fsn || '—'}</td>
                <td className="py-2 px-2">
                  <div className="font-mono text-xs">{m.marketplace_sku}</div>
                  {m.sku_name ? (
                    <div className="text-xs text-muted-foreground">{m.sku_name}</div>
                  ) : null}
                </td>
                <td className="py-2 px-2">
                  <Badge variant="outline">{m.sku_type}</Badge>
                </td>
                <td className="py-2 px-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{code || '—'}</span>
                    {extra > 0 ? (
                      <Badge variant="secondary">
                        +{extra} variant{extra > 1 ? 's' : ''}
                      </Badge>
                    ) : null}
                  </div>
                  {name ? <div className="text-xs text-muted-foreground">{name}</div> : null}
                </td>
                <td className="py-2 px-2">
                  {m.is_active ? (
                    <Badge className="bg-emerald-600">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </td>
                <RowActions onEdit={() => setEditing(toEditable(m))} onDelete={() => setToDelete(m)} />
              </tr>
            );
          })}
        />
      </CardContent>

      <ConfirmDelete
        open={!!toDelete}
        label={`SKU “${toDelete?.marketplace_sku ?? ''}”`}
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={doDelete}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit' : 'Add'} SKU mapping</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <Field label="FSN (primary mapping key)">
                <Input
                  value={editing.fsn ?? ''}
                  placeholder="Flipkart FSN — matched to the SAP item first"
                  onChange={(e) => setEditing({ ...editing, fsn: e.target.value })}
                />
              </Field>
              <Field label="Marketplace SKU (fallback)">
                <Input
                  value={editing.marketplace_sku}
                  onChange={(e) => setEditing({ ...editing, marketplace_sku: e.target.value })}
                />
              </Field>
              <Field label="SKU name">
                <Input
                  value={editing.sku_name ?? ''}
                  onChange={(e) => setEditing({ ...editing, sku_name: e.target.value })}
                />
              </Field>
              <SapItemsEditor editing={editing} setEditing={setEditing} combos={combos ?? []} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/**
 * The SAP item(s) this SKU ships as. One item is the normal case; add more only
 * when the same product can be fulfilled by different items depending on stock —
 * then the operator picks which one at delivery-note time.
 */
function SapItemsEditor({
  editing,
  setEditing,
  combos,
}: {
  editing: SkuMapping;
  setEditing: (m: SkuMapping) => void;
  combos: ComboDefinition[];
}) {
  const items = editing.options ?? [];
  const set = (next: SkuMappingOption[]) => setEditing({ ...editing, options: next });
  const many = items.length > 1;

  function add() {
    set([...items, {
      label: '', sku_type: 'RAW', fg_item_code: '', fg_item_name: '',
      combo: null, is_default: items.length === 0,
    }]);
  }
  function setItem(i: number, patch: Partial<SkuMappingOption>) {
    set(items.map((o, idx) =>
      idx === i ? { ...o, ...patch } : patch.is_default ? { ...o, is_default: false } : o));
  }
  function removeItem(i: number) {
    const next = items.filter((_, idx) => idx !== i);
    if (next.length && !next.some((o) => o.is_default)) next[0].is_default = true;
    set(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">SAP item{many ? 's' : ''}</div>
          <div className="text-xs text-muted-foreground">
            {many
              ? 'Several items linked — the operator picks which one ships per order.'
              : 'What this SKU ships as. Add another only if it can ship as a different item.'}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground hover:bg-muted/40"
        >
          + Add the SAP item this SKU ships as
        </button>
      ) : (
        items.map((o, i) => (
          <div key={i} className="space-y-2 rounded-lg border bg-muted/30 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect
                className="w-32"
                value={o.sku_type}
                onChange={(e) => setItem(i, {
                  sku_type: e.target.value as 'RAW' | 'COMBO',
                  fg_item_code: '', fg_item_name: '', combo: null,
                })}
              >
                <SelectOption value="RAW">SAP item</SelectOption>
                <SelectOption value="COMBO">Combo / Kit</SelectOption>
              </NativeSelect>
              <div className="min-w-[12rem] flex-1">
                {o.sku_type === 'RAW' ? (
                  <SapItemInput
                    value={o.fg_item_code ?? ''}
                    onChange={(code, name) =>
                      setItem(i, { fg_item_code: code, fg_item_name: name ?? o.fg_item_name })}
                  />
                ) : (
                  <NativeSelect
                    value={o.combo ?? ''}
                    onChange={(e) =>
                      setItem(i, { combo: e.target.value ? Number(e.target.value) : null })}
                  >
                    <SelectOption value="">— select combo —</SelectOption>
                    {combos.map((c) => (
                      <SelectOption key={c.id} value={c.id}>{c.code} — {c.name}</SelectOption>
                    ))}
                  </NativeSelect>
                )}
              </div>
              {/* A default only matters once there is a choice to make. */}
              {many ? (
                <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                  <input
                    type="radio"
                    name={`sku-default-${editing.id ?? 'new'}`}
                    checked={!!o.is_default}
                    onChange={() => setItem(i, { is_default: true })}
                  />
                  default
                </label>
              ) : null}
              {items.length > 1 ? (
                <Button size="icon" variant="ghost" onClick={() => removeItem(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : null}
            </div>
            {many ? (
              <Input
                placeholder="Label shown to the operator (optional, e.g. SANO)"
                value={o.label ?? ''}
                onChange={(e) => setItem(i, { label: e.target.value })}
              />
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}


// ── Combos ───────────────────────────────────────────────────────────────────
const EMPTY_COMBO = (channel: MarketplaceChannel): ComboDefinition => ({
  id: 0,
  channel,
  code: '',
  name: '',
  fsn: '',
  marketplace_sku: '',
  sku_name: '',
  is_active: true,
  components: [],
});

// Common units — free-text is still allowed via the current value.
const UOM_OPTIONS = ['PCS', 'BOX', 'CTN', 'PKT', 'LTR', 'ML', 'KG', 'GM', 'SET'];

/**
 * Alternatives for ONE combo slot — the interchangeable SAP items that can fill it
 * depending on stock. Empty means the slot always ships its own item code.
 */
function ComponentAlternatives({
  component,
  onChange,
}: {
  component: ComboComponent;
  onChange: (patch: Partial<ComboComponent>) => void;
}) {
  const options = component.options ?? [];
  const set = (next: ComboComponentOption[]) => onChange({ options: next });

  function add() {
    const first = options.length === 0;
    // Seed the first alternative from the component's own item.
    set([
      ...options,
      first
        ? { item_code: component.item_code, item_name: component.item_name ?? '', is_default: true }
        : { item_code: '', item_name: '', is_default: false },
    ]);
  }
  function setOpt(i: number, patch: Partial<ComboComponentOption>) {
    set(options.map((o, idx) => (idx === i ? { ...o, ...patch } : patch.is_default ? { ...o, is_default: false } : o)));
  }
  function removeOpt(i: number) {
    const next = options.filter((_, idx) => idx !== i);
    if (next.length && !next.some((o) => o.is_default)) next[0].is_default = true;
    set(next);
  }

  return (
    <div className="space-y-1.5 pl-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {options.length === 0
            ? 'Always ships the item above'
            : `${options.length} interchangeable item${options.length > 1 ? 's' : ''} — user picks at delivery note`}
        </span>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={add}>
          <Plus className="mr-1 h-3 w-3" /> Alternative
        </Button>
      </div>
      {options.map((o, i) => (
        <div key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_32px]">
          <SapItemInput
            placeholder="Alternative SAP item"
            value={o.item_code}
            onChange={(code, name) => setOpt(i, { item_code: code, item_name: name ?? o.item_name })}
          />
          <label className="flex items-center gap-1 whitespace-nowrap text-xs">
            <input
              type="radio"
              name={`comp-default-${component.id ?? component.item_code}`}
              checked={!!o.is_default}
              onChange={() => setOpt(i, { is_default: true })}
            />
            default
          </label>
          <Button size="icon" variant="ghost" onClick={() => removeOpt(i)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function CombosTab({
  channel,
  autoOpen = null,
  onAutoOpenHandled,
}: {
  channel: MarketplaceChannel;
  autoOpen?: ComboDefinition | null;
  onAutoOpenHandled?: () => void;
}) {
  const { data: combos } = useCombos(channel);
  const upsert = useUpsertCombo();
  const remove = useDeleteCombo();
  const [editing, setEditing] = useState<ComboDefinition | null>(null);
  const [toDelete, setToDelete] = useState<ComboDefinition | null>(null);

  // Open a combo's editor when a deep-link asks for it (see MpMastersPage).
  useEffect(() => {
    if (!autoOpen) return;
    setEditing(autoOpen);
    onAutoOpenHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  function doDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Combo deleted');
        setToDelete(null);
      },
      onError: (e) =>
        toast.error(errMsg(e, 'Could not delete — it may be used by a SKU mapping')),
    });
  }

  function setComponent(idx: number, patch: Partial<ComboComponent>) {
    if (!editing) return;
    const components = editing.components.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    setEditing({ ...editing, components });
  }
  function addComponent() {
    if (!editing) return;
    setEditing({
      ...editing,
      components: [...editing.components, { component_type: 'FG', item_code: '', quantity: '1', uom: '' }],
    });
  }
  function removeComponent(idx: number) {
    if (!editing) return;
    setEditing({ ...editing, components: editing.components.filter((_, i) => i !== idx) });
  }
  function save() {
    if (!editing) return;
    if (!editing.code.trim()) {
      toast.error('Enter a combo code.');
      return;
    }
    if (!editing.name.trim()) {
      toast.error('Enter a combo name.');
      return;
    }
    if (editing.components.length === 0) {
      toast.error('Add at least one component.');
      return;
    }
    for (const c of editing.components) {
      if (!c.item_code.trim()) {
        toast.error('Every component needs an item code.');
        return;
      }
      if (!(Number(c.quantity) > 0)) {
        toast.error(`Quantity for ${c.item_code || 'a component'} must be greater than 0.`);
        return;
      }
    }
    const payload: ComboDefinitionUpsert = {
      channel: editing.channel,
      code: editing.code.trim(),
      name: editing.name.trim(),
      fsn: editing.fsn?.trim() ?? '',
      marketplace_sku: editing.marketplace_sku?.trim() ?? '',
      sku_name: editing.sku_name?.trim() ?? '',
      is_active: editing.is_active,
      components: editing.components,
      ...(editing.id ? { id: editing.id } : {}),
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        toast.success('Combo saved');
        setEditing(null);
      },
      onError: (e) => toast.error(errMsg(e, 'Could not save combo')),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditing(EMPTY_COMBO(channel))}>
            <Plus className="mr-2 h-4 w-4" /> Add combo
          </Button>
        </div>
        <MasterTable
          headers={['FSN', 'Code', 'Name', 'Components', '']}
          rows={(combos ?? []).map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2 px-2 font-mono">{c.fsn || '—'}</td>
              <td className="py-2 px-2 font-mono">{c.code}</td>
              <td className="py-2 px-2">{c.name}</td>
              <td className="py-2 px-2 text-xs text-muted-foreground">
                {c.components.map((k) => `${k.item_code}×${k.quantity}`).join(', ')}
              </td>
              <RowActions onEdit={() => setEditing(c)} onDelete={() => setToDelete(c)} />
            </tr>
          ))}
        />
      </CardContent>

      <ConfirmDelete
        open={!!toDelete}
        label={`combo “${toDelete?.code ?? ''}”`}
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={doDelete}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit' : 'Add'} combo</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="FSN (primary mapping key)">
                  <Input
                    value={editing.fsn ?? ''}
                    placeholder="Flipkart FSN — matched to this combo first"
                    onChange={(e) => setEditing({ ...editing, fsn: e.target.value })}
                  />
                </Field>
                <Field label="Marketplace SKU (fallback)">
                  <Input
                    value={editing.marketplace_sku ?? ''}
                    placeholder="Optional — defaults to the combo code"
                    onChange={(e) => setEditing({ ...editing, marketplace_sku: e.target.value })}
                  />
                </Field>
                <Field label="Code">
                  <Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
                </Field>
                <Field label="Name">
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </Field>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Components (FG + packing materials)</Label>
                  <Button size="sm" variant="outline" onClick={addComponent}>
                    <Plus className="mr-1 h-3 w-3" /> Add component
                  </Button>
                </div>
                {editing.components.map((comp, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border p-2">
                  <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[90px_1fr_80px_70px_32px]">
                    <NativeSelect
                      value={comp.component_type}
                      onChange={(e) => setComponent(idx, { component_type: e.target.value as 'FG' | 'PM' })}
                    >
                      <SelectOption value="FG">FG</SelectOption>
                      <SelectOption value="PM">PM</SelectOption>
                    </NativeSelect>
                    <SapItemInput
                      placeholder="Item code"
                      value={comp.item_code}
                      onChange={(code, name, uom) =>
                        setComponent(idx, {
                          item_code: code,
                          item_name: name ?? comp.item_name,
                          // Auto-fill the unit from the picked SAP item (keep existing if none).
                          uom: uom || comp.uom,
                        })
                      }
                    />
                    <Input
                      placeholder="Qty"
                      value={comp.quantity}
                      onChange={(e) => setComponent(idx, { quantity: e.target.value })}
                    />
                    <NativeSelect
                      value={comp.uom ?? ''}
                      onChange={(e) => setComponent(idx, { uom: e.target.value })}
                    >
                      <SelectOption value="">UOM</SelectOption>
                      {comp.uom && !UOM_OPTIONS.includes(comp.uom) && (
                        <SelectOption value={comp.uom}>{comp.uom}</SelectOption>
                      )}
                      {UOM_OPTIONS.map((u) => (
                        <SelectOption key={u} value={u}>
                          {u}
                        </SelectOption>
                      ))}
                    </NativeSelect>
                    <Button size="icon" variant="ghost" onClick={() => removeComponent(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <ComponentAlternatives
                    component={comp}
                    onChange={(patch) => setComponent(idx, patch)}
                  />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Warehouses ───────────────────────────────────────────────────────────────
const EMPTY_WH = (channel: MarketplaceChannel): MarketplaceWarehouse => ({
  id: 0,
  channel,
  name: '',
  sap_warehouse_code: '',
  sap_customer_card_code: '',
  facility_code: '',
  sap_series: '',
  sap_tax_code: '',
  sap_branch_id: null,
  post_goods_issue: true,
  is_default: false,
  is_active: true,
});

function WarehousesTab({ channel }: { channel: MarketplaceChannel }) {
  const { data: warehouses } = useMpWarehouses(channel);
  const { data: sapWarehouses = [] } = useSapWarehouses();
  const upsert = useUpsertWarehouse();
  const remove = useDeleteWarehouse();
  const [editing, setEditing] = useState<MarketplaceWarehouse | null>(null);
  const [toDelete, setToDelete] = useState<MarketplaceWarehouse | null>(null);

  function save() {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error('Enter a name.');
      return;
    }
    if (!editing.sap_warehouse_code.trim()) {
      toast.error('Select the SAP warehouse (godown).');
      return;
    }
    if (!editing.sap_customer_card_code.trim()) {
      toast.error('Enter the SAP customer CardCode — it is required for the delivery note.');
      return;
    }
    const payload: MarketplaceWarehouseUpsert = {
      channel: editing.channel,
      name: editing.name.trim(),
      sap_warehouse_code: editing.sap_warehouse_code.trim(),
      sap_customer_card_code: editing.sap_customer_card_code.trim(),
      facility_code: editing.facility_code,
      sap_series: editing.sap_series.trim(),
      sap_tax_code: editing.sap_tax_code.trim(),
      sap_branch_id: editing.sap_branch_id,
      post_goods_issue: editing.post_goods_issue,
      is_default: editing.is_default,
      is_active: editing.is_active,
      ...(editing.id ? { id: editing.id } : {}),
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        toast.success('Warehouse saved');
        setEditing(null);
      },
      onError: (e) => toast.error(errMsg(e, 'Could not save warehouse')),
    });
  }

  function doDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Warehouse deleted');
        setToDelete(null);
      },
      onError: (e) => toast.error(errMsg(e, 'Could not delete')),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditing(EMPTY_WH(channel))}>
            <Plus className="mr-2 h-4 w-4" /> Add warehouse
          </Button>
        </div>
        <MasterTable
          headers={['Name', 'SAP Warehouse', 'Customer', 'Facility', '']}
          rows={(warehouses ?? []).map((w) => (
            <tr key={w.id} className="border-b last:border-0">
              <td className="py-2 px-2">{w.name}</td>
              <td className="py-2 px-2 font-mono">{w.sap_warehouse_code}</td>
              <td className="py-2 px-2 font-mono">{w.sap_customer_card_code || '—'}</td>
              <td className="py-2 px-2">{w.facility_code || '—'}</td>
              <RowActions onEdit={() => setEditing(w)} onDelete={() => setToDelete(w)} />
            </tr>
          ))}
        />
      </CardContent>

      <ConfirmDelete
        open={!!toDelete}
        label={`warehouse “${toDelete?.name ?? ''}”`}
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={doDelete}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit' : 'Add'} warehouse link</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <Field label="Name">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="SAP warehouse (godown)">
                {sapWarehouses.length > 0 ? (
                  <NativeSelect
                    value={editing.sap_warehouse_code}
                    onChange={(e) => {
                      const code = e.target.value;
                      const match = sapWarehouses.find((w) => w.warehouse_code === code);
                      setEditing({
                        ...editing,
                        sap_warehouse_code: code,
                        name: editing.name || match?.warehouse_name || '',
                      });
                    }}
                  >
                    <option value="">Select SAP warehouse…</option>
                    {sapWarehouses.map((w) => (
                      <option key={w.warehouse_code} value={w.warehouse_code}>
                        {w.warehouse_code} — {w.warehouse_name}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    value={editing.sap_warehouse_code}
                    placeholder="SAP warehouse code (SAP list unavailable)"
                    onChange={(e) => setEditing({ ...editing, sap_warehouse_code: e.target.value })}
                  />
                )}
              </Field>
              <Field label="SAP customer CardCode">
                <Input
                  value={editing.sap_customer_card_code}
                  onChange={(e) => setEditing({ ...editing, sap_customer_card_code: e.target.value })}
                />
              </Field>
              <Field label="Facility code">
                <Input
                  value={editing.facility_code}
                  onChange={(e) => setEditing({ ...editing, facility_code: e.target.value })}
                />
              </Field>

              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Delivery note posting (SAP)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Document series">
                    <Input
                      value={editing.sap_series}
                      placeholder="SAP default"
                      onChange={(e) => setEditing({ ...editing, sap_series: e.target.value })}
                    />
                  </Field>
                  <Field label="Tax code (VatGroup)">
                    <Input
                      value={editing.sap_tax_code}
                      placeholder="e.g. GST18"
                      onChange={(e) => setEditing({ ...editing, sap_tax_code: e.target.value })}
                    />
                  </Field>
                  <Field label="Branch (BPLId)">
                    <Input
                      type="number"
                      value={editing.sap_branch_id ?? ''}
                      placeholder="SAP Business Place id"
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          sap_branch_id: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={editing.post_goods_issue}
                    onChange={(e) => setEditing({ ...editing, post_goods_issue: e.target.checked })}
                  />
                  Also post packing-material Goods Issue
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={editing.is_default}
                    onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                  />
                  Default warehouse for cutting delivery notes
                </label>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────
function errMsg(e: unknown, fallback: string) {
  return (e as { message?: string })?.message ?? fallback;
}

function ConfirmDelete({
  open,
  label,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  label: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">This can’t be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MasterTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[] }) {
  return (
    <div className="-mx-2 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {headers.map((h, i) => (
              <th key={i} className="py-2 px-2 font-medium first:pl-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-6 text-center text-muted-foreground">
                No records.
              </td>
            </tr>
          ) : (
            rows
          )}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <td className="py-2 px-2 text-right">
      <div className="flex justify-end gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </td>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
