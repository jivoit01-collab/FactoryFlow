import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/core/api';

import { dailyTasksApi } from '../api/daily-tasks.api';
import { shiftLocalISO, todayLocalISO } from '../utils/date.utils';

vi.mock('@/core/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    DAILY_TASKS: {
      MY_TODAY: '/activity-center/me/today/',
      TEAM_TODAY: '/activity-center/users/today/',
    },
  },
}));

describe('dailyTasksApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
  });

  it('requests the personal sheet with no params when no date is given', async () => {
    await dailyTasksApi.getMySheet();
    expect(apiClient.get).toHaveBeenCalledWith('/activity-center/me/today/', { params: {} });
  });

  it('passes the date through when one is given', async () => {
    await dailyTasksApi.getMySheet({ date: '2026-07-30' });
    expect(apiClient.get).toHaveBeenCalledWith('/activity-center/me/today/', {
      params: { date: '2026-07-30' },
    });
  });

  it('requests the team board from its own endpoint', async () => {
    await dailyTasksApi.getTeamBoard({ date: '2026-07-30' });
    expect(apiClient.get).toHaveBeenCalledWith('/activity-center/users/today/', {
      params: { date: '2026-07-30' },
    });
  });

  it('unwraps response.data', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { date: '2026-07-30' } });
    await expect(dailyTasksApi.getMySheet()).resolves.toEqual({ date: '2026-07-30' });
  });
});

describe('local date helpers', () => {
  // The sheet is a local-calendar-day artifact. toISOString() would roll the date
  // back a day for any IST evening, silently showing yesterday's sheet.

  it('produces a YYYY-MM-DD string', () => {
    expect(todayLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('steps back across a month boundary', () => {
    expect(shiftLocalISO('2026-08-01', -1)).toBe('2026-07-31');
  });

  it('steps forward across a year boundary', () => {
    expect(shiftLocalISO('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles a leap day', () => {
    expect(shiftLocalISO('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('round-trips', () => {
    const today = todayLocalISO();
    expect(shiftLocalISO(shiftLocalISO(today, -1), 1)).toBe(today);
  });
});
