/** Masters — SKU→FG mappings, combos (JI sales-BOM), and channel→SAP warehouse links. */
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
  useSkuMappings,
  useUpsertCombo,
  useUpsertSkuMapping,
  useUpsertWarehouse,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import type {
  ComboComponent,
  ComboDefinition,
  ComboDefinitionUpsert,
  MarketplaceChannel,
  MarketplaceWarehouse,
  MarketplaceWarehouseUpsert,
  SkuMapping,
  SkuMappingUpsert,
} from '../types/marketplace.types';

export default function MpMastersPage() {
  const [channel, setChannel] = useState<MarketplaceChannel>('FLIPKART');
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace Masters</h1>
          <p className="text-sm text-muted-foreground">
            SKU→FG mappings, combos, and channel→SAP warehouse links.
          </p>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      <Tabs defaultValue="skus">
        <TabsList>
          <TabsTrigger value="skus">SKU Mappings</TabsTrigger>
          <TabsTrigger value="combos">Combos</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>
        <TabsContent value="skus">
          <SkuTab channel={channel} />
        </TabsContent>
        <TabsContent value="combos">
          <CombosTab channel={channel} />
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
  sku_name: '',
  sku_type: 'RAW',
  fg_item_code: '',
  fg_item_name: '',
  combo: null,
  default_uom: '',
  is_active: true,
});

