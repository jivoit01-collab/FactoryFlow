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
  Badge,
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
  useCreateRateConfig,
  useMachines,
  usePreformSpecs,
  useRateConfigs,
  useSearchSAPItems,
  useUpdateBuyPrice,
  useUpdateMachine,
  useUpdatePreformSpec,
  useUpdateRateConfig,
} from '../api';
import type {
  BlowingAuditLog,
  BlowingMachine,
  BlowingRateConfig,
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
  type RateConfigFormData,
  type RateConfigFormInput,
  rateConfigFormSchema,
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

// Effective-date status for a row (active=applied / scheduled / superseded / inactive).
type EffStatus = 'applied' | 'scheduled' | 'superseded' | 'inactive';
const EFF_ROW: Record<EffStatus, string> = {
  applied: 'bg-green-50 dark:bg-green-950/30',
  scheduled: 'bg-blue-50/50 dark:bg-blue-950/20',
  superseded: 'text-muted-foreground opacity-60',
  inactive: 'text-muted-foreground opacity-40 line-through',
};
const EFF_BADGE: Record<EffStatus, { label: string; cls: string }> = {
  applied: { label: 'Applied', cls: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
  superseded: { label: 'Superseded', cls: 'bg-gray-100 text-gray-600' },
  inactive: { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' },
};

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
      mould_cost: nOrUndef(s.mould_cost), mould_life_bottles: s.mould_life_bottles ?? undefined,
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
          <div><Label htmlFor="p-mc">Mould cost (₹)</Label><Input id="p-mc" type="number" step="0.01" {...register('mould_cost')} /></div>
          <div><Label htmlFor="p-ml">Mould life (bottles)</Label><Input id="p-ml" type="number" {...register('mould_life_bottles')} /></div>
          <div><Label htmlFor="p-smc">Std make cost / bottle (₹)</Label><Input id="p-smc" type="number" step="0.0001" {...register('std_make_cost_per_bottle')} /></div>
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
function RateConfigTab() {
  const { data: configs = [] } = useRateConfigs();
  const createConfig = useCreateRateConfig();
  const updateConfig = useUpdateRateConfig();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlowingRateConfig | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RateConfigFormInput, unknown, RateConfigFormData>({
    resolver: zodResolver(rateConfigFormSchema),
  });

  // The currently-applied config: latest active with effective_from <= today.
  const appliedId = useMemo(() => {
    const t = today();
    return [...configs].filter((c) => c.is_active && c.effective_from <= t)
      .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0]?.id;
  }, [configs]);
  const statusOf = (c: BlowingRateConfig): EffStatus =>
    !c.is_active ? 'inactive' : c.id === appliedId ? 'applied' : c.effective_from > today() ? 'scheduled' : 'superseded';

  const openAdd = () => { setEditing(null); reset({ packing_rate_per_bottle: 0.2 }); setOpen(true); };
  const openEdit = (c: BlowingRateConfig) => {
    setEditing(c);
    reset({
      effective_from: c.effective_from,
      operator_rate_per_day: Number(c.operator_rate_per_day), labour_rate_per_day: Number(c.labour_rate_per_day),
      electricity_rate_per_unit: Number(c.electricity_rate_per_unit),
      scrap_rate_per_bottle: Number(c.scrap_rate_per_bottle), packing_rate_per_bottle: Number(c.packing_rate_per_bottle),
      maintenance_per_day: Number(c.maintenance_per_day), factory_overhead_per_day: Number(c.factory_overhead_per_day),
      qa_cost_per_day: Number(c.qa_cost_per_day),
    });
    setOpen(true);
  };

  const onSubmit = async (data: RateConfigFormData) => {
    try {
      if (editing) { await updateConfig.mutateAsync({ id: editing.id, data }); toast.success('Rate config updated'); }
      else { await createConfig.mutateAsync(data); toast.success('Rate config added'); }
      setOpen(false);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? 'Failed to save rate config');
    }
  };

  const fields: Array<{ name: keyof RateConfigFormData; label: string }> = [
    { name: 'operator_rate_per_day', label: 'Operator rate / day (₹)' },
    { name: 'labour_rate_per_day', label: 'Labour rate / day (₹)' },
    { name: 'electricity_rate_per_unit', label: 'Electricity rate / unit (₹)' },
    { name: 'scrap_rate_per_bottle', label: 'Scrap rate / bottle (₹)' },
    { name: 'packing_rate_per_bottle', label: 'Packing rate / bottle (₹)' },
    { name: 'maintenance_per_day', label: 'Maintenance / day (₹)' },
    { name: 'factory_overhead_per_day', label: 'Factory overhead / day (₹)' },
    { name: 'qa_cost_per_day', label: 'QA cost / day (₹)' },
  ];

  return (
    <TabShell
      title="Rate configs" addLabel="Add rate config" onAdd={openAdd}
      dialogTitle={editing ? 'Edit rate config' : 'Add rate config'}
      open={open} setOpen={setOpen}
      form={
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="r-eff">Effective from</Label>
            <Input id="r-eff" type="date" {...register('effective_from')} />
            {errors.effective_from && <p className="text-sm text-red-600">{errors.effective_from.message}</p>}
          </div>
          {fields.map((f) => (
            <div key={f.name}>
              <Label htmlFor={`r-${f.name}`}>{f.label}</Label>
              <Input id={`r-${f.name}`} type="number" step="0.0001" {...register(f.name)} />
              {errors[f.name] && <p className="text-sm text-red-600">{String(errors[f.name]?.message ?? '')}</p>}
            </div>
          ))}
          <div className="sm:col-span-2"><FormFooter pending={createConfig.isPending || updateConfig.isPending} editing={!!editing} onCancel={() => setOpen(false)} /></div>
        </form>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">The green row is the rate currently applied to new runs. Greyed rows are its history. Preform cost is now set per preform (₹/bottle) under the <strong>Preform Specs</strong> tab, since each preform has its own rate.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Effective</th><th className="py-2 pr-4 text-right">Operator/day</th>
              <th className="py-2 pr-4 text-right">Labour/day</th><th className="py-2 pr-4 text-right">Elec/unit</th>
              <th className="py-2 pr-4 text-right">Scrap/bottle</th>
              <th className="py-2 pr-4 text-right">Packing/bottle</th><th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => {
              const st = statusOf(c);
              return (
                <tr key={c.id} className={`cursor-pointer border-b hover:bg-muted/40 ${EFF_ROW[st]}`} onClick={() => openEdit(c)}>
                  <td className="py-2 pr-4">{c.effective_from}</td>
                  <td className="py-2 pr-4 text-right">{num(c.operator_rate_per_day)}</td>
                  <td className="py-2 pr-4 text-right">{num(c.labour_rate_per_day)}</td>
                  <td className="py-2 pr-4 text-right">{num(c.electricity_rate_per_unit, 4)}</td>
                  <td className="py-2 pr-4 text-right">{num(c.scrap_rate_per_bottle, 4)}</td>
                  <td className="py-2 pr-4 text-right">{num(c.packing_rate_per_bottle, 4)}</td>
                  <td className="py-2 pr-4"><Badge className={EFF_BADGE[st].cls}>{EFF_BADGE[st].label}</Badge></td>
                </tr>
              );
            })}
            {configs.length === 0 && <tr><td colSpan={7} className="py-4 text-muted-foreground">No rate configs yet.</td></tr>}
          </tbody>
        </table>
      </div>
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

  // Applied buy price = latest active effective row per bottle size.
  const appliedIds = useMemo(() => {
    const t = today();
    const bySpec: Record<number, BottleBuyPrice> = {};
    for (const p of prices) {
      if (!p.is_active || p.effective_from > t) continue;
      const cur = bySpec[p.preform_spec];
      if (!cur || p.effective_from > cur.effective_from) bySpec[p.preform_spec] = p;
    }
    return new Set(Object.values(bySpec).map((p) => p.id));
  }, [prices]);
  const statusOf = (p: BottleBuyPrice): EffStatus =>
    !p.is_active ? 'inactive' : appliedIds.has(p.id) ? 'applied' : p.effective_from > today() ? 'scheduled' : 'superseded';

  const openAdd = () => { setEditing(null); reset({ supplier_name: '', carrying_pct_annual: 20, inventory_days: 30 }); setOpen(true); };
  const openEdit = (p: BottleBuyPrice) => {
    setEditing(p);
    reset({
      preform_spec_id: p.preform_spec, supplier_name: p.supplier_name, effective_from: p.effective_from,
      buy_price: Number(p.buy_price), freight_per_bottle: Number(p.freight_per_bottle), duties_per_bottle: Number(p.duties_per_bottle),
      carrying_pct_annual: Number(p.carrying_pct_annual), inventory_days: p.inventory_days,
      qa_allowance_pct: Number(p.qa_allowance_pct), risk_premium_per_bottle: Number(p.risk_premium_per_bottle),
    });
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

  const fields: Array<{ name: keyof BuyPriceFormData; label: string; step?: string }> = [
    { name: 'buy_price', label: 'Buy price / bottle (₹)', step: '0.0001' },
    { name: 'freight_per_bottle', label: 'Freight / bottle (₹)', step: '0.0001' },
    { name: 'duties_per_bottle', label: 'Duties / bottle (₹)', step: '0.0001' },
    { name: 'carrying_pct_annual', label: 'Carrying % / yr', step: '0.01' },
    { name: 'inventory_days', label: 'Inventory days' },
    { name: 'qa_allowance_pct', label: 'QA allowance %', step: '0.01' },
    { name: 'risk_premium_per_bottle', label: 'Risk premium / bottle (₹)', step: '0.0001' },
  ];

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
            <Label htmlFor="b-eff">Effective from</Label>
            <Input id="b-eff" type="date" {...register('effective_from')} />
            {errors.effective_from && <p className="text-sm text-red-600">{errors.effective_from.message}</p>}
          </div>
          <div className="hidden sm:block" />
          {fields.map((f) => (
            <div key={f.name}>
              <Label htmlFor={`b-${f.name}`}>{f.label}</Label>
              <Input id={`b-${f.name}`} type="number" step={f.step ?? '1'} {...register(f.name)} />
              {errors[f.name] && <p className="text-sm text-red-600">{String(errors[f.name]?.message ?? '')}</p>}
            </div>
          ))}
          <div className="sm:col-span-2"><FormFooter pending={createBuy.isPending || updateBuy.isPending} editing={!!editing} onCancel={() => setOpen(false)} /></div>
        </form>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">The green row per size is the quote currently used in make‑vs‑buy. Greyed rows are its history.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Size</th><th className="py-2 pr-4">Supplier</th>
              <th className="py-2 pr-4">Effective</th><th className="py-2 pr-4 text-right">Buy price</th>
              <th className="py-2 pr-4 text-right">Landed / bottle</th><th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => {
              const st = statusOf(p);
              return (
                <tr key={p.id} className={`cursor-pointer border-b hover:bg-muted/40 ${EFF_ROW[st]}`} onClick={() => openEdit(p)}>
                  <td className="py-2 pr-4">{p.preform_make} {Number(p.preform_gram)}g</td>
                  <td className="py-2 pr-4">{p.supplier_name || '-'}</td>
                  <td className="py-2 pr-4">{p.effective_from}</td>
                  <td className="py-2 pr-4 text-right">{num(p.buy_price, 4)}</td>
                  <td className="py-2 pr-4 text-right font-medium">{num(p.landed_cost_per_bottle, 4)}</td>
                  <td className="py-2 pr-4"><Badge className={EFF_BADGE[st].cls}>{EFF_BADGE[st].label}</Badge></td>
                </tr>
              );
            })}
            {prices.length === 0 && <tr><td colSpan={6} className="py-4 text-muted-foreground">No buy prices yet.</td></tr>}
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
      <DashboardHeader title="Blowing — Master Data" description="Machines, preform specs and rate configuration">
        <Button variant="outline" onClick={() => navigate('/production/blowing')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </DashboardHeader>
      <Tabs defaultValue="machines">
        <TabsList>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="preforms">Preform Specs</TabsTrigger>
          <TabsTrigger value="rates">Rate Config</TabsTrigger>
          <TabsTrigger value="buy">Buy Prices</TabsTrigger>
        </TabsList>
        <TabsContent value="machines" className="pt-4"><MachinesTab /></TabsContent>
        <TabsContent value="preforms" className="pt-4"><PreformSpecsTab /></TabsContent>
        <TabsContent value="rates" className="pt-4"><RateConfigTab /></TabsContent>
        <TabsContent value="buy" className="pt-4"><BuyPricesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default MasterDataPage;
