import { Loader2, Save, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useOverrideVoucher, useUpdateVoucherInfo, useVoucherSapInfo } from '../api';
import type {
  CashSapOptions,
  VoucherOverridePayload,
  VoucherSapInfo,
  VoucherSapPlan,
} from '../types';
import { money, TREATMENT_LABELS } from '../utils/status';
import {
  checkVoucherDates,
  fmt,
  humanDate,
  today,
  voucherDateWarnings,
} from '../utils/voucherDates';
import { DateWarningList } from './ProblemList';
import { SapItemPicker } from './SapItemPicker';

interface VoucherSapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bunchId: number;
  voucher: VoucherSapPlan | null;
  options: CashSapOptions | undefined;
  /**
   * `full`: the poster -- how the voucher posts (company, treatment, item,
   * Dim1, Dim3, note) and its bill facts, through the override endpoint.
   * `info`: the custodian -- the bill facts alone, through `vouchers/<e>/info/`.
   */
  mode: 'full' | 'info';
}

/**
 * "Edit for SAP": one voucher's posting overrides and the bill's own facts.
 *
 * The bill date, G.no. and supplier bill no. live in `cash_sap`
 * (`VoucherSapInfo`), not in the cash book, on this branch: the cash book's
 * entry dialog is not edited, and an APPROVED voucher is locked there. They
 * are posting data -- the GRPO's TaxDate, NumAtCard and Dim2 come from the
 * bill date -- so they are written here, until the voucher's document is
 * committed.
 *
 * Only what the user changed is sent. An override set to "as routed / as
 * mapped" sends an empty string, which is how the backend clears one.
 */
export function VoucherSapDialog(props: VoucherSapDialogProps) {
  if (!props.open || !props.voucher) return null;
  return <VoucherSapLoader {...props} voucher={props.voucher} />;
}

