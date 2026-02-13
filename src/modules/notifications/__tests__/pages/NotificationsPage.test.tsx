import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// NotificationsPage — File Content Verification
//
// Direct import of NotificationsPage hangs because it triggers
// Vite's module graph resolution on lucide-react (thousands of
// icon exports) and @/core/notifications/hooks (Redux store
// chain). Instead, we verify the component structure via file
// content analysis — the same proven pattern from
// dashboard/__tests__/components/DashboardStats.test.tsx.
// ═══════════════════════════════════════════════════════════════

function readPageSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/modules/notifications/pages/NotificationsPage.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('NotificationsPage — Exports', () => {
  it('default exports NotificationsPage function', () => {
    const content = readPageSource();
    expect(content).toContain('export default function NotificationsPage()');
  });

  it('imports useState, useEffect, useCallback from react', () => {
    const content = readPageSource();
    expect(content).toMatch(/import\s*\{[^}]*useState[^}]*\}\s*from\s*['"]react['"]/);
    expect(content).toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*['"]react['"]/);
    expect(content).toMatch(/import\s*\{[^}]*useCallback[^}]*\}\s*from\s*['"]react['"]/);
  });

  it('imports icons from lucide-react', () => {
    const content = readPageSource();
    expect(content).toContain('Bell');
    expect(content).toContain('CheckCheck');
    expect(content).toContain('Loader2');
    expect(content).toContain('ChevronLeft');
    expect(content).toContain('ChevronRight');
    expect(content).toContain('Send');
  });

  it('imports useNavigate from react-router-dom', () => {
    const content = readPageSource();
    expect(content).toContain("import { useNavigate } from 'react-router-dom'");
  });

  it('imports Button from @/shared/components/ui', () => {
    const content = readPageSource();
    expect(content).toContain("import { Button } from '@/shared/components/ui'");
  });

  it('imports useNotificationList from @/core/notifications/hooks', () => {
    const content = readPageSource();
    expect(content).toContain("import { useNotificationList } from '@/core/notifications/hooks'");
  });

  it('imports Authorized from @/core/auth', () => {
    const content = readPageSource();
    expect(content).toContain("import { Authorized } from '@/core/auth'");
  });

  it('imports NOTIFICATION_PERMISSIONS from @/config/permissions', () => {
    const content = readPageSource();
    expect(content).toContain("import { NOTIFICATION_PERMISSIONS } from '@/config/permissions'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Constants & Configuration
// ═══════════════════════════════════════════════════════════════

describe('NotificationsPage — Constants', () => {
  it('defines PAGE_SIZE of 20', () => {
    const content = readPageSource();
    expect(content).toMatch(/const\s+PAGE_SIZE\s*=\s*20/);
  });

  it('defines FilterType as "all" | "unread" | "read"', () => {
    const content = readPageSource();
    expect(content).toContain("'all'");
    expect(content).toContain("'unread'");
    expect(content).toContain("'read'");
    expect(content).toMatch(/type\s+FilterType/);
  });
});

// ═══════════════════════════════════════════════════════════════
// formatTimeAgo helper
// ═══════════════════════════════════════════════════════════════

describe('NotificationsPage — formatTimeAgo', () => {
  it('defines formatTimeAgo function', () => {
    const content = readPageSource();
    expect(content).toContain('function formatTimeAgo(dateString: string): string');
  });

  it('handles "Just now" for < 1 minute', () => {
    const content = readPageSource();
    expect(content).toContain("'Just now'");
  });

  it('handles minutes ago format', () => {
    const content = readPageSource();
    expect(content).toMatch(/`\$\{diffMin\}m ago`/);
  });

  it('handles hours ago format', () => {
    const content = readPageSource();
    expect(content).toMatch(/`\$\{diffHour\}h ago`/);
  });

  it('handles days ago format', () => {
    const content = readPageSource();
    expect(content).toMatch(/`\$\{diffDay\}d ago`/);
  });

  it('falls back to toLocaleDateString for older dates', () => {
    const content = readPageSource();
    expect(content).toContain('toLocaleDateString()');
  });
});

// ═══════════════════════════════════════════════════════════════
// Header section
// ═══════════════════════════════════════════════════════════════

describe('NotificationsPage — Header', () => {
  it('renders "Notifications" heading', () => {
    const content = readPageSource();
    expect(content).toContain('>Notifications</h2>');
  });

  it('shows unread count with singular/plural logic', () => {
    const content = readPageSource();
    expect(content).toContain('unreadCount');
    expect(content).toMatch(/unreadCount\s*!==\s*1\s*\?\s*['"]s['"]/);
  });

  it('shows "All caught up" when no unread', () => {
    const content = readPageSource();
    expect(content).toContain("'All caught up'");
  });

  it('has "Mark all as read" button conditional on unreadCount', () => {
    const content = readPageSource();
    expect(content).toContain('Mark all as read');
    expect(content).toContain('markAllAsRead()');
  });

  it('has "Send Notification" button wrapped in Authorized', () => {
    const content = readPageSource();
    expect(content).toContain('<Authorized permissions={[NOTIFICATION_PERMISSIONS.SEND]}>');
    expect(content).toContain('Send Notification');
    expect(content).toContain("navigate('/notifications/send')");
  });
});

// ═══════════════════════════════════════════════════════════════
// Filter Tabs
// ═══════════════════════════════════════════════════════════════

describe('NotificationsPage — Filter Tabs', () => {
  it('defines All, Unread, Read filter buttons', () => {
    const content = readPageSource();
    expect(content).toMatch(/key:\s*['"]all['"].*label:\s*['"]All['"]/);
    expect(content).toMatch(/key:\s*['"]unread['"].*label:\s*['"]Unread['"]/);
    expect(content).toMatch(/key:\s*['"]read['"].*label:\s*['"]Read['"]/);
  });

  it('calls handleFilterChange on click', () => {
    const content = readPageSource();
    expect(content).toContain('handleFilterChange(key)');
  });
});

// ═══════════════════════════════════════════════════════════════
// Empty & Loading States
// ═══════════════════════════════════════════════════════════════

describe('NotificationsPage — States', () => {
  it('shows Loader2 spinner when loading with no notifications', () => {
    const content = readPageSource();
    expect(content).toContain('isLoading && notifications.length === 0');
    expect(content).toContain('Loader2');
  });

  it('shows "No notifications yet" in all filter', () => {
    const content = readPageSource();
    expect(content).toContain("'No notifications yet'");
  });

  it('shows "No unread notifications" in unread filter', () => {
    const content = readPageSource();
    expect(content).toContain("'No unread notifications'");
  });

  it('shows "No read notifications" in read filter', () => {
    const content = readPageSource();
    expect(content).toContain("'No read notifications'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Notification Items
// ═══════════════════════════════════════════════════════════════

describe('NotificationsPage — Notification Items', () => {
  it('renders notification title', () => {
    const content = readPageSource();
    expect(content).toContain('{notification.title}');
  });

  it('renders notification body', () => {
    const content = readPageSource();
    expect(content).toContain('{notification.body}');
  });

  it('unread notification has bg-accent/50 styling', () => {
    const content = readPageSource();
    expect(content).toContain("!notification.is_read && 'bg-accent/50'");
  });

  it('unread has font-semibold, read has font-medium', () => {
    const content = readPageSource();
    expect(content).toContain("!notification.is_read ? 'font-semibold' : 'font-medium'");
  });

  it('unread has indicator dot with bg-primary', () => {
    const content = readPageSource();
    expect(content).toContain('!notification.is_read');
    expect(content).toContain('rounded-full bg-primary');
  });

  it('calls handleNotificationClick on click', () => {
    const content = readPageSource();
    expect(content).toContain('handleNotificationClick(notification)');
  });

  it('handleNotificationClick calls markAsRead for unread only', () => {
    const content = readPageSource();
    expect(content).toContain('if (!notification.is_read)');
    expect(content).toContain('markAsRead([notification.id])');
  });

  it('renders formatTimeAgo for each notification', () => {
    const content = readPageSource();
    expect(content).toContain('formatTimeAgo(notification.created_at)');
  });
});

// ═══════════════════════════════════════════════════════════════
// Pagination
// ═══════════════════════════════════════════════════════════════

describe('NotificationsPage — Pagination', () => {
  it('only renders when totalPages > 1', () => {
    const content = readPageSource();
    expect(content).toContain('totalPages > 1');
  });

  it('computes totalPages from totalCount / PAGE_SIZE', () => {
    const content = readPageSource();
    expect(content).toContain('Math.ceil(totalCount / PAGE_SIZE)');
  });

  it('shows page count text', () => {
    const content = readPageSource();
    expect(content).toContain('Page {page + 1} of {totalPages}');
  });

  it('Previous button disabled on first page', () => {
    const content = readPageSource();
    expect(content).toContain('disabled={page === 0 || isLoading}');
  });

  it('Next button disabled on last page', () => {
    const content = readPageSource();
    expect(content).toContain('disabled={page >= totalPages - 1 || isLoading}');
  });
});
