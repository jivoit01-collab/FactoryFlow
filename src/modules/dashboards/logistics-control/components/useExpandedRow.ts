import { useCallback, useState } from 'react';

/**
 * Which row of a panel has its own rows showing.
 *
 * By key rather than by object. The feeds behind these panels refetch while
 * they are open, and holding the row itself would pin a stale copy of it — the
 * detail underneath would go on saying "awaiting a truck" after one was
 * attached. The key survives a refetch; everything shown is recomputed from the
 * rows that came back.
 *
 * One row at a time, and clicking the open one shuts it: a reader who opened
 * the wrong customer should not have to find a close control to undo it.
 */
export function useExpandedRow() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = useCallback((key: string) => {
    setOpenKey((current) => (current === key ? null : key));
  }, []);

  return { openKey, toggle };
}
