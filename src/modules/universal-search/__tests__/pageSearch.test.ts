import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModuleNavItem, ModuleRoute } from '@/core/types';

const navigation: ModuleNavItem[] = [];
const routes: ModuleRoute[] = [];

vi.mock('@/app/registry', () => ({
  getAllNavigation: () => navigation,
  getAllRoutes: () => routes,
}));

import { resetPageIndex } from '../utils/pageIndex';
import type { PageSearchContext } from '../utils/pageSearch';
import { searchPages } from '../utils/pageSearch';
import { isWorthAskingSap, queryTerms, requiredTerms } from '../utils/vocabulary';

/** A user who holds everything, so scoring can be tested without permissions. */
const ANYONE: PageSearchContext = {
  hasAnyPermission: () => true,
  hasModulePermission: () => true,
  companyCode: 'JIVO_OIL',
};

function setRegistry(nav: ModuleNavItem[], extraRoutes: ModuleRoute[] = []) {
  navigation.length = 0;
  navigation.push(...nav);
  routes.length = 0;
  routes.push(...extraRoutes);
  resetPageIndex();
}

/** A slice of the real sidebar, shaped the way the modules declare it. */
function realisticNav(): ModuleNavItem[] {
  return [
    {
      path: '/warehouse',
      title: 'Warehouse',
      showInSidebar: true,
      hasSubmenu: true,
      permissions: ['warehouse.view_bst'],
      children: [
        {
          path: '/warehouse/bill-summaries',
          title: 'Bill Summaries',
          permissions: ['warehouse.view_bill_summary'],
        },
        { path: '/warehouse/grpo/material', title: 'Material GRPO', permissions: ['grpo.view'] },
        {
          path: '/warehouse/grpo/fg',
          title: 'Finished Goods GRPO',
          permissions: ['grpo.view'],
        },
        { path: '/warehouse/bst', title: 'BST Scanning', permissions: ['warehouse.view_bst'] },
        {
          path: '/warehouse/rm-stock',
          title: 'Raw Material Stock',
          permissions: ['warehouse.view_rm_stock'],
        },
      ],
    },
    {
      path: '/dashboards',
      title: 'Dashboards',
      showInSidebar: true,
      hasSubmenu: true,
      modulePrefix: 'dashboards',
      children: [
        { path: '/dashboards/dispatch', title: 'Dispatch Board' },
        { path: '/dashboards/production', title: 'Production Board' },
      ],
    },
    {
      path: '/gate',
      title: 'Gate',
      showInSidebar: true,
      hasSubmenu: true,
      children: [
        { path: '/gate/new', title: 'New Entry', permissions: ['gate.view'] },
        { path: '/gate/raw-materials', title: 'Raw Materials', permissions: ['gate.view'] },
        { path: '/gate/sales-dispatch', title: 'Sales Dispatch', permissions: ['gate.view'] },
      ],
    },
  ];
}

function titles(query: string, context: PageSearchContext = ANYONE): string[] {
  return searchPages(query, context).map((hit) => hit.entry.title);
}

describe('page search', () => {
  beforeEach(() => setRegistry(realisticNav()));

  it('finds a page by its plain name', () => {
    expect(titles('material grpo')[0]).toBe('Material GRPO');
  });

  it('answers a question, not just a keyword', () => {
    // The whole reason the stop-word list exists.
    expect(titles('where do i put the material grpo')[0]).toBe('Material GRPO');
  });

  it('does not let a half-match outrank the whole one', () => {
    // "Finished Goods GRPO" matches "grpo" but not "material", so it must not
    // come back at all -- a search that answers half the question buries the
    // right page.
    expect(titles('material grpo')).not.toContain('Finished Goods GRPO');
  });

  it('finds every page under a word that names a group', () => {
    const found = titles('dashboard');

    expect(found).toContain('Dashboards');
    expect(found).toContain('Dispatch Board');
  });

  it('matches while the word is still being typed', () => {
    expect(titles('dash')).toContain('Dashboards');
  });

  it('does not match the middle of a word', () => {
    // "ash" inside "Dashboards" is a coincidence, not an intention.
    expect(titles('ash')).not.toContain('Dashboards');
  });

  it('prefers the exact title over one that merely contains it', () => {
    expect(titles('warehouse')[0]).toBe('Warehouse');
  });

  it('finds a page through what people actually call it', () => {
    // Nobody says "Goods Receipt PO"; they say GRN.
    expect(titles('material grn')).toContain('Material GRPO');
  });

  it('ranks the page using the user’s own word above one reached by alias', () => {
    const found = titles('raw material stock');

    expect(found[0]).toBe('Raw Material Stock');
  });

  it('finds a page by its group plus its own name', () => {
    // "gate" is the section, "entry" is the title -- neither alone is enough.
    expect(titles('gate entry')[0]).toBe('New Entry');
  });

  it('falls back to a partial match when nothing matches in full', () => {
    // Nothing here is called "make", but Bill Summaries is still the honest
    // answer to "how do I make a bill".
    const found = searchPages('how do i make a bill', ANYONE);

    expect(found.map((hit) => hit.entry.title)).toContain('Bill Summaries');
    expect(found.every((hit) => hit.isPartial)).toBe(true);
  });

  it('does not fall back when the query matched in full', () => {
    // The strict pass answered, so the near-misses must stay out.
    const found = searchPages('material grpo', ANYONE);

    expect(found.every((hit) => !hit.isPartial)).toBe(true);
    expect(found.map((hit) => hit.entry.title)).not.toContain('Finished Goods GRPO');
  });

  it('will not call a section-only or path-only brush a partial match', () => {
    // "bst" lands in the Warehouse group's path; that is a coincidence, not an
    // answer, so a partial pass must not offer "Warehouse" for "bst zzz".
    const found = searchPages('bst zzzz', ANYONE).map((hit) => hit.entry.title);

    expect(found).not.toContain('Warehouse');
    expect(found).toContain('BST Scanning');
  });

  it('returns nothing for a word that means nothing here', () => {
    expect(titles('helicopter')).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    expect(titles('   ')).toEqual([]);
  });

  it('survives a query that is only stop words', () => {
    // "how do i" has no target; it must not throw or match everything.
    expect(() => titles('how do i')).not.toThrow();
  });
});

