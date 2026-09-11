/**
 * Small helpers the issue screens share.
 */

import type { IssueLabel, IssuePriority } from './types';

/**
 * "3 minutes ago", "2 days ago", "on 4 Mar 2026".
 *
 * An issue list is read as a stream of recent activity, so relative time is
 * what makes it legible. Past about a month it flips to an absolute date --
 * "7 weeks ago" is harder to place than the date itself.
 */
export function timeAgo(value?: string | null): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 45) return 'just now';
  if (seconds < 90) return 'a minute ago';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;

  return `on ${new Date(then).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

/** Full timestamp, for the `title` tooltip behind every relative time. */
export function exactTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Black or white text for a label chip, whichever stays readable on its colour.
 *
 * Labels are user-coloured, so nothing can be assumed about contrast: a white
 * "wontfix" and a dark red "bug" both have to be legible. Uses the standard
 * sRGB luminance so the switch happens where the eye expects.
 */
export function labelTextColor(hex: string): string {
  const parsed = parseHex(hex);
  if (!parsed) return '#111827';
  const [red, green, blue] = parsed;
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

/** A faint version of the label colour, for the chip's border. */
export function labelBorderColor(hex: string): string {
  const parsed = parseHex(hex);
  if (!parsed) return '#d1d5db';
  const [red, green, blue] = parsed;
  const darken = (channel: number) => Math.max(0, Math.round(channel * 0.75));
  return `rgb(${darken(red)}, ${darken(green)}, ${darken(blue)})`;
}

function parseHex(hex: string): [number, number, number] | null {
  const cleaned = (hex || '').trim().replace('#', '');
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((character) => character + character)
          .join('')
      : cleaned;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;
  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ];
}

/** Priority chip styling. Urgent has to be visible from across the list. */
export const PRIORITY_STYLE: Record<IssuePriority, string> = {
  URGENT: 'border-red-300 bg-red-50 text-red-700',
  HIGH: 'border-orange-300 bg-orange-50 text-orange-700',
  MEDIUM: 'border-slate-300 bg-slate-50 text-slate-600',
  LOW: 'border-slate-200 bg-slate-50 text-slate-500',
};

/** Sort options offered in the list header, in the order they are shown. */
export const SORT_OPTIONS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'priority', label: 'Priority' },
  { value: 'comments', label: 'Most commented' },
] as const;

/**
 * Add, replace or remove one `key:value` qualifier in the search box text.
 *
 * The dropdown filters and the text box edit the same string, so picking
 * "Label: bug" from the menu has to write `label:bug` into the query rather
 * than keeping a second, separate filter state that could disagree with what
 * the box says.
 */
export function withQualifier(query: string, key: string, value: string | null): string {
  const pattern = new RegExp(`(^|\\s)-?${key}:(?:"[^"]*"|'[^']*'|[^\\s]+)`, 'gi');
  const stripped = query.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
  if (!value) return stripped;
  const quoted = /\s/.test(value) ? `"${value}"` : value;
  return stripped ? `${stripped} ${key}:${quoted}` : `${key}:${quoted}`;
}

/** Read back the first value of a qualifier, so a menu can show what is active. */
export function readQualifier(query: string, key: string): string {
  const match = new RegExp(`(?:^|\\s)${key}:("[^"]*"|'[^']*'|[^\\s]+)`, 'i').exec(query);
  if (!match) return '';
  return match[1].replace(/^["']|["']$/g, '');
}

/** Labels sorted the way the picker shows them. */
export function sortLabels(labels: IssueLabel[]): IssueLabel[] {
  return [...labels].sort(
    (left, right) => left.sequence - right.sequence || left.name.localeCompare(right.name),
  );
}

/** A human size for an attachment row. */
export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
