/**
 * Print a production QC sheet through its print view — the same pattern as the
 * ETP registers' `useEtpRegisterPrint`. Lives in its own file so
 * `ProductionQCSheetPrint.tsx` exports components only (fast refresh).
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  type ProductionQCSheetPrintPayload,
  ProductionQCSheetPrintStyles,
  ProductionQCSheetPrintView,
} from './ProductionQCSheetPrint';

/** Call `print(payload)` and render `printPortal` in the page. */
export function useProductionQCSheetPrint() {
  const [payload, setPayload] = useState<ProductionQCSheetPrintPayload | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const print = useCallback((next: ProductionQCSheetPrintPayload) => {
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
    document.body.classList.add('pqc-printing');
    return () => document.body.classList.remove('pqc-printing');
  }, [isPrinting]);

  const printPortal =
    isPrinting && payload && typeof document !== 'undefined'
      ? createPortal(
          <>
            <ProductionQCSheetPrintStyles />
            <ProductionQCSheetPrintView payload={payload} />
          </>,
          document.body,
        )
      : null;

  return { print, printPortal };
}
