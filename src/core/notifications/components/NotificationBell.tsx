import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Popover, PopoverContent, PopoverTrigger, Separator } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useUnreadCount } from '../hooks';
import { notificationService } from '../notification.service';
import type { Notification } from '../types';

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: (notification: Notification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={cn(
        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
        !notification.is_read && 'bg-accent/50',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'text-sm truncate',
              !notification.is_read ? 'font-semibold' : 'font-medium',
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // Local state for the bell popover — avoids overwriting the shared Redux items
  const [bellItems, setBellItems] = useState<Notification[]>([]);
  const [bellLoading, setBellLoading] = useState(false);
  const { unreadCount, refresh: refreshUnreadCount } = useUnreadCount();

  // Refetch unread count when the tab/PWA becomes visible again
  // (covers background notifications received while the user was away)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshUnreadCount]);

  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setBellLoading(true);
      try {
        const response = await notificationService.getNotifications({
          limit: 4,
          is_read: false,
        });
        setBellItems(response.results);
      } catch {
        // Silently fail — popover will show empty state
      } finally {
        setBellLoading(false);
      }
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setBellItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      refreshUnreadCount();
    } catch {
      // handled by apiClient
    }
  }, [refreshUnreadCount]);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!notification.is_read) {
        try {
          await notificationService.markAsRead([notification.id]);
          setBellItems((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
          );
          refreshUnreadCount();
        } catch {
          // handled by apiClient
        }
      }
      navigate(`/notifications/${notification.id}`);
    },
    [navigate, refreshUnreadCount],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto">
          {bellLoading && bellItems.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : bellItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No unread notifications</p>
            </div>
          ) : (
            bellItems.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <Separator />
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-full py-1.5 text-xs text-muted-foreground"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
