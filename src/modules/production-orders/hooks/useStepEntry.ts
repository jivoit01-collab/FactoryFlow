import { useParams } from 'react-router-dom';

import { useEntry, useProductionOrdersMe } from '../api';

/** The entry a step page is for (from `:id`), and what the caller may do. */
export function useStepEntry() {
  const { id } = useParams<{ id: string }>();
  const entryId = id ? Number(id) : null;
  const entry = useEntry(entryId);
  const me = useProductionOrdersMe();
  return { entryId, entry, me: me.data };
}
