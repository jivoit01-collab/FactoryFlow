import { Download, X } from 'lucide-react'

import { APP_NAME } from '@/config/constants'
import { Button } from '@/shared/components/ui/button'

import { usePWAInstall } from './usePWAInstall'

export function PWAInstallPrompt() {
  const { showPrompt, install, dismiss } = usePWAInstall()

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold leading-none">Install {APP_NAME}</p>
            <p className="text-sm text-muted-foreground">
              Install the app for a faster, offline-ready experience.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        </div>
        <div className="mt-3 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={install}>
            <Download className="h-4 w-4" />
            Install
          </Button>
        </div>
      </div>
    </div>
  )
}
