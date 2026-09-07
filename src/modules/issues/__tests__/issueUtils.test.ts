import { describe, expect, it } from 'vitest';

import { labelTextColor, readQualifier, timeAgo, withQualifier } from '../utils';

/**
 * `withQualifier` is what makes the filter menus and the search box one control
 * rather than two. If it drifts, a menu pick silently stops matching what the
 * box shows — so its edges are worth pinning down.
 */
describe('editing a search qualifier', () => {
  it('adds a qualifier to an empty query', () => {
    expect(withQualifier('', 'label', 'bug')).toBe('label:bug');
  });

  it('appends alongside free text', () => {
    expect(withQualifier('gate pass', 'label', 'bug')).toBe('gate pass label:bug');
  });

  it('replaces the existing value rather than adding a second one', () => {
    expect(withQualifier('is:open label:bug', 'label', 'ui')).toBe('is:open label:ui');
  });

  it('removes the qualifier when the value is null', () => {
    expect(withQualifier('is:open label:bug scan', 'label', null)).toBe('is:open scan');
  });

  it('quotes a value containing a space', () => {
    expect(withQualifier('', 'label', 'data issue')).toBe('label:"data issue"');
  });

  it('replaces a negated qualifier too', () => {
    // Otherwise "-label:duplicate" and "label:bug" would both survive and fight.
    expect(withQualifier('-label:duplicate', 'label', 'bug')).toBe('label:bug');
  });

  it('leaves an unrelated qualifier with a similar prefix alone', () => {
    expect(withQualifier('assignee:@me', 'author', 'priya@example.com')).toBe(
      'assignee:@me author:priya@example.com',
    );
  });
});

describe('reading a search qualifier back', () => {
  it('finds a plain value', () => {
    expect(readQualifier('is:open label:bug', 'label')).toBe('bug');
  });

  it('unwraps a quoted value', () => {
    expect(readQualifier('label:"data issue"', 'label')).toBe('data issue');
  });

  it('returns empty when the qualifier is absent', () => {
    expect(readQualifier('is:open', 'label')).toBe('');
  });

  it('does not match a qualifier embedded in another word', () => {
    expect(readQualifier('mylabel:bug', 'label')).toBe('');
  });
});

describe('label chip contrast', () => {
  it('uses dark text on a light label', () => {
    // A near-white "wont fix" chip has to stay readable.
    expect(labelTextColor('#ffffff')).toBe('#111827');
  });

  it('uses light text on a dark label', () => {
    expect(labelTextColor('#b60205')).toBe('#ffffff');
  });

  it('falls back to dark text for a colour it cannot parse', () => {
    expect(labelTextColor('not-a-colour')).toBe('#111827');
  });

  it('understands a three-digit hex', () => {
    expect(labelTextColor('#fff')).toBe('#111827');
  });
});

describe('relative timestamps', () => {
  it('reads as "just now" for the present moment', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });

  it('counts hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe('3 hours ago');
  });

  it('says yesterday rather than "1 days ago"', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(yesterday)).toBe('yesterday');
  });

  it('switches to an absolute date past a month', () => {
    const longAgo = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(longAgo)).toMatch(/^on /);
  });

  it('renders nothing for a missing timestamp', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
  });
});
