/**
 * Camera/handheld barcode scanning for Warehouse Ops.
 *
 * Thin wrapper around the barcode module's `ScanSearchButton` so every WMS scan
 * field gets the same scanner UX (camera + manual entry) from one place. WMS
 * scans are plain location/item codes, so `expectedType="ANY"` returns the raw
 * value; `onScan` receives the decoded string.
 */
import ScanSearchButton from '@/modules/barcode/components/ScanSearchButton';

interface WmsScanButtonProps {
  onScan: (value: string) => void;
  label?: string;
}

export function WmsScanButton({ onScan, label = 'Scan' }: WmsScanButtonProps) {
  return <ScanSearchButton onScan={onScan} label={label} expectedType="ANY" />;
}
