import { Camera, CameraOff } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { Button, Card, CardContent } from '@/shared/components/ui';

import { useScanner } from '../hooks/useScanner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  autoFocusInput?: boolean;
}

/**
 * Barcode scanner with two input methods:
 * 1. Text input — for handheld barcode scanners (HID/keyboard mode) and manual entry
 * 2. Camera — for smartphone scanning via html5-qrcode
 *
 * Handheld scanners act as keyboard input: they type the barcode text
 * and press Enter. The text input captures this automatically.
 */
export default function BarcodeScanner({
  onScan,
  placeholder = 'Scan barcode or type manually...',
  autoFocusInput = true,
}: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { isScanning, error, elementId, startScanning, stopScanning } = useScanner({
    onScan,
    debounceMs: 2000,
  });

  // Auto-focus the input so handheld scanner keystrokes go here
  useEffect(() => {
    if (autoFocusInput && inputRef.current && !isScanning) {
      inputRef.current.focus();
    }
  }, [autoFocusInput, isScanning]);

  const handleManualSubmit = () => {
    const trimmed = manualInput.trim();
    if (trimmed) {
      onScan(trimmed);
      setManualInput('');
      // Re-focus for next scan
      inputRef.current?.focus();
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Primary input — works with handheld scanners and manual typing */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Scan or type barcode
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 border rounded px-3 py-2 text-sm font-mono"
              placeholder={placeholder}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualSubmit();
                }
              }}
              autoFocus={autoFocusInput}
            />
            <Button size="sm" onClick={handleManualSubmit} disabled={!manualInput.trim()}>
              Lookup
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Handheld scanner will auto-submit on scan. Or type and press Enter.
          </p>
        </div>

        {/* Camera viewport */}
        <div
          id={elementId}
          className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black"
          style={{ minHeight: isScanning ? 300 : 0, display: isScanning ? 'block' : 'none' }}
        />

        {/* Camera toggle */}
        <div className="flex justify-center">
          {!isScanning ? (
            <Button variant="outline" size="sm" onClick={startScanning}>
              <Camera className="h-4 w-4 mr-1" /> Use Phone Camera
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={stopScanning}>
              <CameraOff className="h-4 w-4 mr-1" /> Stop Camera
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {isScanning && (
          <p className="text-xs text-center text-muted-foreground">
            Point camera at barcode — supports Code 128, QR, and other formats
          </p>
        )}
      </CardContent>
    </Card>
  );
}
