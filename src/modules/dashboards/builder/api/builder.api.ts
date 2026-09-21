import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BoardDataResponse,
  BoardDetail,
  BoardDraft,
  BoardListResponse,
  CatalogueResponse,
} from '../types';

export const builderApi = {
  /**
   * The palette.
   *
   * Already filtered server-side to the cards this login may read — a card
   * somebody cannot see is not greyed out here, it is absent, because listing
   * it by name tells them what exists behind a wall they cannot open.
   */
  async getCatalogue(): Promise<CatalogueResponse> {
    const response = await apiClient.get<CatalogueResponse>(
      API_ENDPOINTS.BOARD_BUILDER.CATALOGUE,
    );
    return response.data;
  },

  async listBoards(): Promise<BoardListResponse> {
    const response = await apiClient.get<BoardListResponse>(
      API_ENDPOINTS.BOARD_BUILDER.BOARDS,
    );
    return response.data;
  },

  async getBoard(slug: string): Promise<BoardDetail> {
    const response = await apiClient.get<BoardDetail>(
      API_ENDPOINTS.BOARD_BUILDER.BOARD(slug),
    );
    return response.data;
  },

  async createBoard(draft: Partial<BoardDraft>): Promise<BoardDetail> {
    const response = await apiClient.post<BoardDetail>(
      API_ENDPOINTS.BOARD_BUILDER.BOARDS,
      draft,
    );
    return response.data;
  },

  /**
   * Save an existing board.
   *
   * The whole layout goes every time, never a per-card patch. A drag is rarely
   * one change — moving a card displaces its neighbour, which displaces
   * another — so patching a placement at a time would walk the board through
   * states the server's overlap rule forbids. Sending the finished
   * arrangement makes every save atomic.
   */
  async saveBoard(slug: string, draft: Partial<BoardDraft>): Promise<BoardDetail> {
    const response = await apiClient.patch<BoardDetail>(
      API_ENDPOINTS.BOARD_BUILDER.BOARD(slug),
      draft,
    );
    return response.data;
  },

  /** Soft. An administrator can bring a board back; a wall nobody meant to
   *  clear is exactly the mistake worth being able to undo. */
  async deleteBoard(slug: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.BOARD_BUILDER.BOARD(slug));
  },

  /**
   * The figures.
   *
   * Never called by the editor. The editor draws placeholders instead, so
   * arranging a board costs no queries — a dozen cards re-running on every
   * drag would make the canvas unusable and the database unhappy.
   */
  async getBoardData(slug: string): Promise<BoardDataResponse> {
    const response = await apiClient.get<BoardDataResponse>(
      API_ENDPOINTS.BOARD_BUILDER.BOARD_DATA(slug),
    );
    return response.data;
  },

  /** `audience` empty means the whole company — still gated per card. */
  async publish(slug: string, audience?: number[]): Promise<BoardDetail> {
    const response = await apiClient.post<BoardDetail>(
      API_ENDPOINTS.BOARD_BUILDER.BOARD_PUBLISH(slug),
      audience ? { audience } : {},
    );
    return response.data;
  },

  async unpublish(slug: string): Promise<BoardDetail> {
    const response = await apiClient.delete<BoardDetail>(
      API_ENDPOINTS.BOARD_BUILDER.BOARD_PUBLISH(slug),
    );
    return response.data;
  },

  /**
   * The built wall boards this login may actually read, flagged onto the
   * rotation. Already filtered per board server-side — unlike the main list,
   * because a slide an unattended screen cannot read would rotate into view
   * and sit there as a grid of refusals.
   */
  async getCarouselBoards(): Promise<{
    boards: { slug: string; name: string; surface: string }[];
  }> {
    const response = await apiClient.get<{
      boards: { slug: string; name: string; surface: string }[];
    }>(API_ENDPOINTS.BOARD_BUILDER.CAROUSEL);
    return response.data;
  },

  /** Always lands as a private copy owned by whoever asked. */
  async duplicate(slug: string): Promise<BoardDetail> {
    const response = await apiClient.post<BoardDetail>(
      API_ENDPOINTS.BOARD_BUILDER.BOARD_DUPLICATE(slug),
    );
    return response.data;
  },
};