function VoucherSapLoader(props: VoucherSapDialogProps & { voucher: VoucherSapPlan }) {
  const { data: info, isLoading, isError } = useVoucherSapInfo(props.voucher.entry_id);
  return (
    <Dialog open onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            Voucher {props.voucher.serial_number ?? props.voucher.entry_id} for SAP
          </DialogTitle>
          <DialogDescription>
            {props.voucher.gl_account_name || props.voucher.gl_account_code} ·{' '}
            {money(props.voucher.amount)} · {props.voucher.branch_name || 'no branch'}
            {props.voucher.detail ? ` · ${props.voucher.detail}` : ''}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the bill details…
          </div>
        ) : isError || !info ? (
          <p className="py-6 text-sm text-destructive">
            The voucher&apos;s bill details could not be read. Close this and try again.
          </p>
        ) : (
          <VoucherSapForm {...props} info={info} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VoucherSapForm({
  onOpenChange,
  bunchId,
  voucher,
  options,
  mode,
  info,
}: VoucherSapDialogProps & { voucher: VoucherSapPlan; info: VoucherSapInfo }) {
  const full = mode === 'full';
  const initial = useMemo(
    () => ({
      bill_date: info.bill_date ?? '',
      gate_entry_no: info.gate_entry_no ?? '',
      supplier_bill_no: info.supplier_bill_no ?? '',
      sap_company_code: voucher.sap_company_code ?? '',
      treatment:
        voucher.treatment === 'ITEM' ||
        voucher.treatment === 'SERVICE' ||
        voucher.treatment === 'SKIP'
          ? voucher.treatment
          : '',
      item_code: voucher.item_code ?? '',
      ocr_code: voucher.ocr_code ?? '',
      ocr_code3: voucher.ocr_code3 ?? '',
      note: '',
    }),
    [info, voucher],
  );

  const [billDate, setBillDate] = useState(initial.bill_date);
  const [gateNo, setGateNo] = useState(initial.gate_entry_no);
  const [billNo, setBillNo] = useState(initial.supplier_bill_no);
  const [company, setCompany] = useState(initial.sap_company_code);
  const [treatment, setTreatment] = useState<string>(initial.treatment);
  const [itemCode, setItemCode] = useState(initial.item_code);
  const [itemName, setItemName] = useState(voucher.item_name ?? '');
  const [dim1, setDim1] = useState(initial.ocr_code);
  const [dim3, setDim3] = useState(initial.ocr_code3);
  const [note, setNote] = useState('');

  const override = useOverrideVoucher(bunchId);
  const updateInfo = useUpdateVoucherInfo();
  const saving = override.isPending || updateInfo.isPending;

  const now = today();
  const entryDate = voucher.entry_date ?? '';
  const refusal = checkVoucherDates(null, billDate || null, now).bill_date;
  // The plan's own rule 20 leaves the age warning out: the backlog is old by design.
  const warnings = voucherDateWarnings(entryDate, billDate || null, {
    today: now,
    includeAge: false,
  });

  /** Only the fields the user changed. */
  function changes(): VoucherOverridePayload {
    const out: VoucherOverridePayload = {};
    if (billDate !== initial.bill_date) out.bill_date = billDate || null;
    if (gateNo.trim() !== initial.gate_entry_no) out.gate_entry_no = gateNo.trim();
    if (billNo.trim() !== initial.supplier_bill_no) out.supplier_bill_no = billNo.trim();
    if (!full) return out;
    if (company !== initial.sap_company_code) out.sap_company_code = company;
    if (treatment !== initial.treatment)
      out.treatment = treatment as VoucherOverridePayload['treatment'];
    if (itemCode !== initial.item_code) out.item_code = itemCode;
    if (dim1.trim() !== initial.ocr_code) out.ocr_code = dim1.trim();
    if (dim3.trim() !== initial.ocr_code3) out.ocr_code3 = dim3.trim();
    if (note.trim()) out.note = note.trim();
    return out;
  }

  async function save(payload: VoucherOverridePayload, done: string) {
    if (Object.keys(payload).length === 0) {
      toast.info('Nothing was changed.');
      return;
    }
    if (refusal) {
      toast.error(refusal);
      return;
    }
    try {
      if (full) {
        await override.mutateAsync({ entryId: voucher.entry_id, payload });
      } else {
        const answer = await updateInfo.mutateAsync({ entryId: voucher.entry_id, payload });
        for (const w of answer.warnings ?? []) toast.warning(w.message);
      }
      toast.success(done);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The voucher could not be changed.'));
    }
  }

  function clearOverrides() {
    void save(
      { sap_company_code: '', treatment: '', item_code: '', ocr_code: '', ocr_code3: '', note: '' },
      'Back to the routing and the G/L map',
    );
  }

  const effectiveTreatment = treatment || voucher.treatment;

  return (
    <>
      <DialogBody className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">The bill</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="vsd-bill-date">Bill date</Label>
              <Input
                id="vsd-bill-date"
                type="date"
                max={now}
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {billDate
                  ? humanDate(billDate)
                  : `Leave blank if same as voucher date (${entryDate ? fmt(entryDate) : '—'})`}
              </p>
              {refusal && <p className="text-xs text-destructive">{refusal}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="vsd-gate-no">G.no.</Label>
              <Input
                id="vsd-gate-no"
                maxLength={30}
                value={gateNo}
                onChange={(e) => setGateNo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vsd-bill-no">Supplier bill no.</Label>
              <Input
                id="vsd-bill-no"
                maxLength={60}
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </div>
          </div>
          <DateWarningList warnings={warnings} />
          <p className="text-xs text-muted-foreground">
            Voucher date {entryDate ? humanDate(entryDate) : '—'}. The GRPO&apos;s tax date, its
            vendor reference and Dim2 (the month) all come from the bill date.
          </p>
        </section>

        {full && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">How it posts</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="vsd-company">SAP company</Label>
                <NativeSelect
                  id="vsd-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                >
                  <SelectOption value="">As the branch&apos;s routing says</SelectOption>
                  {(options?.sap_companies ?? []).map((code) => (
                    <SelectOption key={code} value={code}>
                      {code}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="vsd-treatment">Treatment</Label>
                <NativeSelect
                  id="vsd-treatment"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                >
                  <SelectOption value="">As the G/L map says</SelectOption>
                  {(
                    options?.treatments ?? [
                      { value: 'ITEM', label: TREATMENT_LABELS.ITEM },
                      { value: 'SERVICE', label: TREATMENT_LABELS.SERVICE },
                      { value: 'SKIP', label: TREATMENT_LABELS.SKIP },
                    ]
                  ).map((t) => (
                    <SelectOption key={t.value} value={t.value}>
                      {t.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
                <p className="text-xs text-muted-foreground">
                  Now: {TREATMENT_LABELS[voucher.treatment] ?? voucher.treatment}
                  {voucher.treatment_source ? ` (${voucher.treatment_source.toLowerCase()})` : ''}
                </p>
              </div>
            </div>
            {effectiveTreatment === 'ITEM' && (
              <div className="space-y-1">
                <Label htmlFor="vsd-item">SAP item</Label>
                <SapItemPicker
                  id="vsd-item"
                  sapCompanyCode={company || voucher.sap_company_code}
                  value={itemCode}
                  valueName={itemCode === initial.item_code ? voucher.item_name : itemName}
                  onChange={(code, name) => {
                    setItemCode(code);
                    setItemName(name);
                  }}
                />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="vsd-dim1">Dim1 (department)</Label>
                <Input
                  id="vsd-dim1"
                  maxLength={30}
                  value={dim1}
                  onChange={(e) => setDim1(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vsd-dim3">Dim3 (budget head)</Label>
                <Input
                  id="vsd-dim3"
                  maxLength={30}
                  value={dim3}
                  onChange={(e) => setDim3(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="vsd-note">Note</Label>
              <Textarea
                id="vsd-note"
                rows={2}
                maxLength={2000}
                value={note}
                placeholder="Why it posts differently -- shown when it is left out"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </section>
        )}
      </DialogBody>
      <DialogFooter className="gap-2">
        {full && voucher.overridden && (
          <Button variant="ghost" onClick={clearOverrides} disabled={saving} className="sm:mr-auto">
            <Undo2 className="mr-2 h-4 w-4" />
            Clear overrides
          </Button>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={() => void save(changes(), 'Saved for SAP')}
          disabled={saving || !!refusal}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
