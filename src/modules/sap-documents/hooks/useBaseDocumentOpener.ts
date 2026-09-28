import { useState } from 'react';

import { type BaseDocument, type DocumentTypeInfo, useDocumentTypes } from '../api';

/** Opens a "Copied from" document in its own dialog (rendered by `DocumentDetailBody`). */
export interface BaseDocumentOpener {
  canOpen: (base: BaseDocument) => boolean;
  open: (base: BaseDocument) => void;
  /** The document being opened, if any. */
  target: { type: DocumentTypeInfo; entry: number } | null;
  close: () => void;
}

/**
 * Base documents open in the document browser, so this needs its right
 * (`enabled`); without it they stay plain text. Only posted document types
 * open (not drafts), matched by SAP object type.
 */
export function useBaseDocumentOpener(enabled: boolean): BaseDocumentOpener {
  const types = useDocumentTypes(enabled);
  const [target, setTarget] = useState<{ type: DocumentTypeInfo; entry: number } | null>(null);
  const typeFor = (base: BaseDocument) =>
    enabled
      ? (types.data ?? []).find(
          (t) => t.object_type === base.base_type && (t.kind === 'marketing' || t.kind === 'transfer'),
        )
      : undefined;
  return {
    canOpen: (base) => !!typeFor(base),
    open: (base) => {
      const type = typeFor(base);
      if (type) setTarget({ type, entry: base.base_entry });
    },
    target,
    close: () => setTarget(null),
  };
}