function SkuTab({ channel }: { channel: MarketplaceChannel }) {
  const { data: mappings } = useSkuMappings({ channel });
  const { data: combos } = useCombos(channel);
  const upsert = useUpsertSkuMapping();
  const remove = useDeleteSkuMapping();
  const [editing, setEditing] = useState<SkuMapping | null>(null);

  function save() {
    if (!editing) return;
    const payload: SkuMappingUpsert = {
      channel: editing.channel,
      marketplace_sku: editing.marketplace_sku,
      sku_name: editing.sku_name,
      sku_type: editing.sku_type,
      fg_item_code: editing.fg_item_code,
      fg_item_name: editing.fg_item_name,
      combo: editing.combo,
      default_uom: editing.default_uom,
      is_active: editing.is_active,
      ...(editing.id ? { id: editing.id } : {}),
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        toast.success('Mapping saved');
        setEditing(null);
      },
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditing(EMPTY_SKU(channel))}>
            <Plus className="mr-2 h-4 w-4" /> Add mapping
          </Button>
        </div>
        <MasterTable
          headers={['SKU', 'Type', 'FG / Combo', 'Active', '']}
          rows={(mappings ?? []).map((m) => (
            <tr key={m.id} className="border-b last:border-0">
              <td className="py-2 pr-2 font-mono">{m.marketplace_sku}</td>
              <td className="py-2 px-2">
                <Badge variant="outline">{m.sku_type}</Badge>
              </td>
              <td className="py-2 px-2 font-mono">
                {m.sku_type === 'COMBO' ? m.combo_code || `#${m.combo}` : m.fg_item_code}
              </td>
              <td className="py-2 px-2">{m.is_active ? 'Yes' : 'No'}</td>
              <RowActions onEdit={() => setEditing(m)} onDelete={() => remove.mutate(m.id)} />
            </tr>
          ))}
        />
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit' : 'Add'} SKU mapping</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <Field label="Marketplace SKU (FSN/ASIN)">
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
              <Field label="Type">
                <NativeSelect
                  value={editing.sku_type}
                  onChange={(e) =>
                    setEditing({ ...editing, sku_type: e.target.value as 'RAW' | 'COMBO' })
                  }
                >
                  <SelectOption value="RAW">Raw (direct FG)</SelectOption>
                  <SelectOption value="COMBO">Combo / Kit</SelectOption>
                </NativeSelect>
              </Field>
              {editing.sku_type === 'RAW' ? (
                <Field label="FG item code (SAP)">
                  <Input
                    value={editing.fg_item_code ?? ''}
                    onChange={(e) => setEditing({ ...editing, fg_item_code: e.target.value })}
                  />
                </Field>
              ) : (
                <Field label="Combo">
                  <NativeSelect
                    value={editing.combo ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, combo: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <SelectOption value="">— select combo —</SelectOption>
                    {(combos ?? []).map((c) => (
                      <SelectOption key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              )}
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

// ── Combos ───────────────────────────────────────────────────────────────────
const EMPTY_COMBO = (channel: MarketplaceChannel): ComboDefinition => ({
  id: 0,
  channel,
  code: '',
  name: '',
  is_active: true,
  components: [],
});

function CombosTab({ channel }: { channel: MarketplaceChannel }) {
  const { data: combos } = useCombos(channel);
  const upsert = useUpsertCombo();
  const remove = useDeleteCombo();
  const [editing, setEditing] = useState<ComboDefinition | null>(null);

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
    const payload: ComboDefinitionUpsert = {
      channel: editing.channel,
      code: editing.code,
      name: editing.name,
      is_active: editing.is_active,
      components: editing.components,
      ...(editing.id ? { id: editing.id } : {}),
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        toast.success('Combo saved');
        setEditing(null);
      },
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
          headers={['Code', 'Name', 'Components', '']}
          rows={(combos ?? []).map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2 pr-2 font-mono">{c.code}</td>
              <td className="py-2 px-2">{c.name}</td>
              <td className="py-2 px-2 text-xs text-muted-foreground">
                {c.components.map((k) => `${k.item_code}×${k.quantity}`).join(', ')}
              </td>
              <RowActions onEdit={() => setEditing(c)} onDelete={() => remove.mutate(c.id)} />
            </tr>
          ))}
        />
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit' : 'Add'} combo</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                  <div key={idx} className="grid grid-cols-[90px_1fr_80px_70px_32px] items-center gap-2">
                    <NativeSelect
                      value={comp.component_type}
                      onChange={(e) => setComponent(idx, { component_type: e.target.value as 'FG' | 'PM' })}
                    >
                      <SelectOption value="FG">FG</SelectOption>
                      <SelectOption value="PM">PM</SelectOption>
                    </NativeSelect>
                    <Input
                      placeholder="Item code"
                      value={comp.item_code}
                      onChange={(e) => setComponent(idx, { item_code: e.target.value })}
                    />
                    <Input
                      placeholder="Qty"
                      value={comp.quantity}
                      onChange={(e) => setComponent(idx, { quantity: e.target.value })}
                    />
                    <Input
                      placeholder="UOM"
                      value={comp.uom ?? ''}
                      onChange={(e) => setComponent(idx, { uom: e.target.value })}
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeComponent(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
  is_active: true,
});

function WarehousesTab({ channel }: { channel: MarketplaceChannel }) {
  const { data: warehouses } = useMpWarehouses(channel);
  const upsert = useUpsertWarehouse();
  const remove = useDeleteWarehouse();
  const [editing, setEditing] = useState<MarketplaceWarehouse | null>(null);

  function save() {
    if (!editing) return;
    const payload: MarketplaceWarehouseUpsert = {
      channel: editing.channel,
      name: editing.name,
      sap_warehouse_code: editing.sap_warehouse_code,
      sap_customer_card_code: editing.sap_customer_card_code,
      facility_code: editing.facility_code,
      is_active: editing.is_active,
      ...(editing.id ? { id: editing.id } : {}),
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        toast.success('Warehouse saved');
        setEditing(null);
      },
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
              <td className="py-2 pr-2">{w.name}</td>
              <td className="py-2 px-2 font-mono">{w.sap_warehouse_code}</td>
              <td className="py-2 px-2 font-mono">{w.sap_customer_card_code || '—'}</td>
              <td className="py-2 px-2">{w.facility_code || '—'}</td>
              <RowActions onEdit={() => setEditing(w)} onDelete={() => remove.mutate(w.id)} />
            </tr>
          ))}
        />
      </CardContent>

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
              <Field label="SAP warehouse code">
                <Input
                  value={editing.sap_warehouse_code}
                  onChange={(e) => setEditing({ ...editing, sap_warehouse_code: e.target.value })}
                />
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
function MasterTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {headers.map((h, i) => (
              <th key={i} className="py-2 px-2 font-medium first:pl-0">
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
    <td className="py-2 pl-2 text-right">
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
