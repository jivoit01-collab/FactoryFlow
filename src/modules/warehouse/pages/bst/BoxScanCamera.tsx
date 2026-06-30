import { Camera, Flashlight } from 'lucide-react';

import type { useScanner } from '@/modules/barcode/hooks/useScanner';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

type Scanner = ReturnType<typeof useScanner>;

/**
 * Camera scan viewport + flashlight toggle, ported from the sales-dispatch
 * docking scan flow so both behave identically (conditionally-mounted viewport,
 * torch button when supported, green success blink overlay).
 */
export function BoxScanCamera({ scanner, flashing }: { scanner: Scanner; flashing: boolean }) {
  if (!scanner.isScanning) {
    return (
      <Button type="button" className="w-full" onClick={() => void scanner.startScanning()}>
        <Camera className="h-4 w-4 mr-1" /> Start Camera
      </Button>
    );
  }

  return (
    <div className="max-w-sm space-y-3">
      <div className="relative overflow-hidden rounded-md border bg-slate-950">
        <div
          id={scanner.elementId}
          className="aspect-square min-h-[220px] w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />
        <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-white/80" />
        <div
          className={cn(
            'pointer-events-none absolute inset-0 bg-emerald-400/60 transition-opacity duration-200',
            flashing ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void scanner.stopScanning()}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-1" /> Stop
        </Button>
        {scanner.torchSupported ? (
          <Button
            type="button"
            variant={scanner.torchOn ? 'default' : 'outline'}
            onClick={() => void scanner.toggleTorch()}
            title="Toggle flashlight"
          >
            <Flashlight className="h-4 w-4 mr-1" /> {scanner.torchOn ? 'Light on' : 'Light'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
