import { ArrowRight, Check, Loader2, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAppSelector } from '@/core/store';
import { DriverSelect, VehicleSelect } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useBSTSapTransfers, useCreateBST } from '../../api';
import type { BSTCreatePayload, BSTSourceType, SAPStockTransfer } from '../../types';

const norm = (value?: string | null) => (value ?? '').trim().toLowerCase();

export default function BSTNewPage() {
  const navigate = useNavigate();

  // A BST is sourced from either a SAP stock transfer (intra-company) or an
  // invoice / dispatch bill (a cross-company sale, e.g. JIVO OIL → JIVO MART).
  const [documentType, setDocumentType] = useState<BSTSourceType>('STOCK_TRANSFER');
  const isInvoice = documentType === 'INVOICE';

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  // A BST entry can combine several SAP documents that share one route (source →
  // destination warehouse for a transfer; source warehouse + customer for an
  // invoice). The user searches and adds documents to this list.
  const [selectedDocs, setSelectedDocs] = useState<SAPStockTransfer[]>([]);
  const [destinationCompanyId, setDestinationCompanyId] = useState<number | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  // When the stock leaves on a vehicle it needs a gate-out, so we capture the
  // vehicle + driver and route it to the gate after the warehouse approves.
  const [onVehicle, setOnVehicle] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);

  // Destination options are the other companies the user belongs to (an invoice
  // transfer moves stock to a sibling company).
  const companies = useAppSelector((s) => s.auth.user?.companies ?? []);
  const currentCompanyId = useAppSelector((s) => s.auth.currentCompany?.company_id ?? null);
  const destinationOptions = useMemo(
    () => companies.filter((c) => c.company_id !== currentCompanyId),
    [companies, currentCompanyId],
  );

  const { data: transfers = [], isLoading: searching } = useBSTSapTransfers(
    submittedSearch,
    submittedSearch.length > 0,
    documentType,
  );
  const createMut = useCreateBST();

  // The route is fixed by the first added document; every other document must
  // match it.
  const route = selectedDocs[0] ?? null;
  const selectedEntries = useMemo(
    () => new Set(selectedDocs.map((d) => d.doc_entry)),
    [selectedDocs],
  );

  const sameRoute = (doc: SAPStockTransfer) => {
    if (!route) return true;
    if (isInvoice) {
      return doc.from_warehouse === route.from_warehouse && doc.card_code === route.card_code;
    }
    return doc.from_warehouse === route.from_warehouse && doc.to_warehouse === route.to_warehouse;
  };

  const routeLabel = (doc: SAPStockTransfer) =>
    isInvoice
      ? doc.card_name || doc.card_code || 'customer'
      : `${doc.from_warehouse} → ${doc.to_warehouse}`;

  const switchType = (next: BSTSourceType) => {
    if (next === documentType) return;
    setDocumentType(next);
    setSelectedDocs([]);
    setDestinationCompanyId(null);
    setSearch('');
    setSubmittedSearch('');
  };

  // Best-effort: pre-select the destination company by matching the invoice's
  // customer to one of the user's companies. The user can override it.
  const autoPickDestination = (doc: SAPStockTransfer) => {
    const code = norm(doc.card_code);
    const name = norm(doc.card_name);
    const match = destinationOptions.find((c) => {
      const cCode = norm(c.company_code);
      const cName = norm(c.company_name);
      return (
        (code && cCode === code) ||
        (name && cName && (name.includes(cName) || cName.includes(name)))
      );
    });
    if (match) setDestinationCompanyId(match.company_id);
  };

  const addDoc = (doc: SAPStockTransfer) => {
    if (selectedEntries.has(doc.doc_entry)) return;
    if (!sameRoute(doc)) {
      toast.error(
        isInvoice
          ? `Invoice #${doc.doc_num} (${routeLabel(doc)}, ${doc.from_warehouse}) doesn't match ` +
              `this entry's customer / source warehouse. All invoices must share one customer and source.`
          : `Doc #${doc.doc_num} is ${doc.from_warehouse} → ${doc.to_warehouse}, but this entry is ` +
              `${route?.from_warehouse} → ${route?.to_warehouse}. All documents must share one route.`,
      );
      return;
    }
    const first = selectedDocs.length === 0;
    setSelectedDocs((prev) => [...prev, doc]);
    if (isInvoice && first && destinationCompanyId === null) autoPickDestination(doc);
  };

  const removeDoc = (docEntry: number) =>
    setSelectedDocs((prev) => prev.filter((d) => d.doc_entry !== docEntry));

  const vehicleReady = !onVehicle || (vehicleId !== null && driverId !== null);
  const destinationReady = !isInvoice || destinationCompanyId !== null;
  const canCreate = selectedDocs.length > 0 && vehicleReady && destinationReady;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      const payload: BSTCreatePayload = {
        document_type: documentType,
        sap_doc_entries: selectedDocs.map((d) => d.doc_entry),
        invoice_no: invoiceNo,
        requires_gate: onVehicle,
        vehicle: onVehicle ? vehicleId : null,
        driver: onVehicle ? driverId : null,
      };
      if (isInvoice) payload.destination_company = destinationCompanyId;
      const transfer = await createMut.mutateAsync(payload);
      toast.success(`BST ${transfer.entry_no} created`);
      navigate(`/warehouse/bst/${transfer.id}/scan`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create the BST'));
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="New Branch Stock Transfer"
        description="Move stock against a SAP stock transfer (intra-company) or an invoice / dispatch bill (cross-company sale)"
      />

      {/* Step 1 — SAP source documents */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Document type */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Source document
            </Label>
            <div className="mt-1 inline-flex rounded-md border p-0.5">
              {(['STOCK_TRANSFER', 'INVOICE'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchType(t)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    documentType === t
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'STOCK_TRANSFER' ? 'Stock Transfer' : 'Invoice / Dispatch Bill'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>{isInvoice ? 'SAP Invoices' : 'SAP Stock Transfers'}</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder={
                  isInvoice
                    ? 'Search by invoice / document number or customer'
                    : 'Search by BST invoice / document number'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSubmittedSearch(search.trim())}
              />
              <Button variant="outline" onClick={() => setSubmittedSearch(search.trim())}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {searching ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Searching SAP…</p>
          ) : submittedSearch && transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No {isInvoice ? 'invoices' : 'stock transfers'} found
            </p>
          ) : transfers.length > 0 ? (
            <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
              {transfers.map((t) => {
                const added = selectedEntries.has(t.doc_entry);
                const mismatched = !added && !sameRoute(t);
                return (
                  <div
                    key={t.doc_entry}
                    className={`flex items-center gap-2 px-3 py-2 ${
                      added ? 'bg-primary/10' : mismatched ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="font-medium">
                          {isInvoice ? 'Invoice' : 'Doc'} #{t.doc_num}
                        </span>
                        <span className="truncate text-muted-foreground">{routeLabel(t)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.line_count} lines · {t.total_quantity} qty
                        {isInvoice && t.from_warehouse ? ` · from ${t.from_warehouse}` : ''}
                        {t.doc_date ? ` · ${new Date(t.doc_date).toLocaleDateString()}` : ''}
                        {mismatched ? (isInvoice ? ' · different customer/source' : ' · different route') : ''}
                      </div>
                    </div>
                    {added ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <Check className="h-3.5 w-3.5" /> Added
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mismatched}
                        onClick={() => addDoc(t)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {selectedDocs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Selected documents ({selectedDocs.length})
                </Label>
                {route && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium">
                    {route.from_warehouse || route.warehouses || '—'}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    {routeLabel(route)}
                  </span>
                )}
              </div>
              <div className="border rounded-md divide-y">
                {selectedDocs.map((d) => (
                  <div key={d.doc_entry} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="font-medium">
                      {isInvoice ? 'Invoice' : 'Doc'} #{d.doc_num}
                    </span>
                    <span className="text-muted-foreground">· {d.line_count} lines</span>
                    <button
                      type="button"
                      onClick={() => removeDoc(d.doc_entry)}
                      className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove doc ${d.doc_num}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 1b — destination company (invoice only) */}
      {isInvoice && (
        <Card>
          <CardContent className="pt-6 space-y-2 sm:max-w-sm">
            <Label htmlFor="bst-destination-company">
              Destination company <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              id="bst-destination-company"
              value={destinationCompanyId != null ? String(destinationCompanyId) : ''}
              onChange={(e) =>
                setDestinationCompanyId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <SelectOption value="">Select destination company</SelectOption>
              {destinationOptions.map((c) => (
                <SelectOption key={c.company_id} value={String(c.company_id)}>
                  {c.company_name} ({c.company_code})
                </SelectOption>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              The company the goods are sold to. On receipt the boxes move into this company's stock.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — reference + vehicle */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="sm:max-w-sm">
            <Label>Invoice / Reference No.</Label>
            <Input
              className="mt-1"
              placeholder="Optional"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onVehicle}
              onChange={(e) => setOnVehicle(e.target.checked)}
            />
            Leaves on a vehicle (needs gate-out)
          </label>

          {onVehicle ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <VehicleSelect label="Vehicle" required onChange={(v) => setVehicleId(v.vehicleId)} />
              <DriverSelect label="Driver" required onChange={(d) => setDriverId(d.driverId)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isInvoice
                ? 'No gate-out — mark this on if the goods leave the factory on a vehicle.'
                : 'Internal move — the stock stays inside the factory, so no vehicle or gate-out is needed.'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/warehouse/bst')}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={!canCreate || createMut.isPending}>
          {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Create &amp; Scan
        </Button>
      </div>
    </div>
  );
}
