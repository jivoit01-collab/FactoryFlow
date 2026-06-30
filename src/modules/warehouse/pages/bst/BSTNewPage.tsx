import { ArrowRight, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
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
  const [selectedDoc, setSelectedDoc] = useState<SAPStockTransfer | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [requiresGate, setRequiresGate] = useState(false);

  const { data: transfers = [], isLoading: searching } = useBSTSapTransfers(
    submittedSearch,
    submittedSearch.length > 0,
  );
  const createMut = useCreateBST();

  // Vehicle + driver are only needed when the truck leaves the factory. For an
  // internal move the stock is already at the dock, so the fields are hidden.
  const gateFieldsReady = !requiresGate || (vehicleId !== null && driverId !== null);
  const canCreate = selectedDoc !== null && gateFieldsReady;

  const handleCreate = async () => {
    if (!selectedDoc) return;
    if (requiresGate && (vehicleId === null || driverId === null)) return;
    try {
      const transfer = await createMut.mutateAsync({
        sap_doc_entry: selectedDoc.doc_entry,
        vehicle: requiresGate ? vehicleId : null,
        driver: requiresGate ? driverId : null,
        invoice_no: invoiceNo,
        requires_gate: requiresGate,
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
        description="Pick the SAP stock-transfer document; the source and destination warehouses come from it"
      />

      {/* Step 1 — SAP document */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>SAP Stock Transfer</Label>
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
              {transfers.map((t) => (
                <button
                  key={t.doc_entry}
                  type="button"
                  onClick={() => setSelectedDoc(t)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 ${
                    selectedDoc?.doc_entry === t.doc_entry ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Doc #{t.doc_num}</span>
                    <span className="text-muted-foreground">
                      {t.from_warehouse} → {t.to_warehouse}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.line_count} lines · {t.total_quantity} qty
                    {t.doc_date ? ` · ${new Date(t.doc_date).toLocaleDateString()}` : ''}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {selectedDoc && (
            <div className="flex flex-wrap items-center gap-2 text-sm bg-primary/5 rounded-md px-3 py-2">
              <span>
                Selected SAP Doc <span className="font-medium">#{selectedDoc.doc_num}</span>
              </span>
              <span className="inline-flex items-center gap-1 font-medium">
                {selectedDoc.from_warehouse}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                {selectedDoc.to_warehouse}
              </span>
              <span className="text-muted-foreground">· {selectedDoc.line_count} lines</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — reference + gate / vehicle / driver */}
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
              checked={requiresGate}
              onChange={(e) => setRequiresGate(e.target.checked)}
            />
            Requires gate movement (vehicle exits/enters a factory gate)
          </label>

          {requiresGate ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <VehicleSelect
                label="Vehicle"
                required
                onChange={(v) => setVehicleId(v.vehicleId)}
              />
              <DriverSelect label="Driver" required onChange={(d) => setDriverId(d.driverId)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Internal transfer — the stock is already at the dock, so no vehicle or driver is
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
