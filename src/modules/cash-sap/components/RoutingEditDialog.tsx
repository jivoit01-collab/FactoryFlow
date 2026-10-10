import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Switch,
} from '@/shared/components/ui';
import { getErrorMessage, getFieldErrors } from '@/shared/utils';

import { useSaveRouting } from '../api';
import type {
  CashBranchRouting,
  CashSapOptions,
  GrpoGrouping,
  PostingMode,
  RoutingPayload,
} from '../types';

interface RoutingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CashBranchRouting | null;
  options: CashSapOptions | undefined;
}

type TextField =
  | 'sap_company_code'
  | 'vendor_code'
  | 'warehouse_code'
  | 'ocr_code'
  | 'ocr_code3'
  | 'ocr_code5'
  | 'item_tax_code'
  | 'service_tax_code'
  | 'po_series_hint'
  | 'grpo_series_hint'
  | 'ap_series_hint';

const TEXT_FIELDS: {
  name: Exclude<TextField, 'sap_company_code'>;
  label: string;
  max: number;
  help?: string;
}[] = [
  { name: 'vendor_code', label: 'Imprest vendor', max: 30, help: 'e.g. ORGV000465' },
  { name: 'warehouse_code', label: 'Warehouse', max: 20 },
  { name: 'ocr_code', label: 'Dim1 (department)', max: 30 },
  {
    name: 'ocr_code3',
    label: 'Dim3 (budget head)',
    max: 30,
    help: 'Default; the G/L map may override',
  },
  { name: 'ocr_code5', label: 'Dim5', max: 30 },
  { name: 'item_tax_code', label: 'Item tax code', max: 20 },
  { name: 'service_tax_code', label: 'Service tax code', max: 20 },
  {
    name: 'po_series_hint',
    label: 'PO series hint',
    max: 40,
    help: 'Picks one when SAP has several',
  },
  { name: 'grpo_series_hint', label: 'GRPO series hint', max: 40 },
  { name: 'ap_series_hint', label: 'A/P series hint', max: 40 },
];

/**
 * One cash-book branch's SAP routing: which company, vendor, SAP branch,
 * warehouse and dims its vouchers post with, whether A/P drafts are made,
 * how GRPOs are grouped, the series hints and the cut-over date.
 *
 * Saved whole (`PATCH routing/<branch>/`); the server checks that a routing
 * switched on has what its mode needs and answers per field.
 */
export function RoutingEditDialog(props: RoutingEditDialogProps) {
  if (!props.open || !props.row) return null;
  return <RoutingForm {...props} row={props.row} />;
}

