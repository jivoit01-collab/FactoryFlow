import { Html5Qrcode } from 'html5-qrcode';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface UseScannerOptions {
  onScan: (decodedText: string) => void;
  debounceMs?: number;
}

export function useScanner({ onScan, debounceMs = 1500 }: UseScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Camera torch/flashlight — only some devices/browsers support it, so it's
  // feature-detected once the camera is running and exposed for an optional toggle.
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const reactId = useId();
  const elementId = `barcode-scanner-viewport-${reactId.replace(/:/g, '')}`;

  const startScanning = useCallback(async () => {
    if (startingRef.current || scannerRef.current?.isScanning) {
      return;
    }

    startingRef.current = true;
    setError(null);
    setIsScanning(true);

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      if (!document.getElementById(elementId)) {
        throw new Error('Scanner viewport is not ready. Please try again.');
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' }, // rear camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce: ignore same barcode within debounceMs
          if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < debounceMs) {
            return;
          }
          lastScanRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScan(decodedText);
        },
        () => {
          // Scan failure — ignore (camera still scanning)
        },
      );

      // Feature-detect torch on the now-running camera track.
      try {
        const torch = scannerRef.current.getRunningTrackCameraCapabilities().torchFeature();
        setTorchSupported(torch.isSupported());
      } catch {
        setTorchSupported(false);
      }
      setTorchOn(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start camera';
      setError(msg);
      setIsScanning(false);
    } finally {
      startingRef.current = false;
    }
  }, [onScan, debounceMs, elementId]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current?.isScanning) return;
    try {
      const torch = scannerRef.current.getRunningTrackCameraCapabilities().torchFeature();
      if (!torch.isSupported()) {
        setTorchSupported(false);
        return;
      }
      const next = !torchOn;
      await torch.apply(next);
      setTorchOn(next);
    } catch {
      // Torch toggle failed (unsupported/locked) — surface as "not supported".
      setTorchSupported(false);
    }
  }, [torchOn]);

  const stopScanning = useCallback(async () => {
    startingRef.current = false;
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {
      // Ignore stop errors
    }
    setIsScanning(false);
    setTorchSupported(false);
    setTorchOn(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return {
    isScanning,
    error,
    elementId,
    startScanning,
    stopScanning,
    torchSupported,
    torchOn,
    toggleTorch,
  };
}