describe('page search permissions', () => {
  beforeEach(() => setRegistry(realisticNav()));

  it('hides a page the user cannot open', () => {
    const noGrpo: PageSearchContext = {
      hasAnyPermission: (permissions) => !permissions.includes('grpo.view'),
      hasModulePermission: () => true,
      companyCode: 'JIVO_OIL',
    };

    expect(titles('grpo', noGrpo)).not.toContain('Material GRPO');
  });

  it('honours a module prefix the way the sidebar does', () => {
    const noDashboards: PageSearchContext = {
      hasAnyPermission: () => true,
      hasModulePermission: (prefix) => prefix !== 'dashboards',
      companyCode: 'JIVO_OIL',
    };

    expect(titles('dashboards', noDashboards)).not.toContain('Dashboards');
  });

  it('shows a page that asks for no permission at all', () => {
    const nobody: PageSearchContext = {
      hasAnyPermission: () => false,
      hasModulePermission: () => false,
      companyCode: 'JIVO_OIL',
    };

    expect(titles('dispatch board', nobody)).toContain('Dispatch Board');
  });

  it('hides a page restricted to another company', () => {
    setRegistry([
      {
        path: '/blowing',
        title: 'Blowing',
        showInSidebar: true,
        companies: ['JIVO_BEVERAGES'],
      },
    ]);

    expect(titles('blowing')).toEqual([]);
    expect(titles('blowing', { ...ANYONE, companyCode: 'JIVO_BEVERAGES' })).toEqual([
      'Blowing',
    ]);
  });

  it('applies a parent’s company restriction to its children', () => {
    // The sidebar does not need to -- a child only renders under a visible
    // parent -- but a flat result list has no parent to hide behind.
    setRegistry([
      {
        path: '/blowing',
        title: 'Blowing',
        showInSidebar: true,
        companies: ['JIVO_BEVERAGES'],
        children: [{ path: '/blowing/runs', title: 'Blowing Runs' }],
      },
    ]);

    expect(titles('blowing runs')).toEqual([]);
  });
});

describe('pages that never got a sidebar line', () => {
  it('indexes a plain route, below the curated ones', () => {
    setRegistry(realisticNav(), [
      {
        path: '/warehouse/grpo/material/history',
        element: null,
        breadcrumb: { label: 'Material GRPO History' },
      },
    ]);

    const found = titles('material grpo');

    expect(found).toContain('Material GRPO History');
    // The curated page still wins.
    expect(found[0]).toBe('Material GRPO');
  });

  it('leaves out a route that needs an id filled in', () => {
    setRegistry([], [{ path: '/warehouse/bst/:transferId', element: null }]);

    expect(titles('bst')).toEqual([]);
  });

  it('leaves out a wildcard route', () => {
    setRegistry([], [{ path: '/goods-return/*', element: null }]);

    expect(titles('goods return')).toEqual([]);
  });

  it('leaves out the login screens', () => {
    setRegistry([], [{ path: '/login', element: null, layout: 'auth' }]);

    expect(titles('login')).toEqual([]);
  });

  it('names a route from its path when it has no breadcrumb', () => {
    setRegistry([], [{ path: '/warehouse/rm-stock', element: null }]);

    expect(titles('rm stock')).toContain('Rm Stock');
  });
});

describe('vocabulary', () => {
  it('drops the question and keeps the target', () => {
    expect(requiredTerms('where do i put the material grpo')).toEqual([
      'material',
      'grpo',
    ]);
  });

  it('keeps the original words when the query is all question', () => {
    expect(requiredTerms('how do i')).toEqual(['how', 'do', 'i']);
  });

  it('expands a word into what it is known by', () => {
    expect(queryTerms('grn')).toContain('grpo');
  });

  it('keeps the word the user typed alongside its aliases', () => {
    expect(queryTerms('bill')).toContain('bill');
    expect(queryTerms('bill')).toContain('invoice');
  });
});

describe('when SAP is worth asking', () => {
  it('asks for a bill number', () => {
    expect(isWorthAskingSap('626090411')).toBe(true);
  });

  it('asks for an item code', () => {
    expect(isWorthAskingSap('FG0000030')).toBe(true);
  });

  it('asks for a batch, which has spaces in it', () => {
    expect(isWorthAskingSap('L2004403 092616 01')).toBe(true);
  });

  it('does not send a sentence to three company databases', () => {
    expect(isWorthAskingSap('where do i put the material grpo')).toBe(false);
  });
});
