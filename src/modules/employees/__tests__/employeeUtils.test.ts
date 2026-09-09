/**
 * Tests for the module's pure helpers.
 *
 * These are the pieces where a quiet mistake would be visible on every screen
 * and obvious to nobody: money that is grouped the wrong way for the country it
 * is read in, a tenure that is a month out, and — the one that actually breaks
 * a page — the tree helpers that decide which branches a search opens.
 */
import { describe, expect, it } from 'vitest';

import type { OrgTreeNode } from '../types';
import {
  changeLabel,
  dateLabel,
  flattenTree,
  idsToDepth,
  idsToRevealMatches,
  money,
  moneyShort,
  nodeMatches,
  tenure,
  treeDepth,
} from '../utils';

/** A node with only the fields the helpers read. */
function node(id: number, name: string, children: OrgTreeNode[] = []): OrgTreeNode {
  return {
    id,
    employee_code: `EMP00${id}`,
    full_name: name,
    email: '',
    phone: '',
    photo: null,
    initials: name.slice(0, 1),
    job_title: '',
    department: null,
    department_name: null,
    designation: null,
    designation_name: null,
    employment_status: 'ACTIVE',
    status_display: 'Active',
    hierarchy_level: 1,
    is_manager: children.length > 0,
    location: '',
    direct_report_count: children.length,
    manager_id: null,
    subtree_size: 0,
    children,
  };
}

/**
 *   Arun
 *   ├── Priya
 *   │   └── Sandeep
 *   │       └── Kavya
 *   └── Rajesh
 */
const FOREST = [
  node(1, 'Arun', [
    node(2, 'Priya', [node(3, 'Sandeep', [node(4, 'Kavya')])]),
    node(5, 'Rajesh'),
  ]),
];

describe('money', () => {
  it('groups rupees the Indian way', () => {
    // ₹7,20,000 — not ₹720,000. The grouping is the point.
    expect(money('720000')).toBe('₹7,20,000');
    expect(money(5000000)).toBe('₹50,00,000');
  });

  it('reads null as nothing rather than as zero', () => {
    expect(money(null)).toBe('—');
    expect(money(undefined)).toBe('—');
    expect(money('')).toBe('—');
  });

  it('keeps a foreign currency in its own notation', () => {
    expect(money('72000', 'USD')).toBe('USD 72,000');
  });

  it('abbreviates in lakh and crore, which is how the numbers are said', () => {
    expect(moneyShort('720000')).toBe('₹7.2L');
    expect(moneyShort('12400000')).toBe('₹1.24Cr');
    expect(moneyShort('45000')).toBe('₹45K');
  });
});

describe('changeLabel', () => {
  const revision = {
    id: 1,
    revision_type: 'ANNUAL_INCREMENT' as const,
    revision_type_display: 'Annual Increment',
    previous_amount: '600000',
    new_amount: '720000',
    change_amount: '120000',
    change_percent: 20,
    reason: '',
    notes: '',
    effective_date: '2026-04-01',
    revision_date: '2026-03-15',
  };

  it('shows the rise and the percentage together', () => {
    expect(changeLabel(revision)).toBe('+₹1,20,000 · 20.0%');
  });

  it('marks a cut with a minus, not a bare number', () => {
    expect(changeLabel({ ...revision, change_amount: '-50000', change_percent: -8.3 })).toBe(
      '−₹50,000 · 8.3%',
    );
  });

  it('has nothing to compare a joining salary against', () => {
    expect(changeLabel({ ...revision, change_amount: null, previous_amount: null })).toBe('—');
  });
});

describe('dates', () => {
  it('formats a date the one way the module formats dates', () => {
    expect(dateLabel('2026-04-01')).toBe('01 Apr 2026');
    expect(dateLabel(null)).toBe('—');
    expect(dateLabel('not a date')).toBe('—');
  });

  it('counts tenure in whole years and months', () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 3);
    expect(tenure(twoYearsAgo.toISOString().slice(0, 10))).toBe('2y 3m');
  });

  it('does not claim tenure for somebody who has not started', () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expect(tenure(nextYear.toISOString().slice(0, 10))).toBe('starts soon');
  });
});

describe('tree helpers', () => {
  it('flattens the whole forest', () => {
    expect(flattenTree(FOREST).map((person) => person.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('measures how deep the tree runs', () => {
    expect(treeDepth(FOREST)).toBe(4);
  });

  it('opens exactly the branches asked for', () => {
    // One level of branches = the root opened, so its children show and theirs
    // do not. Two levels also opens the children that have teams.
    expect([...idsToDepth(FOREST, 1)]).toEqual([1]);
    expect([...idsToDepth(FOREST, 2)].sort()).toEqual([1, 2, 5]);
  });

  it('matches a search against the things people type', () => {
    const person = FOREST[0].children[0];
    expect(nodeMatches(person, 'priya')).toBe(true);
    expect(nodeMatches(person, 'EMP002')).toBe(true);
    expect(nodeMatches(person, 'sandeep')).toBe(false);
    // An empty box matches nobody, rather than everybody.
    expect(nodeMatches(person, '   ')).toBe(false);
  });

  it('reveals only the branches leading to a match', () => {
    // Kavya is four levels down: her ancestors have to open, and Rajesh's
    // branch must stay shut.
    const reveal = idsToRevealMatches(FOREST, 'Kavya');
    expect([...reveal].sort()).toEqual([1, 2, 3]);
  });

  it('reveals nothing for an empty search', () => {
    expect(idsToRevealMatches(FOREST, '').size).toBe(0);
  });
});
