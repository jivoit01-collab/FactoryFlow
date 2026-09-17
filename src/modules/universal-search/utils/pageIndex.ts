import { getAllNavigation, getAllRoutes } from '@/app/registry';
import type { ModuleNavItem } from '@/core/types';

import { tokenize } from './vocabulary';

/**
 * Every screen a person can be sent to, flattened out of the module registry.
 *
 * The registry is already the truth about what exists, what it is called and
 * who may open it, so the search indexes that rather than keeping a list of
 * its own — a second list would start out right and drift by the first
 * release.
 *
 * Two tiers, and the difference matters:
 *
 * * **navigation items** are the curated screens, with titles someone wrote on
 *   purpose. These are what the answer to "where do I put the material GRPO"
 *   should be;
 * * **routes with no navigation entry** are real pages that simply never got a
 *   sidebar line. They are indexed too, one rank below, labelled from their
 *   breadcrumb or their path, because a page you cannot navigate to is still a
 *   page you may need.
 *
 * Routes carrying a parameter (`/warehouse/bst/:transferId`) are left out of
 * both: there is no id to put in, so "going" there is not a thing the search
 * can do.
 */

export interface PageEntry {
  /** Where the page lives. Unique, and the key for the whole index. */
  path: string;
  /** What the sidebar calls it, or what the breadcrumb does. */
  title: string;
  /** The group it sits under: "Warehouse", "Gate". Empty for a top-level item. */
  section: string;
  /** Permissions that open it; empty means anyone signed in. */
  permissions: readonly string[];
  /** Companies it is restricted to; empty means all of them. */
  companies: readonly string[];
  /** A module prefix, when the item gates on "any permission in this app". */
  modulePrefix: string | readonly string[] | undefined;
  /** Curated sidebar entry, or a route that never got one. */
  tier: 'NAV' | 'ROUTE';
  /** Lowercase words of the title and its section, matched against the query. */
  terms: readonly string[];
}

/** A path segment that has to be filled in — `:id`, `*`. */
function isParameterised(path: string): boolean {
  return path.includes(':') || path.includes('*');
}

/** "/warehouse/grpo/material" -> "Material" when nothing better is on offer. */
function titleFromPath(path: string): string {
  const last = path.split('/').filter(Boolean).pop() ?? '';
  return last
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function entryTerms(title: string, section: string, path: string): string[] {
  // The path is indexed too: it holds words the title leaves out, which is how
  // "grpo" finds "Material GRPO" sitting at /warehouse/grpo/material even when
  // the section above it is called something else.
  return [...new Set([...tokenize(title), ...tokenize(section), ...tokenize(path)])];
}

/**
 * Flatten the navigation tree.
 *
 * A child inherits its parent's company restriction. In the sidebar it does not
 * need to — a child only ever renders underneath a visible parent, so the
 * parent's gate hides it implicitly — but a search result has no parent to hide
 * behind, and a Beverages-only page must not surface while the user is in Oil.
 */
function fromNavigation(): PageEntry[] {
  const entries: PageEntry[] = [];

  for (const item of getAllNavigation()) {
    entries.push(toEntry(item, '', item.companies ?? []));

    for (const child of item.children ?? []) {
      entries.push(toEntry(child, item.title, child.companies ?? item.companies ?? []));
      // Two levels is all the sidebar renders, so two levels is all there is.
      for (const grandchild of child.children ?? []) {
        entries.push(
          toEntry(
            grandchild,
            child.title,
            grandchild.companies ?? child.companies ?? item.companies ?? [],
          ),
        );
      }
    }
  }

  return entries;
}

function toEntry(
  item: ModuleNavItem,
  section: string,
  companies: readonly string[],
): PageEntry {
  return {
    path: item.path,
    title: item.title,
    section,
    permissions: item.permissions ?? [],
    companies,
    modulePrefix: item.modulePrefix,
    tier: 'NAV',
    terms: entryTerms(item.title, section, item.path),
  };
}

/** Pages that exist as routes but never got a sidebar line. */
function fromRoutes(claimed: Set<string>): PageEntry[] {
  const entries: PageEntry[] = [];

  for (const route of getAllRoutes()) {
    if (route.layout === 'auth') continue;
    if (isParameterised(route.path)) continue;
    if (claimed.has(route.path)) continue;
    claimed.add(route.path);

    const title = route.breadcrumb?.label || titleFromPath(route.path);
    if (!title) continue;

    entries.push({
      path: route.path,
      title,
      section: '',
      permissions: route.permissions ?? [],
      companies: route.companies ?? [],
      modulePrefix: undefined,
      tier: 'ROUTE',
      terms: entryTerms(title, '', route.path),
    });
  }

  return entries;
}

let cached: PageEntry[] | null = null;

/**
 * The whole index, built once.
 *
 * The registry is static for the life of the tab — modules are imported, not
 * fetched — so rebuilding this per keystroke would be pure waste.
 */
export function getPageIndex(): PageEntry[] {
  if (cached) return cached;

  const navigation = fromNavigation();
  const claimed = new Set(navigation.map((entry) => entry.path));
  cached = [...navigation, ...fromRoutes(claimed)];
  return cached;
}

/** Testing seam: drop the memoised index. */
export function resetPageIndex(): void {
  cached = null;
}
