import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { OnlineQualityRecord } from '../../types';
import { OnlineRecordPrintStyles, OnlineRecordPrintView } from './OnlineRecordPrint';
import type { SpecMap } from './specValidation';

/**
 * Print an online-monitoring record as its controlled document
 * (QA-FRM-14-00-05-04). Call `print(record, specMap)` and render `printPortal`.
 */
export function useOnlineRecordPrint() {
  const [payload, setPayload] = useState<{ record: OnlineQualityRecord; specMap: SpecMap } | null>(
    null,
  );
  const [isPrinting, setIsPrinting] = useState(false);

  const print = useCallback((record: OnlineQualityRecord, specMap: SpecMap) => {
    setPayload({ record, specMap });
    setIsPrinting(true);
  }, []);

  useEffect(() => {
    if (!isPrinting) return;
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
    document.body.classList.add('online-record-printing');
    return () => document.body.classList.remove('online-record-printing');
  }, [isPrinting]);

  const printPortal =
    isPrinting && payload && typeof document !== 'undefined'
      ? createPortal(
          <>
            <OnlineRecordPrintStyles />
            <OnlineRecordPrintView record={payload.record} specMap={payload.specMap} />
          </>,
          document.body,
        )
      : null;

  return { print, printPortal };
}
