import type { PageEntry } from './pageIndex';
import { getPageIndex } from './pageIndex';
import { ALIASES, requiredTerms, tokenize } from './vocabulary';

/**
 * Ranking screens against what somebody typed.
 *
 * Two passes, and the second only runs when the first comes back empty.
 *
 * **Strict.** Every meaningful word must be accounted for. This is what stops
 * "material grpo" offering the Finished Goods GRPO page just because it
 * matched "grpo" — a search that answers half the question puts the right page
 * third, and third is not found. Nearly every real query is answered here.
 *
 * **Partial.** If nothing survived that, the query is allowed to be sloppy:
 * pages matching *some* of the words come back, ranked by how many they
 * matched, provided at least one of them landed in the title. This is what
 * rescues "how do I make a bill" — nothing in this app is called "make", but
 * Bill Summaries is still the honest answer.
 *
 * A single pass cannot do both. Relaxing the rule outright fills a precise
 * query with near-misses; keeping it strict leaves an ordinary question
 * answered with nothing. Trying strict first costs one extra sweep of a few
 * hundred rows, and only on the rare query that needs it.
 *
 * Within a pass, more literal beats less: the title outranks the section above
 * it, which outranks the path underneath it.
 */

export interface PageHit {
  entry: PageEntry;
  score: number;
  /** Which words matched the title, for highlighting. */
  matched: readonly string[];
  /** Whether some word of the query went unmatched. */
  isPartial: boolean;
}

/** Results offered at once. Past this the list stops being a list. */
export const MAX_PAGE_HITS = 8;

const SCORE = {
  /** The title is exactly what was typed. */
  exactTitle: 1000,
  /** The title starts with what was typed. */
  titlePrefix: 400,
  /** A query word is a whole word of the title. */
  titleWord: 100,
  /** A query word starts one of the title's words. */
  titleWordPrefix: 60,
  /** A query word is a whole word of the section above it. */
  sectionWord: 30,
  /** A query word appears only in the path. */
  pathWord: 15,
  /** Reached only through an alias, not by the word itself. */
  aliasPenalty: -20,
  /** A page with no sidebar line of its own. */
  routeTierPenalty: -45,
  /** Each query word this page could not account for, in the partial pass. */
  unmatchedWordPenalty: -50,
};

export interface PageSearchContext {
  hasAnyPermission: (permissions: readonly string[]) => boolean;
  hasModulePermission: (prefix: string | readonly string[]) => boolean;
  companyCode: string | undefined;
}

/**
 * Whether this user, in this company, can open this page.
 *
 * Mirrors the sidebar's gate deliberately: a module prefix wins if there is
 * one, explicit permissions decide otherwise, and an item with neither is open
 * to anyone signed in.
 */
export function canOpen(entry: PageEntry, context: PageSearchContext): boolean {
  if (entry.companies.length && !entry.companies.includes(context.companyCode ?? '')) {
    return false;
  }
  if (entry.modulePrefix) {
    return context.hasModulePermission(entry.modulePrefix);
  }
  if (entry.permissions.length) {
    return context.hasAnyPermission(entry.permissions);
  }
  return true;
}

export function searchPages(query: string, context: PageSearchContext): PageHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const required = requiredTerms(trimmed);
  if (!required.length) return [];

  const normalisedQuery = tokenize(trimmed).join(' ');
  const open = getPageIndex().filter((entry) => canOpen(entry, context));

  const strict = rank(open, required, normalisedQuery, false);
  if (strict.length) return strict;

  return rank(open, required, normalisedQuery, true);
}

function rank(
  entries: PageEntry[],
  required: string[],
  normalisedQuery: string,
  allowPartial: boolean,
): PageHit[] {
  const hits: PageHit[] = [];

  for (const entry of entries) {
    const scored = scoreEntry(entry, required, normalisedQuery, allowPartial);
    if (scored) hits.push(scored);
  }

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      a.entry.title.length - b.entry.title.length ||
      a.entry.title.localeCompare(b.entry.title),
  );
  return collapseByPath(hits).slice(0, MAX_PAGE_HITS);
}

