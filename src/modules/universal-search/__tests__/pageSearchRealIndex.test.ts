import { describe, expect, it, vi } from 'vitest';

// The registry and the Redux store import each other -- the registry pulls in
// every module config, a config reaches the store, and rootReducer calls
// getAllReducers() at module scope. The app only survives it because it enters
// the graph from main.tsx; a test entering from a leaf hits the half-built
// registry. Stubbing the store cuts the loop at the end that does not matter
// here, so the REAL registry can load.
vi.mock('@/core/store', () => ({
  useAppSelector: () => undefined,
  useAppDispatch: () => () => undefined,
  store: {},
}));

import { getPageIndex } from '../utils/pageIndex';
import type { PageSearchContext } from '../utils/pageSearch';
import { searchPages } from '../utils/pageSearch';

/**
 * The page search against the REAL module registry, not a fixture.
 *
 * The fixtures next door prove the scoring rules. This proves the thing that
 * fixtures cannot: that the rules still find the right screen among two
 * hundred real ones, with the titles the modules actually declare. When
 * somebody renames a sidebar entry and these fail, that is the test doing its
 * job -- the phrase people type has stopped reaching the page.
 */

const ANYONE: PageSearchContext = {
  hasAnyPermission: () => true,
  hasModulePermission: () => true,
  companyCode: 'JIVO_OIL',
};

function titles(query: string): string[] {
  return searchPages(query, ANYONE).map((hit) => hit.entry.title);
}

describe('the real page index', () => {
  it('has indexed the whole app', () => {
    // Enough to be the real registry rather than an empty import.
    expect(getPageIndex().length).toBeGreaterThan(100);
  });

  it('gives every entry something to match on', () => {
    expect(getPageIndex().every((entry) => entry.terms.length > 0)).toBe(true);
  });

  it('never indexes a path that needs filling in', () => {
    const parameterised = getPageIndex().filter(
      (entry) => entry.path.includes(':') || entry.path.includes('*'),
    );

    expect(parameterised).toEqual([]);
  });

  it('knows a group can share its path with its own first child', () => {
    // /accounts/cash-book is both the "Accounts" group and its "Cash Book"
    // child. The index keeps both names; the search collapses them.
    const paths = getPageIndex().map((entry) => entry.path);

    expect(new Set(paths).size).toBeLessThan(paths.length);
  });

  it('never offers the same destination twice', () => {
    for (const query of ['cash book', 'gate', 'dashboard', 'marketplace']) {
      const paths = searchPages(query, ANYONE).map((hit) => hit.entry.path);

      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('keeps the label that fits the query', () => {
    expect(titles('cash book')[0]).toBe('Cash Book');
    expect(titles('gate')[0]).toBe('Gate');
  });
});

describe('what people actually type', () => {
  it('“where do i put the material grpo” finds the Material GRPO page', () => {
    expect(titles('where do i put the material grpo')[0]).toBe('Material GRPO');
  });

  it('“material grpo” finds it just the same', () => {
    expect(titles('material grpo')[0]).toBe('Material GRPO');
  });

  it('“dashboard” finds dashboards', () => {
    expect(titles('dashboard').length).toBeGreaterThan(0);
  });

  it('“gate entry” finds a gate page', () => {
    const found = searchPages('gate entry', ANYONE);

    expect(found.length).toBeGreaterThan(0);
    expect(found[0].entry.path.startsWith('/gate')).toBe(true);
  });

  it('“bst” finds the branch stock transfer screens', () => {
    expect(titles('bst').length).toBeGreaterThan(0);
  });

  it('“sap reports” finds the reports page', () => {
    expect(titles('sap reports').length).toBeGreaterThan(0);
  });

  it('a word from nowhere near this factory finds nothing', () => {
    expect(titles('helicopter')).toEqual([]);
  });
});
