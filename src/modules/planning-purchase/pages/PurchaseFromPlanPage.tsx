/**
 * Raise purchase orders from a plan's bill of materials.
 *
 * The chain, all read live from SAP: plan quantity per SKU, exploded through the
 * production BOM, netted against free stock and what is already on open purchase
 * orders. What is left is the shortage, and the shortage is what you can buy.
 *
 * Three things this screen refuses to do, because each one has produced a wrong
 * answer on live data:
 *   - offer a conversion cost as a material (filling and blowing costs are `ITT1`
 *     resource lines, not items anybody sells),
 *   - cost a requirement off the last purchase-order price (bulk oil is bought by
 *     the ton and consumed by the litre),
 *   - let a line be ordered without a supplier — SAP cannot take one.
 */
import { ArrowLeft, Download, RefreshCw, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useCreatePurchaseOrders,
  useExportRequirement,
  useRequirement,
  useWarehouses,
} from '../api';
import type { RequirementDrill } from '../components';
import {
  CommitmentDialog,
  moneyShort,
  RequirementCaveats,
  RequirementHeadline,
  RequirementTable,
  toNumber,
  WarehouseScopeNote,
} from '../components';
import { MATERIAL_TYPE_LABEL } from '../constants';
import type { MaterialType, PurchaseOrderLineInput, RequirementRow } from '../types';

