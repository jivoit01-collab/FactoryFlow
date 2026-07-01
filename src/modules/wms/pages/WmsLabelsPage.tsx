/**
 * Label printing & export (Step 10).
 *
 * A print-and-export sheet of every location QR label and every pallet
 * license-plate label. Pick a warehouse and a label set, then Print. Labels are
 * rendered at 100x40mm and printed through the same react-to-print pipeline /
 * TSC DA310 page geometry as the barcode module, so they run on the same
 * thermal printer and stock.
 */
import { Printer } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

import { LABEL_PRINT_PAGE_STYLE } from '@/modules/barcode/components/labelPrint';
import { Button, Card, CardContent, NativeSelect } from '@/shared/components/ui';

import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import WmsPrintLabel, { type WmsLabelData } from '../components/WmsPrintLabel';
import { useWarehouses, useWmsCollection, useWmsEnabled } from '../store';

type LabelSet = 'locations' | 'pallets';

export default function WmsLabelsPage() {
  const enabled = useWmsEnabled();
  const { warehouses } = useWarehouses();
  const { data: locations } = useWmsCollection('locations');
  const { data: pallets } = useWmsCollection('pallets');

  const [warehouseId, setWarehouseId] = useState('');
  const [labelSet, setLabelSet] = useState<LabelSet>('locations');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'WMS Labels 100x40mm',
    ignoreGlobalStyles: true,
    pageStyle: LABEL_PRINT_PAGE_STYLE,
  });

  const activeWarehouseId = warehouseId || warehouses[0]?.id || '';
  const warehouseLocations = useMemo(
    () => locations.filter((location) => location.warehouseId === activeWarehouseId),
    [locations, activeWarehouseId],
  );
  const activePallets = useMemo(() => pallets.filter((p) => p.status !== 'SHIPPED'), [pallets]);

  const labels: Array<{ key: string } & WmsLabelData> = useMemo(() => {
    if (labelSet === 'locations') {
      return warehouseLocations.map((location) => ({
        key: location.id,
        code: location.barcode || location.code,
        title: location.code,
        heading: 'LOCATION',
        subtitle: location.type,
      }));
    }
    return activePallets.map((pallet) => ({
      key: pallet.id,
      code: pallet.licensePlate,
      title: pallet.licensePlate,
      heading: 'PALLET',
      subtitle: pallet.itemName || pallet.itemCode,
    }));
  }, [labelSet, warehouseLocations, activePallets]);

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Labels</h1>
          <p className="text-sm text-muted-foreground">
            Print or export location and pallet QR labels (100&times;40mm).
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {warehouses.length > 1 && labelSet === 'locations' ? (
            <NativeSelect className="w-full sm:w-44" value={activeWarehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <NativeSelect className="w-full sm:w-40" value={labelSet} onChange={(event) => setLabelSet(event.target.value as LabelSet)}>
            <option value="locations">Location labels</option>
            <option value="pallets">Pallet labels</option>
          </NativeSelect>
          <Button className="w-full sm:w-auto" onClick={() => handlePrint()} disabled={labels.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {labels.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing to print yet.
          </CardContent>
        </Card>
      ) : (
        // Horizontal-scroll strip on phones (labels are a fixed 100mm wide), a
        // wrapping grid from sm up. Keeps the page from overflowing sideways.
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {labels.map((label) => (
            <div
              key={label.key}
              className="shrink-0 overflow-hidden rounded-md border shadow-sm"
              style={{ width: '100mm', height: '40mm' }}
            >
              <WmsPrintLabel data={label} />
            </div>
          ))}
        </div>
      )}

      {/* Hidden 100x40mm print sheet — one page per label for the TSC DA310. */}
      <div aria-hidden style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <div ref={printRef} className="barcode-print-sheet">
          {labels.map((label) => (
            <WmsPrintLabel key={label.key} data={label} />
          ))}
        </div>
      </div>
    </div>
  );
}
