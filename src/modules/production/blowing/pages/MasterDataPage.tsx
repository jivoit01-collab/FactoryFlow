import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { VendorSelect } from '@/modules/gate/components';
import { useWarehouses } from '@/modules/warehouse/grpo/api';
import type { Warehouse } from '@/modules/warehouse/grpo/types/grpo.types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import {
  useAuditLogs,
  useBuyPrices,
  useCreateBuyPrice,
  useCreateMachine,
  useCreatePreformSpec,
  useMachines,
  usePreformSpecs,
  useSearchSAPItems,
  useUpdateBuyPrice,
  useUpdateMachine,
  useUpdatePreformSpec,
} from '../api';
import type {
  BlowingAuditLog,
  BlowingMachine,
  BottleBuyPrice,
  PreformSpec,
  SAPItem,
} from '../types';
import {
  type BuyPriceFormData,
  type BuyPriceFormInput,
  buyPriceFormSchema,
  type MachineFormData,
  type MachineFormInput,
  machineFormSchema,
  type PreformSpecFormData,
  type PreformSpecFormInput,
  preformSpecFormSchema,
} from '../schemas';

const num = (v: string | number | null | undefined, d = 2) =>
  v === null || v === undefined || v === '' ? '-' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d });
const nOrUndef = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? undefined : Number(v);
const today = () => new Date().toISOString().slice(0, 10);