export default function PurchaseFromPlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const absId = Number(planId);
  const navigate = useNavigate();

  const [materialType, setMaterialType] = useState<MaterialType | ''>('');
  const [shortagesOnly, setShortagesOnly] = useState(true);
  // Set by a headline card. Kept beside the two manual filters rather than
  // duplicating them, so a card and the filter row can never disagree about what
  // the table is showing.
  const [extra, setExtra] = useState<RequirementDrill['extra']>('NONE');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [vendorOverrides, setVendorOverrides] = useState<Record<string, string>>({});
  const [dueDate, setDueDate] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [remarks, setRemarks] = useState('');
  // Which committed figure the reader asked about. Undefined keeps the dialog
  // shut and its query disabled, so opening the table fires no extra requests.
  const [commitment, setCommitment] = useState<
    { itemCode: string; warehouse: string } | undefined
  >();

  const filters = useMemo(
    () => ({
      material_type: materialType || undefined,
      include_covered: !shortagesOnly,
    }),
    [materialType, shortagesOnly],
  );

  const requirement = useRequirement(absId || undefined, filters);
  const warehouses = useWarehouses();
  const createOrders = useCreatePurchaseOrders();
  const exportRequirement = useExportRequirement();

  // Memoised off `requirement.data` rather than a `?? []` fallback: the fallback
  // is a fresh array every render, which would rebuild the lookup map — and
  // re-derive every selection below it — on each keystroke in the table.
  const allRows = useMemo(() => requirement.data?.data ?? [], [requirement.data]);

  // The two narrowings the server filters cannot express, applied here so a card
  // click needs no extra request.
  const rows = useMemo(() => {
    if (extra === 'NO_LEAD_TIME') {
      return allRows.filter((row) => row.lead_time_days === null);
    }
    if (extra === 'BY_VALUE') {
      return [...allRows].sort(
        (a, b) => toNumber(b.estimated_value) - toNumber(a.estimated_value),
      );
    }
    return allRows;
  }, [allRows, extra]);
  const rowsByCode = useMemo(
    () => new Map(rows.map((row) => [row.component_code, row])),
    [rows],
  );

  const toggle = (code: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const toggleAll = (codes: string[], select: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      codes.forEach((code) => (select ? next.add(code) : next.delete(code)));
      return next;
    });

  const selectedRows = useMemo(
    () =>
      Array.from(selected)
        .map((code) => rowsByCode.get(code))
        .filter((row): row is RequirementRow => Boolean(row)),
    [selected, rowsByCode],
  );

  const resolveVendor = (row: RequirementRow) =>
    vendorOverrides[row.component_code] ?? row.vendor_code;

  const resolveQty = (row: RequirementRow) =>
    overrides[row.component_code] ?? row.suggested_order_qty;

  // A line with no supplier cannot be sent to SAP at all, so the button says so
  // up front rather than letting the request fail after the click.
  const missingVendor = selectedRows.filter((row) => !resolveVendor(row));
  const invalidQty = selectedRows.filter((row) => toNumber(resolveQty(row)) <= 0);

  const selectedValue = selectedRows.reduce(
    (sum, row) => sum + toNumber(resolveQty(row)) * toNumber(row.unit_price),
    0,
  );
  const vendorCount = new Set(
    selectedRows.map((row) => resolveVendor(row)).filter(Boolean),
  ).size;

  const canSubmit =
    selectedRows.length > 0 &&
    !missingVendor.length &&
    !invalidQty.length &&
    !createOrders.isPending;

  const submit = () => {
    const plan = requirement.data?.plan;
    const lines: PurchaseOrderLineInput[] = selectedRows.map((row) => ({
      item_code: row.component_code,
      item_name: row.component_name,
      item_group: row.item_group,
      material_type: row.material_type,
      uom: row.uom,
      vendor_code: resolveVendor(row),
      quantity: resolveQty(row),
      unit_price: row.unit_price,
      warehouse_code: warehouse || row.issue_warehouse,
      required_date: row.need_by_date,
      // Snapshot of why this quantity, so the approver can check rather than believe.
      required_qty: row.required_qty,
      available_qty: row.net_available_qty,
      on_order_qty: row.on_order_qty,
      shortage_qty: row.shortage_qty,
      moq_applied: row.moq_applied,
    }));

    createOrders.mutate(
      {
        plan_abs_id: plan?.abs_id ?? null,
        plan_code: plan?.code ?? '',
        plan_name: plan?.name ?? '',
        doc_due_date: dueDate || null,
        warehouse_code: warehouse,
        remarks,
        lines,
      },
      {
        onSuccess: () => {
          setSelected(new Set());
          setOverrides({});
          navigate('/planning-purchase/purchase-orders');
        },
      },
    );
  };

  if (requirement.isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <DashboardHeader
          title="Purchase from plan"
          description="Exploding the plan's bill of materials and reading stock from SAP…"
        />
        <p className="mt-4 text-xs text-muted-foreground">
          This reads every BOM on the plan plus stock and open purchase orders for
          every component, so it takes a few seconds.
        </p>
      </div>
    );
  }

  if (requirement.isError || !requirement.data) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <DashboardHeader title="Purchase from plan" />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive">
              {getErrorMessage(requirement.error, 'Could not build the requirement.')}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/planning-purchase">Back to plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { plan, meta, resources } = requirement.data;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Purchase from plan"
        description={`${plan.code || `Plan ${plan.abs_id}`} — what the plan consumes, what is available, and what has to be bought.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/planning-purchase/plans/${plan.abs_id}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Plan
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportRequirement.mutate({ absId, planCode: plan.code, filters })
            }
            disabled={exportRequirement.isPending}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void requirement.refetch()}
            disabled={requirement.isFetching}
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', requirement.isFetching && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </DashboardHeader>

      <RequirementHeadline
        meta={meta}
        drill={{ materialType, shortagesOnly, extra }}
        onDrill={(next) => {
          setMaterialType(next.materialType);
          setShortagesOnly(next.shortagesOnly);
          setExtra(next.extra);
          // A narrower table invalidates a selection made against a wider one.
          setSelected(new Set());
        }}
      />
      <RequirementCaveats meta={meta} />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-1">
          {([
            { value: '' as const, label: 'All materials' },
            { value: 'PACKAGING' as const, label: MATERIAL_TYPE_LABEL.PACKAGING },
            { value: 'RAW' as const, label: MATERIAL_TYPE_LABEL.RAW },
            { value: 'OTHER' as const, label: MATERIAL_TYPE_LABEL.OTHER },
          ]).map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => {
                setMaterialType(option.value);
                setExtra('NONE');
              }}
              className={cn(
                'rounded border px-3 py-1.5 text-xs transition-colors',
                materialType === option.value
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={shortagesOnly}
            onChange={(event) => {
              setShortagesOnly(event.target.checked);
              setExtra('NONE');
            }}
            className="h-3.5 w-3.5"
          />
          Shortages only
        </label>

        {extra !== 'NONE' ? (
          <button
            type="button"
            onClick={() => setExtra('NONE')}
            className="rounded border border-primary bg-primary/10 px-2 py-1 text-xs text-primary"
          >
            {extra === 'NO_LEAD_TIME' ? 'No lead time on file' : 'Dearest first'} ×
          </button>
        ) : null}

        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} component{rows.length === 1 ? '' : 's'}
          {rows.length !== allRows.length ? ` of ${allRows.length}` : ''}
        </span>
      </div>

      <RequirementTable
        rows={rows}
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        overrides={overrides}
        onOverride={(code, value) =>
          setOverrides((previous) => ({ ...previous, [code]: value }))
        }
        onShowCommitments={(itemCode, warehouse) =>
          setCommitment({ itemCode, warehouse })
        }
      />

      <CommitmentDialog
        itemCode={commitment?.itemCode}
        warehouse={commitment?.warehouse}
        onClose={() => setCommitment(undefined)}
      />

      {/* Suppliers can be missing — the item master carries none for any purchase
          item in this company — so any selected line without one gets an inline
          picker here rather than a failed request. */}
      {missingVendor.length ? (
        <Card className="border-amber-500/40">
          <CardContent className="space-y-3 pt-5">
            <p className="text-sm font-medium">
              {missingVendor.length} selected material
              {missingVendor.length === 1 ? '' : 's'} have no supplier on file
            </p>
            <p className="text-xs text-muted-foreground">
              SAP cannot take a purchase order without a business partner. Pick one
              per line, or deselect it.
            </p>
            <div className="space-y-2">
              {missingVendor.map((row) => (
                <div
                  key={row.component_code}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <span className="w-32 shrink-0 font-mono">{row.component_code}</span>
                  <span className="flex-1 truncate text-muted-foreground">
                    {row.component_name}
                  </span>
                  <Input
                    value={vendorOverrides[row.component_code] ?? ''}
                    onChange={(event) =>
                      setVendorOverrides((previous) => ({
                        ...previous,
                        [row.component_code]: event.target.value.trim(),
                      }))
                    }
                    placeholder="Vendor code e.g. VENDA000021"
                    className="h-8 w-64 font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {resources.length ? (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold">Conversion costs this plan incurs</h3>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Resource lines on the BOM — filling, blowing and job work. Real cost, but
              not a material anybody sells, so they are never offered for purchase.
            </p>
            <div className="overflow-x-auto rounded border">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="bg-muted/50 uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Resource</th>
                    <th className="px-3 py-2 text-right font-medium">Units</th>
                    <th className="px-3 py-2 text-right font-medium">On SKUs</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource.resource_code} className="border-t">
                      <td className="px-3 py-2">
                        <span className="font-mono">{resource.resource_code}</span>
                        <div className="text-muted-foreground">{resource.resource_name}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {Number(resource.required_qty).toLocaleString('en-IN', {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {resource.used_by_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* The order bar. Sticky, because the table is long and the decision is
          made while scrolling it. */}
      {selectedRows.length ? (
        <Card className="sticky bottom-4 border-primary/40 shadow-lg">
          <CardContent className="space-y-3 pt-5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-sm font-semibold">
                {selectedRows.length} material{selectedRows.length === 1 ? '' : 's'} selected
              </p>
              <p className="text-xs text-muted-foreground">
                {vendorCount} supplier{vendorCount === 1 ? '' : 's'} — one draft order each
              </p>
              <p className="ml-auto text-sm font-semibold tabular-nums">
                {moneyShort(selectedValue)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="pp-due" className="text-xs">
                  Delivery date
                </Label>
                <Input
                  id="pp-due"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label htmlFor="pp-wh" className="text-xs">
                  Receiving warehouse
                </Label>
                <NativeSelect
                  id="pp-wh"
                  value={warehouse}
                  onChange={(event) => setWarehouse(event.target.value)}
                  className="mt-1 h-9"
                >
                  <SelectOption value="">Use each BOM&apos;s issue warehouse</SelectOption>
                  {(warehouses.data ?? []).map((option) => (
                    <SelectOption key={option.warehouse_code} value={option.warehouse_code}>
                      {option.warehouse_code} — {option.warehouse_name}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="pp-remarks" className="text-xs">
                  Remarks
                </Label>
                <Textarea
                  id="pp-remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={1}
                  className="mt-1 min-h-9"
                  placeholder="Goes onto the SAP document"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={submit} disabled={!canSubmit}>
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                {createOrders.isPending
                  ? 'Creating…'
                  : `Create ${vendorCount || 1} draft order${vendorCount === 1 ? '' : 's'}`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(new Set());
                  setOverrides({});
                }}
              >
                Clear selection
              </Button>

              {invalidQty.length ? (
                <p className="text-xs text-destructive">
                  {invalidQty.length} line{invalidQty.length === 1 ? '' : 's'} have a
                  quantity of zero — set one or deselect.
                </p>
              ) : null}

              <p className="ml-auto text-xs text-muted-foreground">
                Creates drafts only. Approving and posting to SAP are separate steps,
                each with its own permission.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-1 text-xs text-muted-foreground">
        {meta.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <WarehouseScopeNote
          scope={meta.warehouse_scope}
          filtered={meta.warehouse_filtered}
        />
      </div>
    </div>
  );
}