/**
 * One row per destination.
 *
 * A sidebar group usually shares its path with its own first child — "Accounts"
 * and "Cash Book (under Accounts)" are one page with two names — so an
 * un-collapsed list offers the same screen twice and wastes the slot on a
 * second answer the user did not ask for.
 *
 * The survivor is whichever scored higher for THIS query, which picks the
 * better label by itself: "cash book" keeps "Cash Book", "accounts" keeps
 * "Accounts". Relies on the list already being in descending score order.
 */
function collapseByPath(hits: PageHit[]): PageHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (seen.has(hit.entry.path)) return false;
    seen.add(hit.entry.path);
    return true;
  });
}

function scoreEntry(
  entry: PageEntry,
  required: string[],
  normalisedQuery: string,
  allowPartial: boolean,
): PageHit | null {
  const titleWords = tokenize(entry.title);
  const sectionWords = tokenize(entry.section);
  const pathWords = tokenize(entry.path);
  const normalisedTitle = titleWords.join(' ');

  let score = entry.tier === 'ROUTE' ? SCORE.routeTierPenalty : 0;
  const matched: string[] = [];
  let unmatched = 0;
  let matchedInTitle = false;

  for (const word of required) {
    const best = scoreWord(word, titleWords, sectionWords, pathWords);
    if (best === null) {
      // Strict pass: one word with nowhere to land disqualifies the page.
      if (!allowPartial) return null;
      unmatched += 1;
      score += SCORE.unmatchedWordPenalty;
      continue;
    }
    score += best.points;
    if (best.inTitle) {
      matched.push(word);
      matchedInTitle = true;
    }
  }

  // In the partial pass, landing only on the section or the path is not an
  // answer, it is a coincidence: "bill" should reach Bill Summaries by its
  // name, not because some unrelated page happens to have "bill" in its URL.
  if (allowPartial && !matchedInTitle) return null;

  if (normalisedTitle === normalisedQuery) {
    score += SCORE.exactTitle;
  } else if (normalisedTitle.startsWith(normalisedQuery)) {
    score += SCORE.titlePrefix;
  }

  return { entry, score, matched, isPartial: unmatched > 0 };
}

/**
 * The best place one query word lands, or `null` when it lands nowhere.
 *
 * Tried literally first and only then through its aliases, so a page that uses
 * the user's own word outranks one reached by translation.
 *
 * Only THIS word's aliases are tried. Letting a word be satisfied by some
 * other word's alias quietly dissolves the rule above it: searching "material
 * grpo" would return the FG GRPO page, because "material" would find itself
 * answered by the alias set that "grpo" dragged in.
 */
function scoreWord(
  word: string,
  titleWords: string[],
  sectionWords: string[],
  pathWords: string[],
): { points: number; inTitle: boolean } | null {
  const direct = placeWord(word, titleWords, sectionWords, pathWords);
  if (direct) return direct;

  for (const alias of ALIASES[word] ?? []) {
    if (alias === word) continue;
    const viaAlias = placeWord(alias, titleWords, sectionWords, pathWords);
    if (viaAlias) {
      return { points: viaAlias.points + SCORE.aliasPenalty, inTitle: viaAlias.inTitle };
    }
  }
  return null;
}

function placeWord(
  word: string,
  titleWords: string[],
  sectionWords: string[],
  pathWords: string[],
): { points: number; inTitle: boolean } | null {
  if (titleWords.includes(word)) return { points: SCORE.titleWord, inTitle: true };
  // A prefix counts so that "dash" finds Dashboards while it is still being
  // typed, but only from the start of a word: "ash" must not.
  if (titleWords.some((title) => title.startsWith(word))) {
    return { points: SCORE.titleWordPrefix, inTitle: true };
  }
  if (sectionWords.includes(word)) return { points: SCORE.sectionWord, inTitle: false };
  if (pathWords.some((segment) => segment.startsWith(word))) {
    return { points: SCORE.pathWord, inTitle: false };
  }
  return null;
}
