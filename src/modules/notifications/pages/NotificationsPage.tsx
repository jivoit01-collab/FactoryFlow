import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCheck, Loader2, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils'
import { useNotificationList } from '@/core/notifications/hooks'
import { Authorized } from '@/core/auth'
import { NOTIFICATION_PERMISSIONS } from '@/config/permissions'
import type { Notification } from '@/core/notifications'

const PAGE_SIZE = 20

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

type FilterType = 'all' | 'unread' | 'read'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(0)

  const {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationList()

  const fetchPage = useCallback(
    (pageNum: number, filterType: FilterType) => {
      const params: { limit: number; offset: number; is_read?: boolean } = {
        limit: PAGE_SIZE,
        offset: pageNum * PAGE_SIZE,
      }
      if (filterType === 'unread') params.is_read = false
      if (filterType === 'read') params.is_read = true
      loadNotifications(params)
    },
    [loadNotifications]
  )

  useEffect(() => {
    fetchPage(page, filter)
  }, [page, filter, fetchPage])

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter)
    setPage(0)
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead([notification.id])
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
          <Authorized permissions={[NOTIFICATION_PERMISSIONS.SEND]}>
            <Button size="sm" onClick={() => navigate('/notifications/send')}>
              <Send className="mr-2 h-4 w-4" />
              Send Notification
            </Button>
          </Authorized>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1 w-fit">
        {([
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
          { key: 'read', label: 'Read' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleFilterChange(key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filter === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="rounded-lg border">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm">
              {filter === 'unread'
                ? 'No unread notifications'
                : filter === 'read'
                  ? 'No read notifications'
                  : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-accent sm:px-6',
                  !notification.is_read && 'bg-accent/50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm',
                        !notification.is_read ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground/70">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.body}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1 || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
