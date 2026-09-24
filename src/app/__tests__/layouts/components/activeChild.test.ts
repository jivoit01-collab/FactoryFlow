import { describe, expect, it } from 'vitest';

import { activeChildPath } from '@/app/layouts/components/activeChild';

const organisation = [
  { path: '/organization' },
  { path: '/organization/attendance' },
  { path: '/organization/attendance/register' },
  { path: '/employees' },
  { path: '/employees/chart' },
];

describe('activeChildPath', () => {
  it('lights the most specific sibling, not the one it is nested under', () => {
    expect(activeChildPath(organisation, '/organization/attendance')).toBe(
      '/organization/attendance',
    );
    expect(activeChildPath(organisation, '/organization/attendance/register')).toBe(
      '/organization/attendance/register',
    );
    expect(activeChildPath(organisation, '/organization')).toBe('/organization');
  });

  it('keeps a detail page under its list entry', () => {
    expect(activeChildPath(organisation, '/employees/42')).toBe('/employees');
    expect(activeChildPath(organisation, '/employees/chart')).toBe('/employees/chart');
  });

  it('matches on whole segments only', () => {
    expect(activeChildPath([{ path: '/employees' }], '/employeesx')).toBeNull();
  });

  it('is null when the page is outside the group', () => {
    expect(activeChildPath(organisation, '/gate')).toBeNull();
  });
});