function RoutingForm({
  onOpenChange,
  row,
  options,
}: RoutingEditDialogProps & { row: CashBranchRouting }) {
  const [form, setForm] = useState<CashBranchRouting>(row);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveRouting();

  const set = <K extends keyof CashBranchRouting>(name: K, value: CashBranchRouting[K]) =>
    setForm((f) => ({ ...f, [name]: value }));

  async function submit() {
    const payload: RoutingPayload = {
      enabled: form.enabled,
      sap_company_code: form.sap_company_code.trim(),
      mode: form.mode,
      vendor_code: form.vendor_code.trim(),
      bpl_id: form.bpl_id,
      warehouse_code: form.warehouse_code.trim(),
      ocr_code: form.ocr_code.trim(),
      ocr_code3: form.ocr_code3.trim(),
      ocr_code5: form.ocr_code5.trim(),
      item_tax_code: form.item_tax_code.trim(),
      service_tax_code: form.service_tax_code.trim(),
      ap_drafts_enabled: form.ap_drafts_enabled,
      grpo_needs_attachment: form.grpo_needs_attachment,
      grpo_grouping: form.grpo_grouping,
      po_series_hint: form.po_series_hint.trim(),
      grpo_series_hint: form.grpo_series_hint.trim(),
      ap_series_hint: form.ap_series_hint.trim(),
      cutover_date: form.cutover_date || null,
    };
    try {
      await save.mutateAsync({ branchId: row.branch_id, payload });
      toast.success(`${row.branch_name} routing saved`);
      onOpenChange(false);
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, 'The routing could not be saved.'));
    }
  }

  const fieldError = (name: string) =>
    errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{row.branch_name} → SAP</DialogTitle>
          <DialogDescription>
            Where this branch&apos;s vouchers post. A voucher can still be sent to another company
            from its bunch&apos;s SAP page.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="rt-enabled" checked={form.enabled} onChange={(v) => set('enabled', v)} />
            <Label htmlFor="rt-enabled">Post this branch to SAP</Label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="rt-company">SAP company</Label>
              <NativeSelect
                id="rt-company"
                value={form.sap_company_code}
                onChange={(e) => set('sap_company_code', e.target.value)}
              >
                <SelectOption value="">None</SelectOption>
                {(options?.sap_companies ?? []).map((code) => (
                  <SelectOption key={code} value={code}>
                    {code}
                    {options?.test_targets?.[code] ? ' (TEST)' : ''}
                  </SelectOption>
                ))}
              </NativeSelect>
              {fieldError('sap_company_code')}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rt-mode">Mode</Label>
              <NativeSelect
                id="rt-mode"
                value={form.mode}
                onChange={(e) => set('mode', e.target.value as PostingMode)}
              >
                {(
                  options?.modes ?? [
                    { value: 'PO_GRPO', label: 'PO per bunch, GRPO per voucher' },
                    { value: 'AP_DRAFT_ONLY', label: 'A/P draft only' },
                  ]
                ).map((m) => (
                  <SelectOption key={m.value} value={m.value}>
                    {m.label}
                  </SelectOption>
                ))}
              </NativeSelect>
              {fieldError('mode')}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rt-bpl">SAP branch (BPLId)</Label>
              <Input
                id="rt-bpl"
                type="number"
                min={0}
                value={form.bpl_id ?? ''}
                onChange={(e) =>
                  set('bpl_id', e.target.value === '' ? null : Number(e.target.value))
                }
              />
              {fieldError('bpl_id')}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {TEXT_FIELDS.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label htmlFor={`rt-${f.name}`}>{f.label}</Label>
                <Input
                  id={`rt-${f.name}`}
                  maxLength={f.max}
                  value={form[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                />
                {f.help && <p className="text-[11px] text-muted-foreground">{f.help}</p>}
                {fieldError(f.name)}
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="rt-grouping">GRPO grouping</Label>
              <NativeSelect
                id="rt-grouping"
                value={form.grpo_grouping}
                onChange={(e) => set('grpo_grouping', e.target.value as GrpoGrouping)}
              >
                {(
                  options?.groupings ?? [
                    { value: 'NONE', label: 'One GRPO per voucher' },
                    { value: 'GATE_NO', label: 'One GRPO per bill date + G.no.' },
                    { value: 'BILL_NO', label: 'One GRPO per bill date + bill no.' },
                  ]
                ).map((g) => (
                  <SelectOption key={g.value} value={g.value}>
                    {g.label}
                  </SelectOption>
                ))}
              </NativeSelect>
              {fieldError('grpo_grouping')}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rt-cutover">Cut-over date</Label>
              <Input
                id="rt-cutover"
                type="date"
                value={form.cutover_date ?? ''}
                onChange={(e) => set('cutover_date', e.target.value || null)}
              />
              <p className="text-[11px] text-muted-foreground">
                Bills dated before it are skipped: they were keyed into SAP by hand.
              </p>
              {fieldError('cutover_date')}
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="rt-ap"
                checked={form.ap_drafts_enabled}
                onChange={(v) => set('ap_drafts_enabled', v)}
              />
              <Label htmlFor="rt-ap">Make A/P invoice drafts</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="rt-attach"
                checked={form.grpo_needs_attachment}
                onChange={(v) => set('grpo_needs_attachment', v)}
              />
              <Label htmlFor="rt-attach">A GRPO needs a bill photo</Label>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
