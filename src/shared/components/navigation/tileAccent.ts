import { type AccentKey, ACCENTS } from '@/shared/components/dashboard/accents';

/**
 * Nearest accent for a hue a module already names — either a Tailwind text
 * class it stores (`text-purple-600`) or the bare hue. Hues outside the shared
 * palette fold onto their closest neighbour so no caller has to be rewritten
 * to adopt the tiles.
 */
const HUE_ALIASES: Record<string, AccentKey> = {
  green: 'emerald',
  purple: 'violet',
  fuchsia: 'pink',
  yellow: 'amber',
  red: 'rose',
  gray: 'slate',
  zinc: 'slate',
  neutral: 'slate',
  stone: 'slate',
  lime: 'emerald',
  primary: 'blue',
};

export function tileAccent(hint: string | undefined, fallback: AccentKey = 'slate'): AccentKey {
  if (!hint) return fallback;
  const hue = hint.match(/(?:text|bg|border)-([a-z]+)-/)?.[1] ?? hint;
  if (hue in ACCENTS) return hue as AccentKey;
  return HUE_ALIASES[hue] ?? fallback;
}

/**
 * Accent for the nth tile in a grid whose items name no colour of their own.
 * Deterministic, so a tile keeps its colour as the page re-renders.
 */
const TILE_ACCENT_CYCLE: AccentKey[] = [
  'blue',
  'emerald',
  'violet',
  'amber',
  'cyan',
  'rose',
  'indigo',
  'teal',
  'orange',
  'sky',
  'pink',
  'slate',
];

export function tileAccentByIndex(index: number): AccentKey {
  return TILE_ACCENT_CYCLE[index % TILE_ACCENT_CYCLE.length];
}
