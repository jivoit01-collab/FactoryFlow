import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import { BUILT_BOARD_REFRESH_MS } from '../constants';
import type { BoardDraft } from '../types';
import { builderApi } from './builder.api';

export const BUILDER_QUERY_KEYS = {
  all: ['board-builder'] as const,
  catalogue: (companyId?: number | string) =>
    ['board-builder', 'catalogue', companyId] as const,
  boards: (companyId?: number | string) =>
    ['board-builder', 'boards', companyId] as const,
  board: (slug: string, companyId?: number | string) =>
    ['board-builder', 'board', slug, companyId] as const,
  data: (slug: string, companyId?: number | string) =>
    ['board-builder', 'data', slug, companyId] as const,
  carousel: (companyId?: number | string) =>
    ['board-builder', 'carousel', companyId] as const,
};

/**
 * The palette. Cached hard.
 *
 * It is a register of code, not a feed: it changes on a deploy and on a
 * permission grant, neither of which happens while somebody is dragging.
 */
export function useCardCatalogue(enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: BUILDER_QUERY_KEYS.catalogue(currentCompany?.company_id),
    queryFn: () => builderApi.getCatalogue(),
    enabled,
    staleTime: Infinity,
    retry: 1,
  });
}

/**
 * The built boards on the wall rotation.
 *
 * Refetched every few minutes rather than once: a wall screen is opened and
 * then left alone for weeks, so a board flagged onto the rotation on Tuesday
 * has to appear without somebody walking over to reload a television.
 */
export function useCarouselBoards(enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: BUILDER_QUERY_KEYS.carousel(currentCompany?.company_id),
    queryFn: () => builderApi.getCarouselBoards(),
    enabled,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
    retry: 1,
  });
}

export function useBuiltBoards() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: BUILDER_QUERY_KEYS.boards(currentCompany?.company_id),
    queryFn: () => builderApi.listBoards(),
    staleTime: 30_000,
  });
}

/**
 * One board's LAYOUT, for the editor.
 *
 * `staleTime: Infinity` and no refetch on focus, because this is the thing
 * being edited: a background refetch landing mid-drag would throw away an
 * arrangement somebody is halfway through.
 */
export function useBuiltBoard(slug: string | undefined) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: BUILDER_QUERY_KEYS.board(slug ?? '', currentCompany?.company_id),
    queryFn: () => builderApi.getBoard(slug as string),
    enabled: Boolean(slug),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/**
 * One board's FIGURES, for the viewer.
 *
 * Polled in the background for the same reason the plant board is: a built
 * board can end up on a wall nobody is focused on, and without
 * `refetchIntervalInBackground` a TV shows whatever was true when the tab last
 * had focus, which on a wall is forever.
 *
 * A failed round trip keeps the previous response on screen. A board that
 * blanks on one bad refresh is worse than one that is briefly a minute old.
 */
export function useBuiltBoardData(slug: string | undefined, enabled = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: BUILDER_QUERY_KEYS.data(slug ?? '', currentCompany?.company_id),
    queryFn: () => builderApi.getBoardData(slug as string),
    enabled: Boolean(slug) && enabled,
    staleTime: BUILT_BOARD_REFRESH_MS,
    refetchInterval: BUILT_BOARD_REFRESH_MS,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}

/**
 * Everything that changes a board.
 *
 * All of them invalidate the board's DATA as well as its layout, because a
 * card added in the editor has to appear on the viewer without waiting out the
 * poll interval — and, more sharply, because a card REMOVED in the editor must
 * stop being shown immediately.
 */
function useBoardMutation<TArgs, TResult>(
  run: (args: TArgs) => Promise<TResult>,
  slug?: string,
) {
  const { currentCompany } = useAuth();
  const client = useQueryClient();

  return useMutation<TResult, Error, TArgs>({
    mutationFn: run,
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: BUILDER_QUERY_KEYS.boards(currentCompany?.company_id),
      });
      if (slug) {
        void client.invalidateQueries({
          queryKey: BUILDER_QUERY_KEYS.board(slug, currentCompany?.company_id),
        });
        void client.invalidateQueries({
          queryKey: BUILDER_QUERY_KEYS.data(slug, currentCompany?.company_id),
        });
      }
    },
  });
}

export function useCreateBoard() {
  return useBoardMutation((draft: Partial<BoardDraft>) => builderApi.createBoard(draft));
}

export function useSaveBoard(slug: string) {
  return useBoardMutation(
    (draft: Partial<BoardDraft>) => builderApi.saveBoard(slug, draft),
    slug,
  );
}

export function useDeleteBoard() {
  return useBoardMutation((slug: string) => builderApi.deleteBoard(slug));
}

export function usePublishBoard(slug: string) {
  return useBoardMutation(
    (audience: number[] | undefined) => builderApi.publish(slug, audience),
    slug,
  );
}

export function useUnpublishBoard(slug: string) {
  return useBoardMutation(() => builderApi.unpublish(slug), slug);
}

export function useDuplicateBoard() {
  return useBoardMutation((slug: string) => builderApi.duplicate(slug));
}
