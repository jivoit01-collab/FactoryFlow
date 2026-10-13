import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Checkbox,
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
} from '@/shared/components/ui';
import { getErrorMessage, getFieldErrors } from '@/shared/utils';

import { useSaveGLMapRow } from '../api';
import type { CashSapOptions, GLItemMapPayload, GLItemMapRow, HeadTreatment } from '../types';
import { SapItemPicker } from './SapItemPicker';

interface GLMapEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null with `open` = a new mapping. */
  row: GLItemMapRow | null;
  options: CashSapOptions | undefined;
  /** Pre-selects the company of a new row (the filter on the settings page). */
  defaultCompany?: string;
}

const HEAD_TREATMENTS: { value: HeadTreatment; label: string }[] = [
  { value: 'ITEM', label: 'Goods — GRPO against the imprest PO' },
  { value: 'SERVICE', label: 'Service — A/P service line' },
  { value: 'NEVER', label: 'Never posted' },
];

/**
 * What one cash-book G/L head becomes in one SAP company: goods (with the SAP
 * item its GRPO line uses), a service line, or never posted -- and, for a
 * company other than the cash book's own, the account in that company's chart
 * (`target_account_code`; Oil's codes are not valid in Beverages or Mart).
 *
 * The server checks the item and the account in SAP when SAP answers, and
 * saves with a warning when it does not; the warnings are shown as toasts.
 */
export function GLMapEditDialog(props: GLMapEditDialogProps) {
  if (!props.open) return null;
  return <GLMapForm {...props} />;
}

function GLMapForm({ onOpenChange, row, options, defaultCompany }: GLMapEditDialogProps) {
  const [company, setCompany] = useState(row?.sap_company_code ?? defaultCompany ?? '');
  const [glCode, setGlCode] = useState(row?.gl_account_code ?? '');
  const [glName, setGlName] = useState(row?.gl_account_name ?? '');
  const [target, setTarget] = useState(row?.target_account_code ?? '');
  const [treatment, setTreatment] = useState<HeadTreatment>(row?.treatment ?? 'SERVICE');
  const [itemCode, setItemCode] = useState(row?.item_code ?? '');
  const [itemName, setItemName] = useState(row?.item_name ?? '');
  const [dim3, setDim3] = useState(row?.ocr_code3 ?? '');
  const [needsReview, setNeedsReview] = useState(row?.needs_review ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveGLMapRow();

  const home = options?.home_company ?? '';
  const otherCompany = !!company && !!home && company !== home;
  const problem = !company
    ? 'Choose the SAP company.'
    : !glCode.trim()
      ? 'Give the G/L code as the cash book records it.'
      : treatment === 'ITEM' && !itemCode
        ? 'A goods head needs the SAP item its GRPO line uses.'
        : '';

  async function submit() {
    const payload: GLItemMapPayload = {
      sap_company_code: company,
      gl_account_code: glCode.trim(),
      gl_account_name: glName.trim(),
      target_account_code: target.trim(),
      treatment,
      item_code: treatment === 'ITEM' ? itemCode : '',
      item_name: treatment === 'ITEM' ? itemName : '',
      ocr_code3: dim3.trim(),
      needs_review: needsReview,
    };
    try {
      const result = await save.mutateAsync({ rowId: row?.id, payload });
      for (const warning of result.warnings ?? []) toast.warning(warning);
      toast.success(`${result.row.gl_account_code} → ${result.row.sap_company_code} saved`);
      onOpenChange(false);
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, 'The mapping could not be saved.'));
    }
  }

  const fieldError = (name: string) =>
    errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{row ? `G/L ${row.gl_account_code} → SAP` : 'Map a G/L head'}</DialogTitle>
          <DialogDescription>
            What vouchers under this head become in the SAP company. A voucher can still be changed
            one at a time from its bunch&apos;s SAP page.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gl-company">SAP company</Label>
              <NativeSelect
                id="gl-company"
                value={company}
                disabled={!!row}
                onChange={(e) => setCompany(e.target.value)}
              >
                <SelectOption value="">Choose…</SelectOption>
                {(options?.sap_companies ?? []).map((code) => (
                  <SelectOption key={code} value={code}>
                    {code}
                  </SelectOption>
                ))}
              </NativeSelect>
              {fieldError('sap_company_code')}
            </div>
            <div className="space-y-1">
              <Label htmlFor="gl-treatment">Treatment</Label>
              <NativeSelect
                id="gl-treatment"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value as HeadTreatment)}
              >
                {(options?.head_treatments ?? HEAD_TREATMENTS).map((t) => (
                  <SelectOption key={t.value} value={t.value}>
                    {t.label}
                  </SelectOption>
                ))}
              </NativeSelect>
              {fieldError('treatment')}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gl-code">Cash book G/L code</Label>
              <Input
                id="gl-code"
                maxLength={32}
                value={glCode}
                disabled={!!row}
                onChange={(e) => setGlCode(e.target.value)}
              />
              {fieldError('gl_account_code')}
            </div>
            <div className="space-y-1">
              <Label htmlFor="gl-name">G/L name</Label>
              <Input
                id="gl-name"
                maxLength={255}
                value={glName}
                placeholder="Filled from SAP when blank"
                onChange={(e) => setGlName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="gl-target">Account in {company || 'the SAP company'}</Label>
            <Input
              id="gl-target"
              maxLength={32}
              value={target}
              placeholder={
                otherCompany ? 'Required to send to this company' : 'Blank: the same code'
              }
              onChange={(e) => setTarget(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {otherCompany
                ? `${glCode || 'This'} is ${home}'s account. Without a ${company} account here, a voucher sent to ${company} is blocked (GL_NOT_IN_TARGET).`
                : 'Only needed when the home company posts the head to a different account.'}
            </p>
            {fieldError('target_account_code')}
          </div>
          {treatment === 'ITEM' && (
            <div className="space-y-1">
              <Label htmlFor="gl-item">SAP item</Label>
              <SapItemPicker
                id="gl-item"
                sapCompanyCode={company}
                value={itemCode}
                valueName={itemName}
                onChange={(code, name) => {
                  setItemCode(code);
                  setItemName(name);
                }}
              />
              {fieldError('item_code')}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gl-dim3">Dim3 (budget head)</Label>
              <Input
                id="gl-dim3"
                maxLength={30}
                value={dim3}
                placeholder="Blank: the routing's"
                onChange={(e) => setDim3(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="gl-review"
                checked={needsReview}
                onCheckedChange={setNeedsReview}
                aria-label="Needs review"
              />
              <Label htmlFor="gl-review">The head covers several items — check each voucher</Label>
            </div>
          </div>
          {problem && <p className="text-xs text-muted-foreground">{problem}</p>}
        </DialogBody>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={save.isPending || !!problem}>
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
