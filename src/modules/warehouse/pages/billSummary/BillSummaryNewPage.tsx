import { AlertTriangle, ArrowLeft, FileText, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { type BillLookup, useBillLookup, useGenerateBillSummary } from '../../api';

function num(value: string | number, dp = 0): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
    : '0';
}

interface FormState {
  dispatch_date: string;
  bilty_no: string;
  bilty_date: string;
  transporter_name: string;
  vehicle_no: string;
  driver_name: string;
  driver_mobile: string;
  remarks: string;
}

const EMPTY: FormState = {
  dispatch_date: '',
  bilty_no: '',
  bilty_date: '',
  transporter_name: '',
  vehicle_no: '',
  driver_name: '',
  driver_mobile: '',
  remarks: '',
};

function fromLookup(lookup: BillLookup): FormState {
  const p = lookup.prefill;
  return {
    dispatch_date: p.dispatch_date?.slice(0, 10) ?? '',
    bilty_no: p.bilty_no ?? '',
    bilty_date: p.bilty_date?.slice(0, 10) ?? '',
    transporter_name: p.transporter_name ?? '',
    vehicle_no: p.vehicle_no ?? '',
    driver_name: p.driver_name ?? '',
    driver_mobile: p.driver_mobile ?? '',
    remarks: '',
  };
}

/**
 * Generate a bill summary for one bill.
 *
 * Search the bill number; the app fills in everything the dispatch module
 * already knows; the user supplies the rest. In practice that is the bilty,
 * which is raised once the truck is loaded and so is not yet known here — and
 * SAP will not take the posting without one, which is why it is marked required
 * rather than merely nagged about later.
 */
