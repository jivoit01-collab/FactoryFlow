/**
 * Label printing & export (Step 10).
 *
 * A print-and-export sheet of every location barcode and every pallet
 * license-plate label. Pick a warehouse and a label set, then Print (which the
 * browser can also "Save as PDF" to export). The print stylesheet hides the app
 * chrome so only the label grid prints.
 */
import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';

import { Button, Card, CardContent, NativeSelect } from '@/shared/components/ui';

import { WmsBarcode } from '../components/WmsBarcode';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { useWarehouses, useWmsCollection, useWmsEnabled } from '../store';

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #wms-label-sheet, #wms-label-sheet * { visibility: visible !important; }
  #wms-label-sheet { position: absolute; left: 0; top: 0; width: 100%; }
  .wms-no-print { display: none !important; }
}
`;

type LabelSet = 'locations' | 'pallets';

export default function WmsLabelsPage() {
  const enabled = useWmsEnabled();
  const { warehouses } = useWarehouses();
  const { data: locations } = useWmsCollection('locations');
  const { data: pallets } = useWmsCollection('pallets');

  const [warehouseId, setWarehouseId] = useState('');
  const [labelSet, setLabelSet] = useState<LabelSet>('locations');

  const activeWarehouseId = warehouseId || warehouses[0]?.id || '';
  const warehouseLocations = useMemo(
    () => locations.filter((location) => location.warehouseId === activeWarehouseId),
    [locations, activeWarehouseId],
  );
  const activePallets = useMemo(() => pallets.filter((p) => p.status !== 'SHIPPED'), [pallets]);

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  const labels =
    labelSet === 'locations'
      ? warehouseLocations.map((location) => ({
          key: location.id,
          code: location.barcode || location.code,
          title: location.code,
          subtitle: location.type,
        }))
      : activePallets.map((pallet) => ({
          key: pallet.id,
          code: pallet.licensePlate,
          title: pallet.licensePlate,
          subtitle: pallet.itemName || pallet.itemCode,
        }));

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <style>{PRINT_CSS}</style>

      <div className="wms-no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Labels</h1>
          <p className="text-sm text-muted-foreground">Print or export location and pallet barcodes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {warehouses.length > 1 && labelSet === 'locations' ? (
            <NativeSelect className="w-44" value={activeWarehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <NativeSelect className="w-40" value={labelSet} onChange={(event) => setLabelSet(event.target.value as LabelSet)}>
            <option value="locations">Location labels</option>
            <option value="pallets">Pallet labels</option>
          </NativeSelect>
          <Button onClick={() => window.print()} disabled={labels.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {labels.length === 0 ? (
        <Card className="wms-no-print">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing to print yet.
          </CardContent>
        </Card>
      ) : (
        <div
          id="wms-label-sheet"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {labels.map((label) => (
            <div
              key={label.key}
              className="flex flex-col items-center gap-1 rounded-md border p-3 text-center"
              style={{ breakInside: 'avoid' }}
            >
              <span className="font-mono text-sm font-semibold">{label.title}</span>
              <WmsBarcode value={label.code} />
              {label.subtitle ? <span className="text-xs text-muted-foreground">{label.subtitle}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
