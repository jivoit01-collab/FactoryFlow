// ═══════════════════════════════════════════════════════════════
// Users API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that usersApi exports exist, call the correct
// endpoint, and return the expected data shape.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    ACCOUNTS: { USERS: '/accounts/users/' },
  },
}));

import { usersApi } from '../../api/users.api';

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({
    data: [{ id: 1, email: 'a@b.com', full_name: 'Alice' }],
  });
});

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('usersApi', () => {
  it('is defined as an object', () => {
    expect(usersApi).toBeDefined();
    expect(typeof usersApi).toBe('object');
  });

  it('has a getUsers method', () => {
    expect(typeof usersApi.getUsers).toBe('function');
  });

  it('only exposes getUsers as a method', () => {
    expect(Object.keys(usersApi)).toEqual(['getUsers']);
  });

  // ═══════════════════════════════════════════════════════════════
  // getUsers behaviour
  // ═══════════════════════════════════════════════════════════════

  it('calls apiClient.get with /accounts/users/', async () => {
    await usersApi.getUsers();
    expect(mockGet).toHaveBeenCalledWith('/accounts/users/');
  });

  it('returns response.data (array)', async () => {
    const result = await usersApi.getUsers();
    expect(result).toEqual([{ id: 1, email: 'a@b.com', full_name: 'Alice' }]);
  });

  it('returns empty array when API returns empty', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const result = await usersApi.getUsers();
    expect(result).toEqual([]);
  });

  it('propagates API errors', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    await expect(usersApi.getUsers()).rejects.toThrow('Network error');
  });
});
