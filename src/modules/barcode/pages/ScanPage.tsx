import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanBarcode, Package, Boxes, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Badge, Button } from '@/shared/components/ui';

import { useProcessScan } from '../api';
import BarcodeScanner from '../components/BarcodeScanner';
import type { ScanResponse } from '../types';

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanResults, setScanResults] = useState<ScanResponse[]>([]);
  const processScan = useProcessScan();

  const handleScan = async (barcode: string) => {
    try {
      const result = await processScan.mutateAsync({
        barcode_raw: barcode,
        scan_type: 'LOOKUP',
      });
      setScanResults((prev) => [result, ...prev]);

      if (result.result === 'SUCCESS') {
        toast.success(`Found: ${result.entity_type} — ${(result.entity_data as Record<string, string>)?.item_name || (result.entity_data as Record<string, string>)?.item_code || barcode}`);
      } else {
        toast.error(`Not found: ${barcode}`);
      }
    } catch {
      toast.error('Scan failed');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Scan" subtitle="Point your phone camera at a QR code or barcode" />

      <BarcodeScanner onScan={handleScan} />

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ScanBarcode className="h-4 w-4" /> Scan Results ({scanResults.length})
            </h3>
            <div className="space-y-2">
              {scanResults.map((scan) => {
                const data = scan.entity_data as Record<string, unknown> | null;
                const isBox = scan.entity_type === 'BOX';
                const isPallet = scan.entity_type === 'PALLET';
                const detailUrl = isBox
                  ? `/barcode/boxes/${scan.entity_id}`
                  : isPallet
                    ? `/barcode/pallets/${scan.entity_id}`
                    : null;

                return (
                  <div
                    key={scan.scan_id}
                    className={`p-3 rounded-lg border ${scan.result === 'SUCCESS' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isBox && <Boxes className="h-4 w-4 text-blue-600" />}
                        {isPallet && <Package className="h-4 w-4 text-purple-600" />}
                        <Badge className={scan.result === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {scan.result}
                        </Badge>
                        <Badge className="bg-gray-100 text-gray-800">{scan.entity_type}</Badge>
                      </div>
                      {detailUrl && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(detailUrl)}>
                          <ExternalLink className="h-3 w-3 mr-1" /> View
                        </Button>
                      )}
                    </div>

                    {data && (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {isBox && (
                          <>
                            <div><span className="text-muted-foreground">Barcode:</span> <span className="font-mono text-xs">{data.box_barcode as string}</span></div>
                            <div><span className="text-muted-foreground">Item:</span> {data.item_name as string || data.item_code as string}</div>
                            <div><span className="text-muted-foreground">Qty:</span> {data.qty as string} {data.uom as string}</div>
                            <div><span className="text-muted-foreground">WH:</span> {data.current_warehouse as string}</div>
                          </>
                        )}
                        {isPallet && (
                          <>
                            <div><span className="text-muted-foreground">Pallet:</span> <span className="font-mono text-xs">{data.pallet_id as string}</span></div>
                            <div><span className="text-muted-foreground">Item:</span> {data.item_name as string || data.item_code as string}</div>
                            <div><span className="text-muted-foreground">Boxes:</span> {data.box_count as number} · {data.total_qty as string} {data.uom as string}</div>
                            <div><span className="text-muted-foreground">WH:</span> {data.current_warehouse as string}</div>
                          </>
                        )}
                      </div>
                    )}

                    {!data && (
                      <p className="mt-1 text-sm text-muted-foreground font-mono">{scan.barcode_raw}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