// ---- shells ---------------------------------------------------------------
function TabShell({
  title, addLabel, onAdd, open, setOpen, dialogTitle, children, form,
}: {
  title: string; addLabel: string; onAdd: () => void;
  open: boolean; setOpen: (v: boolean) => void; dialogTitle: string;
  children: ReactNode; form: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" /> {addLabel}</Button>
      </div>
      <Card><CardContent className="pt-6">{children}</CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormFooter({ pending, editing, onCancel }: { pending: boolean; editing: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        {editing ? 'Save changes' : 'Add'}
      </Button>
    </div>
  );
}

// Edit trail shown inside the machine / preform-spec modals.
function AuditEntry({ l }: { l: BlowingAuditLog }) {
  return (
    <div className="rounded border bg-background px-3 py-2 text-xs">
      <div className="flex justify-between text-muted-foreground">
        <span>{l.action === 'CREATE' ? 'Created' : 'Updated'} by {l.user_name}</span>
        <span>{new Date(l.created_at).toLocaleString('en-IN')}</span>
      </div>
      {l.action === 'UPDATE' && (
        <ul className="mt-1 space-y-0.5">
          {Object.entries(l.changes).map(([field, c]) => (
            <li key={field}>
              <span className="font-medium">{field}</span>: {String(c.old ?? '—')} → {String(c.new ?? '—')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const AUDIT_INLINE_LIMIT = 2;

function AuditHistory({ entityType, entityId, entityLabel }: { entityType: string; entityId: number | undefined; entityLabel: string }) {
  const { data: logs = [], isLoading } = useAuditLogs(entityType, entityId);
  const [showAll, setShowAll] = useState(false);
  if (!entityId) return null;
  return (
    <div className="mt-1 rounded-md border bg-muted/20 p-3">
      <p className="mb-2 text-sm font-medium">Edit history</p>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading history…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No changes recorded yet — edits from here on will show up here.</p>
      ) : (
        <>
          <div className="space-y-2">
            {logs.slice(0, AUDIT_INLINE_LIMIT).map((l) => <AuditEntry key={l.id} l={l} />)}
          </div>
          {logs.length > AUDIT_INLINE_LIMIT && (
            <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => setShowAll(true)}>
              View full history ({logs.length} changes)
            </Button>
          )}
          <Dialog open={showAll} onOpenChange={setShowAll}>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden">
              <DialogHeader><DialogTitle>Edit history — {entityLabel}</DialogTitle></DialogHeader>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {logs.map((l) => <AuditEntry key={l.id} l={l} />)}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
function MachinesTab() {
  const { data: machines = [] } = useMachines();
  const { data: warehouses = [], isLoading: loadingWh } = useWarehouses();
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlowingMachine | null>(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<MachineFormInput, unknown, MachineFormData>({ resolver: zodResolver(machineFormSchema) });
  const whValue = String(watch('sap_warehouse_code') ?? '');

  const openAdd = () => { setEditing(null); reset({ name: '', heads: undefined, sap_warehouse_code: '', depreciation_per_day: 0 }); setOpen(true); };
  const openEdit = (m: BlowingMachine) => {
    setEditing(m);
    reset({ name: m.name, heads: m.heads ?? undefined, sap_warehouse_code: m.sap_warehouse_code, depreciation_per_day: Number(m.depreciation_per_day) });
    setOpen(true);
  };

  const onSubmit = async (data: MachineFormData) => {
    try {
      if (editing) { await updateMachine.mutateAsync({ id: editing.id, data }); toast.success('Machine updated'); }
      else { await createMachine.mutateAsync(data); toast.success('Machine added'); }
      setOpen(false);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Failed to save machine');
    }
  };

  return (
    <TabShell
      title="Machines" addLabel="Add machine" onAdd={openAdd}
      dialogTitle={editing ? 'Edit machine' : 'Add machine'}
      open={open} setOpen={setOpen}
      form={
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="m-name">Name</Label>
            <Input id="m-name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="m-heads">Heads</Label>
            <Input id="m-heads" type="number" {...register('heads')} />
          </div>
          <div>
            <SearchableSelect<Warehouse>
              items={warehouses} isLoading={loadingWh} value={whValue}
              getItemKey={(w) => w.warehouse_code}
              getItemLabel={(w) => `${w.warehouse_code} - ${w.warehouse_name}`}
              label="SAP warehouse" inputId="m-wh" placeholder="Select warehouse..."
              loadingText="Loading warehouses..." emptyText="No warehouses" notFoundText="No warehouse found"
              onItemSelect={(w) => setValue('sap_warehouse_code', w.warehouse_code)}
              onClear={() => setValue('sap_warehouse_code', '')}
            />
          </div>
          <div>
            <Label htmlFor="m-dep">Depreciation / day (₹)</Label>
            <Input id="m-dep" type="number" step="0.01" {...register('depreciation_per_day')} />
          </div>
          {editing && <div className="sm:col-span-2"><AuditHistory entityType="machine" entityId={editing.id} entityLabel={editing.name} /></div>}
          <div className="sm:col-span-2"><FormFooter pending={createMachine.isPending || updateMachine.isPending} editing={!!editing} onCancel={() => setOpen(false)} /></div>
        </form>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Heads</th>
            <th className="py-2 pr-4">SAP WH</th><th className="py-2 pr-4">Active</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((m) => (
            <tr key={m.id} className="cursor-pointer border-b hover:bg-muted/50" onClick={() => openEdit(m)}>
              <td className="py-2 pr-4">{m.name}</td>
              <td className="py-2 pr-4">{m.heads ?? '-'}</td>
              <td className="py-2 pr-4">{m.sap_warehouse_code || '-'}</td>
              <td className="py-2 pr-4">{m.is_active ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {machines.length === 0 && <tr><td colSpan={4} className="py-4 text-muted-foreground">No machines yet.</td></tr>}
        </tbody>
      </table>
    </TabShell>
  );
}

// --------------------------------------------------------------------------
function PreformSpecsTab() {
  const { data: specs = [] } = usePreformSpecs();
  const createSpec = useCreatePreformSpec();
  const updateSpec = useUpdatePreformSpec();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PreformSpec | null>(null);
  const [sapSearch, setSapSearch] = useState('');
  const { data: sapItems = [], isLoading: loadingSap } = useSearchSAPItems('preform', sapSearch);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<PreformSpecFormInput, unknown, PreformSpecFormData>({ resolver: zodResolver(preformSpecFormSchema) });
  const sapCode = String(watch('sap_item_code') ?? '');

  const openAdd = () => { setEditing(null); reset({ make: '', sap_item_code: '', sap_item_name: '' }); setOpen(true); };
  const openEdit = (s: PreformSpec) => {
    setEditing(s);
    reset({
      make: s.make, gram: Number(s.gram), preforms_per_box: s.preforms_per_box,
      preform_rate_per_bottle: Number(s.preform_rate_per_bottle),
      sap_item_code: s.sap_item_code, sap_item_name: s.sap_item_name,
      bottle_weight_g: nOrUndef(s.bottle_weight_g), bottles_per_kg: nOrUndef(s.bottles_per_kg),
      std_make_cost_per_bottle: nOrUndef(s.std_make_cost_per_bottle),
      std_reject_pct: nOrUndef(s.std_reject_pct), std_units_per_bottle: nOrUndef(s.std_units_per_bottle),
    });
    setOpen(true);
  };

  const onSubmit = async (data: PreformSpecFormData) => {
    try {
      if (editing) { await updateSpec.mutateAsync({ id: editing.id, data }); toast.success('Preform spec updated'); }
      else { await createSpec.mutateAsync(data); toast.success('Preform spec added'); }
      setOpen(false);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Failed to save spec');
    }
  };

  return (
    <TabShell
      title="Preform specs" addLabel="Add preform spec" onAdd={openAdd}
      dialogTitle={editing ? 'Edit preform spec' : 'Add preform spec'}
      open={open} setOpen={setOpen}
      form={
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="p-make">Make</Label>
            <Input id="p-make" {...register('make')} placeholder="Frystal" />
            {errors.make && <p className="text-sm text-red-600">{errors.make.message}</p>}
          </div>
          <div>
            <Label htmlFor="p-gram">Gram</Label>
            <Input id="p-gram" type="number" step="0.01" {...register('gram')} />
            {errors.gram && <p className="text-sm text-red-600">{errors.gram.message}</p>}
          </div>
          <div>
            <Label htmlFor="p-ppb">Preforms / box</Label>
            <Input id="p-ppb" type="number" {...register('preforms_per_box')} />
            {errors.preforms_per_box && <p className="text-sm text-red-600">{errors.preforms_per_box.message}</p>}
          </div>
          <div>
            <Label htmlFor="p-prate">Preform rate / bottle (₹)</Label>
            <Input id="p-prate" type="number" step="0.0001" {...register('preform_rate_per_bottle')} />
            {errors.preform_rate_per_bottle && <p className="text-sm text-red-600">{errors.preform_rate_per_bottle.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <SearchableSelect<SAPItem>
              items={sapItems} isLoading={loadingSap && sapSearch.length >= 2} value={sapCode}
              getItemKey={(i) => i.ItemCode} getItemLabel={(i) => `${i.ItemCode} - ${i.ItemName}`}
              filterFn={() => true}
              renderItem={(i) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="min-w-0"><span className="font-mono text-xs">{i.ItemCode}</span><span className="ml-2">{i.ItemName}</span></span>
                  {i.InvntryUom && <span className="shrink-0 text-xs text-muted-foreground">{i.InvntryUom}</span>}
                </div>
              )}
              label="SAP preform item" inputId="p-sap" placeholder="Search preform by SAP code or name..."
              loadingText="Searching..." emptyText="Type at least 2 characters to search" notFoundText="No preform items found"
              onSearchChange={(s) => setSapSearch(s)}
              onItemSelect={(i) => { setValue('sap_item_code', i.ItemCode); setValue('sap_item_name', i.ItemName); }}
              onClear={() => { setValue('sap_item_code', ''); setValue('sap_item_name', ''); }}
            />
          </div>
          <div><Label htmlFor="p-bw">Bottle weight (g)</Label><Input id="p-bw" type="number" step="0.01" {...register('bottle_weight_g')} /></div>
          <div><Label htmlFor="p-bpk">Bottles / kg</Label><Input id="p-bpk" type="number" step="0.01" {...register('bottles_per_kg')} /></div>
          <div><Label htmlFor="p-smc">Std blowing cost / bottle (₹)</Label><Input id="p-smc" type="number" step="0.0001" {...register('std_make_cost_per_bottle')} /><p className="mt-1 text-[11px] text-muted-foreground">Conversion only — do not include the preform.</p></div>
          <div><Label htmlFor="p-srp">Std reject %</Label><Input id="p-srp" type="number" step="0.001" {...register('std_reject_pct')} /></div>
          <div><Label htmlFor="p-sub">Std units / bottle</Label><Input id="p-sub" type="number" step="0.000001" {...register('std_units_per_bottle')} /></div>
          {editing && <div className="sm:col-span-2"><AuditHistory entityType="preform_spec" entityId={editing.id} entityLabel={`${editing.make} ${Number(editing.gram)}g`} /></div>}
          <div className="sm:col-span-2"><FormFooter pending={createSpec.isPending || updateSpec.isPending} editing={!!editing} onCancel={() => setOpen(false)} /></div>
        </form>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Make</th><th className="py-2 pr-4">Gram</th>
            <th className="py-2 pr-4">Preforms/box</th>
            <th className="py-2 pr-4 text-right">Rate/bottle (₹)</th>
            <th className="py-2 pr-4">SAP code</th>
            <th className="py-2 pr-4">Active</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((s) => (
            <tr key={s.id} className="cursor-pointer border-b hover:bg-muted/50" onClick={() => openEdit(s)}>
              <td className="py-2 pr-4">{s.make}</td>
              <td className="py-2 pr-4">{num(s.gram)}</td>
              <td className="py-2 pr-4">{s.preforms_per_box}</td>
              <td className="py-2 pr-4 text-right">{num(s.preform_rate_per_bottle, 4)}</td>
              <td className="py-2 pr-4">{s.sap_item_code || '-'}</td>
              <td className="py-2 pr-4">{s.is_active ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {specs.length === 0 && <tr><td colSpan={6} className="py-4 text-muted-foreground">No preform specs yet.</td></tr>}
        </tbody>
      </table>
    </TabShell>
  );
}

// --------------------------------------------------------------------------
function BuyPricesTab() {
  const { data: prices = [] } = useBuyPrices();
  const { data: specs = [] } = usePreformSpecs(true);
  const createBuy = useCreateBuyPrice();
  const updateBuy = useUpdateBuyPrice();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BottleBuyPrice | null>(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<BuyPriceFormInput, unknown, BuyPriceFormData>({ resolver: zodResolver(buyPriceFormSchema) });
  const supplierValue = String(watch('supplier_name') ?? '');

  // One current buy price per bottle (latest active effective row).
  const appliedRows = useMemo(() => {
    const t = today();
    const bySpec: Record<number, BottleBuyPrice> = {};
    for (const p of prices) {
      if (!p.is_active || p.effective_from > t) continue;
      const cur = bySpec[p.preform_spec];
      if (!cur || p.effective_from > cur.effective_from) bySpec[p.preform_spec] = p;
    }
    return Object.values(bySpec);
  }, [prices]);

  const openAdd = () => { setEditing(null); reset({ supplier_name: '' }); setOpen(true); };
  const openEdit = (p: BottleBuyPrice) => {
    setEditing(p);
    reset({ preform_spec_id: p.preform_spec, supplier_name: p.supplier_name, buy_price: Number(p.buy_price) });
    setOpen(true);
  };

  const onSubmit = async (data: BuyPriceFormData) => {
    try {
      if (editing) { await updateBuy.mutateAsync({ id: editing.id, data }); toast.success('Buy price updated'); }
      else { await createBuy.mutateAsync(data); toast.success('Buy price added'); }
      setOpen(false);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Failed to save buy price');
    }
  };

  return (
    <TabShell
      title="Buy prices (finished bottle)" addLabel="Add buy price" onAdd={openAdd}
      dialogTitle={editing ? 'Edit buy price' : 'Add buy price (finished bottle)'}
      open={open} setOpen={setOpen}
      form={
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="b-spec">Bottle size</Label>
            <select id="b-spec" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" {...register('preform_spec_id')} defaultValue="">
              <option value="" disabled>Select size</option>
              {specs.map((s) => (<option key={s.id} value={s.id}>{s.make} {Number(s.gram)}g</option>))}
            </select>
            {errors.preform_spec_id && <p className="text-sm text-red-600">{errors.preform_spec_id.message}</p>}
          </div>
          <div>
            <VendorSelect label="Supplier" value={supplierValue} onChange={(v) => setValue('supplier_name', v ? v.vendor_name : '')} />
          </div>
          <div>
            <Label htmlFor="b-buy">Buy price / bottle (₹)</Label>
            <Input id="b-buy" type="number" step="0.0001" {...register('buy_price')} />
            {errors.buy_price && <p className="text-sm text-red-600">{errors.buy_price.message}</p>}
          </div>
          <div className="sm:col-span-2"><FormFooter pending={createBuy.isPending || updateBuy.isPending} editing={!!editing} onCancel={() => setOpen(false)} /></div>
        </form>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Bottle</th><th className="py-2 pr-4">Supplier</th>
              <th className="py-2 pr-4 text-right">Buy price</th>
            </tr>
          </thead>
          <tbody>
            {appliedRows.map((p) => (
              <tr key={p.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => openEdit(p)}>
                <td className="py-2 pr-4">{p.preform_make} {Number(p.preform_gram)}g</td>
                <td className="py-2 pr-4">{p.supplier_name || '-'}</td>
                <td className="py-2 pr-4 text-right">{num(p.buy_price, 4)}</td>
              </tr>
            ))}
            {appliedRows.length === 0 && <tr><td colSpan={3} className="py-4 text-muted-foreground">No buy prices yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </TabShell>
  );
}

// --------------------------------------------------------------------------
function MasterDataPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <DashboardHeader title="Blowing — Master Data" description="Machines, preform specs and buy prices">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/production/blowing/cost-master')}>
            Cost Master
          </Button>
          <Button variant="outline" onClick={() => navigate('/production/blowing')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </DashboardHeader>
      <Tabs defaultValue="machines">
        <TabsList>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="preforms">Preform Specs</TabsTrigger>
          <TabsTrigger value="buy">Buy Prices</TabsTrigger>
        </TabsList>
        <TabsContent value="machines" className="pt-4"><MachinesTab /></TabsContent>
        <TabsContent value="preforms" className="pt-4"><PreformSpecsTab /></TabsContent>
        <TabsContent value="buy" className="pt-4"><BuyPricesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default MasterDataPage;
