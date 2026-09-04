import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { QCRecord } from '../../types/qcRecord.types';
import { QCRecordPrintStyles, QCRecordPrintView } from './QCRecordPrint';

/**
 * Print a filled QC record as its controlled document.
 *
 * Call `print(record)` and render `printPortal`. Mirrors
 * `useOnlineRecordPrint`: the view is portalled to `document.body` and a class
 * on the body hides the app while printing, so the sheet prints on its own.
 */
export function useQCRecordPrint() {
  const [payload, setPayload] = useState<QCRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const print = useCallback((record: QCRecord) => {
    setPayload(record);
    setIsPrinting(true);
  }, []);

  // A short delay lets the portalled view paint before the dialog opens.
  useEffect(() => {
    if (!isPrinting) return undefined;
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
    if (!isPrinting || typeof document === 'undefined') return undefined;
    document.body.classList.add('qc-record-printing');
    return () => document.body.classList.remove('qc-record-printing');
  }, [isPrinting]);

  const printPortal =
    isPrinting && payload && typeof document !== 'undefined'
      ? createPortal(
          <>
            <QCRecordPrintStyles />
            <QCRecordPrintView record={payload} />
          </>,
          document.body,
        )
      : null;

  return { print, printPortal };
}
