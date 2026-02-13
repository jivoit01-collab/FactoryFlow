// ═══════════════════════════════════════════════════════════════
// Send Notification API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that sendNotificationApi exports exist, call the
// correct endpoint, pass data, and return the expected shape.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPost = vi.fn();

vi.mock('@/core/api', () => ({
  apiClient: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    NOTIFICATIONS: { SEND: '/notifications/send/' },
  },
}));

import { sendNotificationApi } from '../../api/sendNotification.api';

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({
    data: { message: 'Sent successfully', recipients_count: 5 },
  });
});

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('sendNotificationApi', () => {
  it('is defined as an object', () => {
    expect(sendNotificationApi).toBeDefined();
    expect(typeof sendNotificationApi).toBe('object');
  });

  it('has a send method', () => {
    expect(typeof sendNotificationApi.send).toBe('function');
  });

  it('only exposes send as a method', () => {
    expect(Object.keys(sendNotificationApi)).toEqual(['send']);
  });

  // ═══════════════════════════════════════════════════════════════
  // send() behaviour
  // ═══════════════════════════════════════════════════════════════

  it('calls apiClient.post with correct endpoint', async () => {
    await sendNotificationApi.send({ title: 'T', body: 'B' });
    expect(mockPost).toHaveBeenCalledWith('/notifications/send/', { title: 'T', body: 'B' });
  });

  it('passes request data as second argument', async () => {
    const data = { title: 'Hello', body: 'World', notification_type: 'GENERAL_ANNOUNCEMENT' };
    await sendNotificationApi.send(data);
    expect(mockPost.mock.calls[0][1]).toEqual(data);
  });

  it('returns response.data', async () => {
    const result = await sendNotificationApi.send({ title: 'T', body: 'B' });
    expect(result).toEqual({ message: 'Sent successfully', recipients_count: 5 });
  });

  it('handles all optional fields in request', async () => {
    const fullRequest = {
      title: 'Test',
      body: 'Body',
      notification_type: 'QC_REJECTED',
      click_action_url: '/test',
      recipient_user_ids: [1, 2],
      role_filter: 'QC',
    };
    await sendNotificationApi.send(fullRequest);
    expect(mockPost).toHaveBeenCalledWith('/notifications/send/', fullRequest);
  });

  it('propagates API errors', async () => {
    mockPost.mockRejectedValueOnce(new Error('Server error'));
    await expect(sendNotificationApi.send({ title: 'T', body: 'B' })).rejects.toThrow(
      'Server error',
    );
  });
});
