import { ArrowRight, Check, Loader2, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DriverSelect, VehicleSelect } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useBSTSapTransfers, useCreateBST } from '../../api';
import type { SAPStockTransfer } from '../../types';

export default function BSTNewPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  // A BST entry can combine several SAP documents that share one source and
  // destination warehouse. The user searches and adds documents to this list.
  const [selectedDocs, setSelectedDocs] = useState<SAPStockTransfer[]>([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  // When the stock leaves on a vehicle it needs a gate-out, so we capture the
  // vehicle + driver and route it to the gate after the warehouse approves.
  const [onVehicle, setOnVehicle] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);

  const { data: transfers = [], isLoading: searching } = useBSTSapTransfers(
    submittedSearch,
    submittedSearch.length > 0,
  );
  const createMut = useCreateBST();

  // The route is fixed by the first added document; every other document must
  // match it (same source → destination warehouse).
  const route = selectedDocs[0] ?? null;
  const selectedEntries = useMemo(
    () => new Set(selectedDocs.map((d) => d.doc_entry)),
    [selectedDocs],
  );

  const sameRoute = (doc: SAPStockTransfer) =>
    !route || (doc.from_warehouse === route.from_warehouse && doc.to_warehouse === route.to_warehouse);

  const addDoc = (doc: SAPStockTransfer) => {
    if (selectedEntries.has(doc.doc_entry)) return;
    if (!sameRoute(doc)) {
      toast.error(
        `Doc #${doc.doc_num} is ${doc.from_warehouse} → ${doc.to_warehouse}, but this entry is ` +
          `${route?.from_warehouse} → ${route?.to_warehouse}. All documents must share one route.`,
      );
      return;
    }
    setSelectedDocs((prev) => [...prev, doc]);
  };

  const removeDoc = (docEntry: number) =>
    setSelectedDocs((prev) => prev.filter((d) => d.doc_entry !== docEntry));

  const vehicleReady = !onVehicle || (vehicleId !== null && driverId !== null);
  const canCreate = selectedDocs.length > 0 && vehicleReady;

  const handleCreate = async () => {
    if (selectedDocs.length === 0) return;
    if (onVehicle && (vehicleId === null || driverId === null)) return;
    try {
      const transfer = await createMut.mutateAsync({
        sap_doc_entries: selectedDocs.map((d) => d.doc_entry),
        invoice_no: invoiceNo,
        requires_gate: onVehicle,
        vehicle: onVehicle ? vehicleId : null,
        driver: onVehicle ? driverId : null,
      });
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
        description="Add one or more SAP stock-transfer documents sharing the same source and destination warehouse"
      />

      {/* Step 1 — SAP documents */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>SAP Stock Transfers</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Search by BST invoice / document number"
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
              No stock transfers found
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
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Doc #{t.doc_num}</span>
                        <span className="text-muted-foreground">
                          {t.from_warehouse} → {t.to_warehouse}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.line_count} lines · {t.total_quantity} qty
                        {t.doc_date ? ` · ${new Date(t.doc_date).toLocaleDateString()}` : ''}
                        {mismatched ? ' · different route' : ''}
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
                    {route.from_warehouse}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    {route.to_warehouse}
                  </span>
                )}
              </div>
              <div className="border rounded-md divide-y">
                {selectedDocs.map((d) => (
                  <div key={d.doc_entry} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="font-medium">Doc #{d.doc_num}</span>
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

      {/* Step 2 — reference */}
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
              Internal move — the stock stays inside the factory, so no vehicle or gate-out is
              needed.
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
