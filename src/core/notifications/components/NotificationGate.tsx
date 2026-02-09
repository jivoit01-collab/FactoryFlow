import { useState, useEffect, useCallback } from 'react'
import { BellOff, Bell } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

/**
 * Full-screen gate that blocks the app until the user grants notification permission.
 * Shown only when Notification.permission is 'default' (not yet decided) or 'denied'.
 */
export function NotificationGate({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)

  useEffect(() => {
    if (!('Notification' in window)) {
      // Browser doesn't support notifications — let the user through
      setPermission('granted')
      return
    }
    setPermission(Notification.permission)
  }, [])

  const requestPermission = useCallback(async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
    } catch {
      setPermission(Notification.permission)
    }
  }, [])

  // Still checking
  if (permission === null) return null

  // Permission granted — render the app
  if (permission === 'granted') return <>{children}</>

  const isDenied = permission === 'denied'

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {isDenied ? (
            <BellOff className="h-8 w-8 text-destructive" />
          ) : (
            <Bell className="h-8 w-8 text-primary" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Enable Notifications</h1>
          <p className="text-muted-foreground">
            Sampooran requires notification permissions to keep you updated on gate entries,
            quality checks, and approvals.
          </p>
        </div>

        {isDenied ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">
              Notifications are blocked for this site.
            </p>
            <p className="text-sm text-muted-foreground">
              To unblock, click the lock/settings icon in your browser's address bar, set
              Notifications to "Allow", then reload the page.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        ) : (
          <Button size="lg" onClick={requestPermission}>
            <Bell className="h-4 w-4" />
            Allow Notifications
          </Button>
        )}
      </div>
    </div>
  )
}