export default function BillSummaryNewPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data: lookup, isFetching, isError, error } = useBillLookup(submitted);
  const generate = useGenerateBillSummary();

  // The form is DERIVED from the lookup, with the user's edits laid over it,
  // rather than copied into state by an effect. Copying would mean a render with
  // the previous bill's values still showing, and the edits are tagged with the
  // bill they belong to so a second search starts clean instead of inheriting
  // half of the first bill's details.
  const [edits, setEdits] = useState<{ docEntry: number | null; values: Partial<FormState> }>(
    { docEntry: null, values: {} },
  );
  const base = lookup ? fromLookup(lookup) : EMPTY;
  const editsApply = lookup != null && edits.docEntry === lookup.doc_entry;
  const form: FormState = editsApply ? { ...base, ...edits.values } : base;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setEdits((prev) => ({
      docEntry: lookup?.doc_entry ?? null,
      values:
        lookup != null && prev.docEntry === lookup.doc_entry
          ? { ...prev.values, [key]: value }
          : { [key]: value },
    }));
  }

  async function handleGenerate() {
    if (!lookup) return;
    try {
      const summary = await generate.mutateAsync({
        sap_invoice_doc_entry: lookup.doc_entry,
        sap_invoice_doc_num: lookup.doc_num,
        dispatch_date: form.dispatch_date,
        bilty_no: form.bilty_no.trim(),
        bilty_date: form.bilty_date || null,
        transporter_name: form.transporter_name,
        vehicle_no: form.vehicle_no,
        driver_name: form.driver_name,
        driver_mobile: form.driver_mobile,
        remarks: form.remarks,
      });
      toast.success(`${summary.entry_no} generated for bill ${summary.sap_invoice_doc_num}`);
      navigate(`/warehouse/bill-summaries/${summary.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not generate the bill summary.'));
    }
  }

  const ready = Boolean(lookup && form.dispatch_date && form.bilty_no.trim());

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DashboardHeader
        title="New Bill Summary"
        description="Search a bill, confirm the details, generate the sheet for the floor"
      >
        <Button variant="outline" onClick={() => navigate('/warehouse/bill-summaries')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </DashboardHeader>

      <Card>
        <CardContent className="p-6">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(search.trim());
            }}
          >
            <div className="min-w-[220px] flex-1 space-y-1">
              <Label htmlFor="bill-number">Bill number</Label>
              <Input
                id="bill-number"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. 626080596"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={!search.trim() || isFetching}>
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Find bill
            </Button>
          </form>
          {isError && (
            <p className="mt-3 text-sm text-red-600">
              {getErrorMessage(error, 'Could not find that bill.')}
            </p>
          )}
        </CardContent>
      </Card>

      {lookup && (
        <>
          {lookup.existing_summary && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
              <span>
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                {lookup.existing_summary} already covers this bill.
              </span>
              {lookup.existing_summary_id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(`/warehouse/bill-summaries/${lookup.existing_summary_id}`)
                  }
                >
                  Open it
                </Button>
              )}
            </div>
          )}

          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-4">
              <Field label="Bill" value={lookup.doc_num} />
              <Field label="Bill date" value={lookup.doc_date?.slice(0, 10) ?? '—'} />
              <Field
                label="Customer"
                value={lookup.customer_name || lookup.customer_code || '—'}
              />
              <Field label="Warehouse" value={lookup.warehouse_codes.join(', ') || '—'} />
              {!lookup.has_plan && (
                <p className="sm:col-span-4 text-xs text-amber-700 dark:text-amber-400">
                  This bill has no dispatch plan, so nothing could be prefilled — everything
                  below has to be entered by hand.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                Dispatch details
                {lookup.missing.length > 0 && (
                  <Badge variant="outline" className="border-amber-400 text-amber-700">
                    {lookup.missing.length} to fill in
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Editable
                  id="f-dispatch-date"
                  label="Dispatch date *"
                  type="date"
                  value={form.dispatch_date}
                  missing={lookup.missing.includes('dispatch_date')}
                  onChange={(v) => set('dispatch_date', v)}
                />
                <Editable
                  id="f-bilty-no"
                  label="Bilty number *"
                  value={form.bilty_no}
                  missing={lookup.missing.includes('bilty_no')}
                  hint="SAP will not accept the posting without this"
                  onChange={(v) => set('bilty_no', v)}
                />
                <Editable
                  id="f-bilty-date"
                  label="Bilty date"
                  type="date"
                  value={form.bilty_date}
                  onChange={(v) => set('bilty_date', v)}
                />
                <Editable
                  id="f-transporter"
                  label="Transporter"
                  value={form.transporter_name}
                  onChange={(v) => set('transporter_name', v)}
                />
                <Editable
                  id="f-vehicle"
                  label="Vehicle"
                  value={form.vehicle_no}
                  onChange={(v) => set('vehicle_no', v)}
                />
                <Editable
                  id="f-driver"
                  label="Driver"
                  value={form.driver_name}
                  onChange={(v) => set('driver_name', v)}
                />
                <Editable
                  id="f-mobile"
                  label="Driver mobile"
                  value={form.driver_mobile}
                  onChange={(v) => set('driver_mobile', v)}
                />
                <div className="sm:col-span-2">
                  <Editable
                    id="f-remarks"
                    label="Remarks"
                    value={form.remarks}
                    onChange={(v) => set('remarks', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-6">
              <div className="text-sm font-semibold">
                Lines on this bill ({lookup.lines.length})
              </div>
              <div className="space-y-1">
                {lookup.lines.map((line) => (
                  <div
                    key={line.sap_line_num}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <span className="min-w-0">
                      <strong>{line.item_code}</strong> {line.item_name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {num(line.invoice_qty, 2)} {line.uom} ·{' '}
                      {Number(line.pcs_per_box) > 0 ? `${num(line.boxes, 2)} box` : 'loose'} ·{' '}
                      {num(line.litres, 2)} L · {line.warehouse_code}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={!ready || generate.isPending}>
              {generate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Generate &amp; post to SAP
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Editable({
  id,
  label,
  value,
  onChange,
  type = 'text',
  missing = false,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  missing?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={missing ? 'text-amber-700 dark:text-amber-400' : ''}>
        {label}
        {/* Marked where the app could not fill it, so the gap is obvious before
            SAP has a chance to refuse it. */}
        {missing && ' — not on the plan'}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={missing && !value ? 'border-amber-400' : ''}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
