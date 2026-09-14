import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  artworkApi,
  type ArtworkFileKind,
  type ArtworkItemListParams,
  type CaptureArtworkPayload,
  type ReviseArtworkPayload,
} from './artwork.api';

export const ARTWORK_QUERY_KEYS = {
  all: ['artwork'] as const,
  items: (params?: ArtworkItemListParams) =>
    [
      ...ARTWORK_QUERY_KEYS.all,
      'items',
      params?.subGroup ?? '',
      params?.search ?? '',
      params?.status ?? '',
    ] as const,
  options: () => [...ARTWORK_QUERY_KEYS.all, 'options'] as const,
  detail: (id: number) => [...ARTWORK_QUERY_KEYS.all, 'detail', id] as const,
  revisions: (id: number) => [...ARTWORK_QUERY_KEYS.all, 'revisions', id] as const,
};

export function useArtworkItems(params?: ArtworkItemListParams) {
  return useQuery({
    queryKey: ARTWORK_QUERY_KEYS.items(params),
    queryFn: () => artworkApi.items(params),
  });
}

/**
 * The upload limits and whether this user may edit.
 *
 * Long-lived: none of it changes within a session, and the page reads it on
 * every render of the form.
 */
export function useArtworkOptions() {
  return useQuery({
    queryKey: ARTWORK_QUERY_KEYS.options(),
    queryFn: () => artworkApi.options(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useArtworkRecord(id: number | null) {
  return useQuery({
    queryKey: ARTWORK_QUERY_KEYS.detail(id ?? 0),
    queryFn: () => artworkApi.detail(id as number),
    enabled: id != null,
  });
}

export function useArtworkRevisions(id: number | null) {
  return useQuery({
    queryKey: ARTWORK_QUERY_KEYS.revisions(id ?? 0),
    queryFn: () => artworkApi.revisions(id as number),
    enabled: id != null,
  });
}

export function useCaptureArtwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CaptureArtworkPayload) => artworkApi.capture(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ARTWORK_QUERY_KEYS.all });
    },
  });
}

export function useReviseArtwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; payload: ReviseArtworkPayload }) =>
      artworkApi.revise(vars.id, vars.payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ARTWORK_QUERY_KEYS.all });
    },
  });
}

export function useRetireArtwork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => artworkApi.retire(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ARTWORK_QUERY_KEYS.all });
    },
  });
}

/**
 * Opens a stored file.
 *
 * The bytes are fetched with the auth header and handed to the browser as an
 * object URL: the PDF opens in a new tab, the CDR saves, since nothing renders
 * a CorelDRAW file. The URL is revoked once the browser has had it — immediate
 * revocation would race the tab that is still opening.
 */
export function useOpenArtworkFile() {
  return useMutation({
    mutationFn: async (vars: {
      recordId?: number;
      revisionId?: number;
      kind: ArtworkFileKind;
      filename?: string;
    }) => {
      const blob =
        vars.revisionId != null
          ? await artworkApi.revisionFile(vars.revisionId, vars.kind)
          : await artworkApi.file(vars.recordId as number, vars.kind);

      const url = URL.createObjectURL(blob);
      if (vars.kind === 'pdf') {
        window.open(url, '_blank', 'noopener');
      } else {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = vars.filename || 'artwork.cdr';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}
