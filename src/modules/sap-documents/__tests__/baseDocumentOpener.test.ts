/**
 * "Copied from" documents open in the document browser: only posted document
 * types, matched by SAP object type, and only for someone with its right.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const types = [
  { key: 'Invoices', label: 'AR Invoice', kind: 'marketing', object_type: '13' },
  { key: 'Drafts', label: 'Draft', kind: 'draft', object_type: '112' },
];
const useDocumentTypes = vi.fn((enabled: boolean) => ({ data: enabled ? types : undefined }));
vi.mock('../api', () => ({ useDocumentTypes: (enabled: boolean) => useDocumentTypes(enabled) }));

import { useBaseDocumentOpener } from '../hooks/useBaseDocumentOpener';

const INVOICE = { base_type: '13', base_entry: 812 } as never;
const DRAFT = { base_type: '112', base_entry: 5 } as never;

describe('useBaseDocumentOpener', () => {
  it('opens a posted document by its object type', () => {
    const { result } = renderHook(() => useBaseDocumentOpener(true));
    expect(result.current.canOpen(INVOICE)).toBe(true);
    act(() => result.current.open(INVOICE));
    expect(result.current.target).toEqual({ type: types[0], entry: 812 });
    act(() => result.current.close());
    expect(result.current.target).toBeNull();
  });

  it('never opens a draft', () => {
    const { result } = renderHook(() => useBaseDocumentOpener(true));
    expect(result.current.canOpen(DRAFT)).toBe(false);
  });

  it('opens nothing without the document browser right, and does not ask for its types', () => {
    const { result } = renderHook(() => useBaseDocumentOpener(false));
    expect(result.current.canOpen(INVOICE)).toBe(false);
    expect(useDocumentTypes).toHaveBeenLastCalledWith(false);
  });
});
