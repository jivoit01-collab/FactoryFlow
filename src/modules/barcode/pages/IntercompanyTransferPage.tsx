import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  History,
  PackageCheck,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { COMPANY_CODES } from '@/config/constants';
import { useAuth } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import {
  useCreateIntercompanyTransfer,
  useIntercompanyDashboard,
  useIntercompanyTransfers,
  useIntercompanyWarehouses,
  useReverseIntercompanyTransfer,
  useScanIntercompanyBarcode,
} from '../api';
import { ConfirmDialog } from '../components';
import BarcodeScanner from '../components/BarcodeScanner';
import type { IntercompanyScannedBarcode, IntercompanyTransferType } from '../types';
import { toastBarcodeError } from '../utils/errors';

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function IntercompanyTransferPage() {
  const navigate = useNavigate();
  const { companies, currentCompany } = useAuth();
  const activeCompanies = companies.filter((company) => company.is_active);
  const [sourceCompany, setSourceCompany] = useState(currentCompany?.company_code || '');
  const [destinationCompany, setDestinationCompany] = useState(
    activeCompanies.find((company) => company.company_code !== currentCompany?.company_code)
      ?.company_code || '',
  );
  const [manualBarcode, setManualBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [transferType, setTransferType] = useState<IntercompanyTransferType>('BOX');
  const [scanned, setScanned] = useState<IntercompanyScannedBarcode[]>([]);
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destinationWarehouse, setDestinationWarehouse] = useState('');
  const [beveragesAcknowledged, setBeveragesAcknowledged] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<number | null>(null);

  // Beverages stock is never barcoded, so transferring barcoded box/pallet
  // ownership into Beverages is almost always a mistaken destination pick.
  const destinationIsBeverages = destinationCompany === COMPANY_CODES.JIVO_BEVERAGES;

  const dashboardQuery = useIntercompanyDashboard();
  const transfersQuery = useIntercompanyTransfers({ search: search || undefined, page_size: 10 });
  const warehousesQuery = useIntercompanyWarehouses(destinationCompany, confirmOpen);
  const scanMutation = useScanIntercompanyBarcode();
  const createMutation = useCreateIntercompanyTransfer();
  const reverseMutation = useReverseIntercompanyTransfer();

  const totalQty = useMemo(
    () => scanned.reduce((sum, row) => sum + toNumber(row.qty), 0),
    [scanned],
  );

  // Warehouse(s) the scanned stock currently sits in (source side). Without a
  // different pick, the stock keeps this code after the company move.
  const currentWarehouses = useMemo(
    () => [...new Set(scanned.map((row) => row.current_warehouse).filter(Boolean))],
    [scanned],
  );

  // Preselect the warehouse the stock would land in today (its current code),
  // when that code exists in the destination company.
  useEffect(() => {
    if (!confirmOpen || destinationWarehouse || !warehousesQuery.data) return;
    if (currentWarehouses.length === 1) {
      const match = warehousesQuery.data.find(
        (warehouse) => warehouse.warehouse_code === currentWarehouses[0],
      );
      if (match) setDestinationWarehouse(match.warehouse_code);
    }
  }, [confirmOpen, destinationWarehouse, warehousesQuery.data, currentWarehouses]);

  const canScan = sourceCompany && destinationCompany && sourceCompany !== destinationCompany;

  const handleScan = async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode || !canScan) return;
    if (scanned.some((row) => row.barcode === cleanBarcode)) {
      toast.error('Barcode already added to this transfer');
      return;
    }

    try {
      const result = await scanMutation.mutateAsync({
        barcode: cleanBarcode,
        source_company_code: sourceCompany,
        destination_company_code: destinationCompany,
        transfer_type: transferType,
        device_id: 'web',
      });
      if (scanned.some((row) => row.barcode === result.barcode)) {
        toast.error(`${result.barcode} already added to this transfer`);
        return;
      }
      setScanned((prev) => [result, ...prev]);
      setManualBarcode('');
      toast.success(`${result.barcode} added`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to validate this barcode for transfer.');
    }
  };

  const openConfirmDialog = () => {
    if (scanned.length === 0 || !canScan) return;
    setDestinationWarehouse('');
    setBeveragesAcknowledged(false);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (scanned.length === 0 || !canScan || !destinationWarehouse) return;
    if (destinationIsBeverages && !beveragesAcknowledged) return;
    try {
      const transfer = await createMutation.mutateAsync({
        source_company_code: sourceCompany,
        destination_company_code: destinationCompany,
        transfer_type: transferType,
        barcodes: scanned.map((row) => row.barcode),
        notes,
        device_id: 'web',
        destination_warehouse: destinationWarehouse,
      });
      toast.success(
        `Transfer ${transfer.transfer_number} completed — stock moved to ${destinationWarehouse}`,
      );
      setConfirmOpen(false);
      setScanned([]);
      setNotes('');
      setDestinationWarehouse('');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to confirm intercompany transfer.');
    }
  };

  const handleReverse = async (reason: string) => {
    if (reverseTarget === null) return;
    try {
      await reverseMutation.mutateAsync({
        transferId: reverseTarget,
        data: { reason, device_id: 'web' },
      });
      toast.success('Transfer reversed');
      setReverseTarget(null);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to reverse this transfer.');
    }
  };

  const today = dashboardQuery.data?.today;
  const recentTransfers =
    transfersQuery.data?.results ?? dashboardQuery.data?.recent_transfers ?? [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Intercompany Barcode Transfer"
        description="Move box and pallet ownership between companies with barcode traceability"
      />

      {dashboardQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      )}
      {dashboardQuery.isError && (
        <p className="text-sm text-destructive">Could not load dashboard totals. Please try again.</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today's Transfers", value: today?.transfer_count ?? 0 },
          { label: 'Barcodes', value: today?.barcode_count ?? 0 },
          { label: 'Cartons', value: today?.carton_count ?? 0 },
          { label: 'Quantity', value: today?.total_qty ?? '0' },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Source Company</span>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={sourceCompany}
                onChange={(event) => {
                  setSourceCompany(event.target.value);
                  setScanned([]);
                }}
              >
                <option value="">Select source</option>
                {activeCompanies.map((company) => (
                  <option key={company.company_id} value={company.company_code}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </label>

            <ArrowRightLeft className="hidden md:block h-5 w-5 mb-3 text-muted-foreground" />

            <label className="space-y-1 text-sm">
              <span className="font-medium">Destination Company</span>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={destinationCompany}
                onChange={(event) => {
                  setDestinationCompany(event.target.value);
                  setScanned([]);
                  setBeveragesAcknowledged(false);
                }}
              >
                <option value="">Select destination</option>
                {activeCompanies
                  .filter((company) => company.company_code !== sourceCompany)
                  .map((company) => (
                    <option key={company.company_id} value={company.company_code}>
                      {company.company_name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Transfer Type</p>
            <div className="grid grid-cols-2 gap-2 sm:inline-grid">
              {(['BOX', 'PALLET'] as IntercompanyTransferType[]).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={transferType === type ? 'default' : 'outline'}
                  onClick={() => {
                    setTransferType(type);
                    setScanned([]);
                    setManualBarcode('');
                  }}
                  className="justify-center"
                >
                  {type === 'BOX' ? 'Box' : 'Pallet'}
                </Button>
              ))}
            </div>
          </div>

          <BarcodeScanner onScan={handleScan} />

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="flex-1 rounded-md border px-3 py-2"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleScan(manualBarcode);
              }}
              placeholder="Enter or paste barcode"
              aria-label="Enter or paste barcode"
              disabled={!canScan}
            />
            <Button onClick={() => handleScan(manualBarcode)} disabled={!manualBarcode || !canScan}>
              Add {transferType === 'BOX' ? 'Box' : 'Pallet'}
            </Button>
          </div>

          {sourceCompany === destinationCompany && (
            <p className="text-sm text-destructive">Source and destination must be different.</p>
          )}

          {destinationIsBeverages && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Beverages stock is not barcoded. Transferring barcoded box/pallet ownership into{' '}
                <span className="font-medium">Jivo Beverages</span> is usually not what you want —
                double-check the destination company before continuing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <PackageCheck className="h-4 w-4" />
                Review Transfer List
              </h3>
              <p className="text-sm text-muted-foreground">
                {scanned.length} {transferType === 'BOX' ? 'boxes' : 'pallets'},{' '}
                {totalQty.toLocaleString()} total quantity
              </p>
            </div>
            <Button
              onClick={openConfirmDialog}
              disabled={createMutation.isPending || scanned.length === 0 || !canScan}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirm Transfer
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">Barcode</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Batch</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-left">Current Company</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {scanned.map((row) => (
                  <tr key={row.barcode} className="border-b">
                    <td className="p-2 font-mono text-xs">{row.barcode}</td>
                    <td className="p-2">
                      <Badge variant="outline">{row.entity_type}</Badge>
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{row.item_code}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.item_name}
                        {row.entity_type === 'PALLET' && row.box_count
                          ? ` - ${row.box_count} boxes`
                          : ''}
                      </div>
                    </td>
                    <td className="p-2">{row.batch_number}</td>
                    <td className="p-2 text-right">
                      {row.qty} {row.uom}
                    </td>
                    <td className="p-2">{row.current_company_name || row.current_company}</td>
                    <td className="p-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setScanned((prev) => prev.filter((item) => item.id !== row.id))
                        }
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                {scanned.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                      Scan {transferType === 'BOX' ? 'box' : 'pallet'} barcodes to build a transfer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
            aria-label="Transfer notes"
            rows={2}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Company-wise Transfer Summary</h3>
            <div className="space-y-2">
              {(dashboardQuery.data?.routes ?? []).map((route) => (
                <div
                  key={`${route.source_company_code}-${route.destination_company_code}`}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {route.source_company_code} {'->'} {route.destination_company_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {route.transfer_count} transfers, {route.total_qty} qty
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {route.barcode_count} barcodes
                  </Badge>
                </div>
              ))}
              {dashboardQuery.data?.routes.length === 0 && (
                <p className="text-sm text-muted-foreground">No intercompany routes yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Transfers
              </h3>
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full rounded-md border py-2 pl-8 pr-2 text-sm"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  aria-label="Search recent transfers"
                />
              </div>
            </div>
            <div className="space-y-2">
              {(transfersQuery.isLoading || dashboardQuery.isLoading) &&
                recentTransfers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Loading transfers...</p>
                )}
              {(transfersQuery.isError || dashboardQuery.isError) &&
                recentTransfers.length === 0 && (
                  <p className="text-sm text-destructive">
                    Could not load recent transfers. Please try again.
                  </p>
                )}
              {recentTransfers.map((transfer) => (
                <div key={transfer.id} className="rounded border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="font-mono text-xs text-blue-700 hover:underline"
                      onClick={() => navigate(`/barcode/intercompany/${transfer.id}`)}
                    >
                      {transfer.transfer_number}
                    </button>
                    <Badge
                      className={
                        transfer.status === 'REVERSED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }
                    >
                      {transfer.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm">
                    {transfer.source_company_code} {'->'} {transfer.destination_company_code}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {transfer.total_barcodes} barcodes, {transfer.total_qty} {transfer.uom}
                    </span>
                    {transfer.status !== 'REVERSED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReverseTarget(transfer.id)}
                        disabled={reverseMutation.isPending}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reverse
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {recentTransfers.length === 0 &&
                !transfersQuery.isLoading &&
                !dashboardQuery.isLoading &&
                !transfersQuery.isError &&
                !dashboardQuery.isError && (
                  <p className="text-sm text-muted-foreground">No transfers found.</p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Intercompany Transfer</DialogTitle>
            <DialogDescription>
              {scanned.length} {transferType === 'BOX' ? 'boxes' : 'pallets'} (
              {totalQty.toLocaleString()} qty) will move to{' '}
              {activeCompanies.find((company) => company.company_code === destinationCompany)
                ?.company_name || destinationCompany}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {currentWarehouses.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Stock is currently in warehouse{currentWarehouses.length > 1 ? 's' : ''}:{' '}
                <span className="font-medium text-foreground">
                  {currentWarehouses.join(', ')}
                </span>
              </p>
            )}

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Receive into warehouse</span>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={destinationWarehouse}
                onChange={(event) => setDestinationWarehouse(event.target.value)}
                disabled={warehousesQuery.isLoading}
              >
                <option value="">
                  {warehousesQuery.isLoading ? 'Loading warehouses...' : 'Select warehouse'}
                </option>
                {(warehousesQuery.data ?? []).map((warehouse) => (
                  <option key={warehouse.warehouse_code} value={warehouse.warehouse_code}>
                    {warehouse.warehouse_code} — {warehouse.warehouse_name}
                  </option>
                ))}
              </select>
            </label>

            {warehousesQuery.isError && (
              <p className="text-sm text-destructive">
                Could not load the destination company's warehouses. Please try again.
              </p>
            )}
            {destinationWarehouse &&
              currentWarehouses.length > 0 &&
              !currentWarehouses.every((code) => code === destinationWarehouse) && (
                <p className="text-sm text-muted-foreground">
                  The stock will be received directly into{' '}
                  <span className="font-medium text-foreground">{destinationWarehouse}</span> — no
                  separate godown transfer needed.
                </p>
              )}

            {destinationIsBeverages && (
              <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    You're transferring barcoded stock into{' '}
                    <span className="font-medium">Jivo Beverages</span>, which does not use
                    barcodes. Are you sure this is the intended destination?
                  </p>
                </div>
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={beveragesAcknowledged}
                    onChange={(event) => setBeveragesAcknowledged(event.target.checked)}
                  />
                  Yes, transfer to Jivo Beverages anyway
                </label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                createMutation.isPending ||
                !destinationWarehouse ||
                (destinationIsBeverages && !beveragesAcknowledged)
              }
            >
              {createMutation.isPending ? 'Confirming...' : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={reverseTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReverseTarget(null);
        }}
        title="Reverse this transfer?"
        description="Reversing returns the stock to the source company. This cannot be undone."
        confirmLabel="Reverse"
        destructive
        requireReason
        reasonLabel="Reason"
        pending={reverseMutation.isPending}
        onConfirm={handleReverse}
      />
    </div>
  );
}
