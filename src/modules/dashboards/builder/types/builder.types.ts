/**
 * The builder's wire types.
 *
 * WHY THE CARD PAYLOAD IS A UNION AND NOT A `Record<string, unknown>`
 * --------------------------------------------------------------------
 * The whole promise of this feature is that adding the twentieth card is a
 * backend change and nothing else. That only survives if the renderer knows
 * every shape a card can be — which means the set of shapes has to be closed,
 * and the compiler has to be the thing that says so. `CardViz` below is that
 * closed set, mirroring `board_builder/viz.py` exactly.
 *
 * If a card ever returns a shape not in this union, the server refuses it
 * (`viz.validate`) before it reaches a screen. The two lists are checked
 * against each other by a test on each side rather than by a generator: they
 * change about once a year, and a generator would be a build step nobody
 * remembers owning.
 */

/** Mirrors `OpsTagTone`. `nil` is "no source", which is not a condition. */
export type CardTone = 'neut' | 'ok' | 'warn' | 'bad' | 'nil';

/** Which tint of the card's hue a bar wears. Never a literal colour. */
export type CardFill = 'main' | 'light' | 'mute';

/** The hues a card or board may wear. Mirrors `CARD_ACCENTS`. */
export type BoardAccent =
  | 'warehouse'
  | 'dispatch'
  | 'transport'
  | 'purchase'
  | 'store'
  | 'production'
  | 'shifting';

export type BoardSurface = 'light' | 'dark';
export type BoardDensity = 'compact' | 'normal' | 'roomy';
export type BoardMode = 'WALL' | 'PAGE';
export type BoardVisibility = 'PRIVATE' | 'PUBLISHED';

export interface CardTag {
  label: string;
  tone: CardTone;
}

export type CardViz =
  | { kind: 'none' }
  | { kind: 'meter'; segments: { label: string; value: number; fill: CardFill }[] }
  | { kind: 'bars'; days: { label: string; value: number; current: boolean }[] }
  | {
      kind: 'pair';
      rows: { label: string; value: number; fill: CardFill }[];
      note: string;
    }
  | {
      kind: 'matrix';
      columns: string[];
      rows: { label: string; cells: (number | null)[] }[];
      caption: string;
    }
  | { kind: 'table'; columns: string[]; rows: string[][]; aligns: ('left' | 'right')[] }
  | { kind: 'split'; parts: { label: string; value: string }[] };

/**
 * What one card computed.
 *
 * `null` where a card did not run at all. WHICH of the reasons applies is in
 * `meta` — named in `withheld` or `degraded` — and never inferred from the
 * null, because those two send a reader to two different people.
 */
export interface CardPayload {
  value: string;
  unit: string;
  sub: string;
  tag: CardTag | null;
  viz: CardViz | null;
  note: string;
  /** Why there is no figure. A rule renders where the value goes. */
  missing: string | null;
}

/** One card on a board, as the viewer receives it. */
export interface BoardCard {
  id: number;
  card_key: string;
  title: string;
  accent: BoardAccent;
  column: number;
  row: number;
  columns: number;
  rows: number;
  category: string;
  note: string;
  payload: CardPayload | null;
}

export interface BoardMeta {
  /** Tried to read it and could not. Sends an operator to the server room. */
  degraded: string[];
  /** Did not try, because this reader may not see it. Sends them to an admin. */
  withheld: string[];
  /** The card was removed from the catalogue since this board was saved. */
  retired: string[];
  /** The card no longer fits where it was put. */
  misplaced: string[];
  warnings: string[];
  generated_at: string;
}

export interface BoardIdentity {
  slug: string;
  name: string;
  description: string;
  mode: BoardMode;
  columns: number;
  rows: number;
  surface: BoardSurface;
  density: BoardDensity;
  accent: BoardAccent;
  show_heading: boolean;
  visibility: BoardVisibility;
  in_carousel: boolean;
}

export interface BoardDataResponse {
  board: BoardIdentity;
  cards: BoardCard[];
  meta: BoardMeta;
}

// ---------------------------------------------------------------------------
// The editor's side
// ---------------------------------------------------------------------------

export type CardOptionKind = 'int' | 'choice' | 'bool';

export interface CardOptionSpec {
  key: string;
  label: string;
  kind: CardOptionKind;
  default: string | number | boolean;
  minimum: number;
  maximum: number;
  choices: { value: string; label: string }[];
  help: string;
}

/** One entry in the palette. */
export interface CardSpec {
  key: string;
  title: string;
  summary: string;
  category: string;
  /** The card's FIXED footprint. Not the author's to change. */
  columns: number;
  rows: number;
  accent: BoardAccent;
  note: string;
  needs_sap: boolean;
  options: CardOptionSpec[];
}

export interface CatalogueResponse {
  cards: CardSpec[];
  categories: string[];
  accents: BoardAccent[];
  surfaces: BoardSurface[];
  densities: BoardDensity[];
  limits: {
    min_columns: number;
    max_columns: number;
    min_rows: number;
    /** Keyed by mode: a wall board is capped shorter, because it cannot scroll. */
    max_rows: Record<BoardMode, number>;
  };
}

/** A placement as the editor holds it and sends it back. */
export interface Placement {
  id?: number;
  card_key: string;
  /** The catalogue's own name, so the editor can offer to restore it. */
  card_title?: string;
  column: number;
  row: number;
  /** Echoed from the catalogue. Read-only — the footprint is the card's. */
  columns?: number;
  rows?: number;
  title: string;
  accent: BoardAccent | '';
  options: Record<string, string | number | boolean>;
}

export interface BoardDetail extends BoardIdentity {
  id: number;
  audience: number[];
  owner_name: string;
  placements: Placement[];
  max_rows: number;
  max_columns: number;
  published_at: string | null;
  updated_at: string;
}

export interface BoardSummary {
  id: number;
  slug: string;
  name: string;
  description: string;
  mode: BoardMode;
  columns: number;
  rows: number;
  surface: BoardSurface;
  accent: BoardAccent;
  visibility: BoardVisibility;
  in_carousel: boolean;
  owner_name: string;
  card_count: number;
  is_mine: boolean;
  updated_at: string;
}

export interface BoardListResponse {
  boards: BoardSummary[];
  /** So the list can show or hide "New board" without guessing from a 403. */
  can_build: boolean;
}

/** What a save sends. The layout is replaced whole — see the serializer. */
export interface BoardDraft {
  name: string;
  description: string;
  mode: BoardMode;
  columns: number;
  rows: number;
  surface: BoardSurface;
  density: BoardDensity;
  accent: BoardAccent;
  show_heading: boolean;
  in_carousel: boolean;
  placements: Placement[];
}
