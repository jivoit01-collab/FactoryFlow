/**
 * The builder's public surface.
 *
 * `./components` and `./types` both export a `CardViz` — the component and
 * the shape it draws — so the star exports are ordered and the type's name is
 * not re-exported from here. A consumer wanting the union imports it from
 * `../types` directly, which is where it is defined and where it reads
 * correctly.
 */
export * from './api';
export * from './components';
export * from './constants';
export * from './hooks';
export type {
  BoardAccent,
  BoardCard,
  BoardDataResponse,
  BoardDensity,
  BoardDetail,
  BoardDraft,
  BoardIdentity,
  BoardListResponse,
  BoardMeta,
  BoardMode,
  BoardSummary,
  BoardSurface,
  BoardVisibility,
  CardFill,
  CardOptionKind,
  CardOptionSpec,
  CardPayload,
  CardSpec,
  CardTag,
  CardTone,
  CardViz as CardVizShape,
  CatalogueResponse,
  Placement,
} from './types';
export * from './utils';
