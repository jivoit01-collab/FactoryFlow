/**
 * Print an ETP / STP register through the shared print view.
 *
 * Lives in its own file so `EtpRegisterPrint.tsx` exports components only (fast
 * refresh), mirroring the QC online-monitoring print hook.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { type EtpPrintPayload, EtpPrintStyles, EtpPrintView } from './EtpRegisterPrint';

/**
 * Print a register. Call `print(payload)` and render `printPortal` in the page.
 */
export function useEtpRegisterPrint() {
  const [payload, setPayload] = useState<EtpPrintPayload | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const print = useCallback((next: EtpPrintPayload) => {
    setPayload(next);
    setIsPrinting(true);
  }, []);

  useEffect(() => {
    if (!isPrinting) return;
    // Let the portal paint before handing the page to the print dialog.
    const timer = window.setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [isPrinting]);

  useEffect(() => {
    const stop = () => setIsPrinting(false);
    window.addEventListener('afterprint', stop);
    return () => window.removeEventListener('afterprint', stop);
  }, []);

  useEffect(() => {
    if (!isPrinting || typeof document === 'undefined') return;
    document.body.classList.add('etp-printing');
    return () => document.body.classList.remove('etp-printing');
  }, [isPrinting]);

  const printPortal =
    isPrinting && payload && typeof document !== 'undefined'
      ? createPortal(
          <>
            <EtpPrintStyles orientation={payload.orientation ?? 'portrait'} />
            <EtpPrintView payload={payload} />
          </>,
          document.body,
        )
      : null;

  return { print, printPortal };
}
