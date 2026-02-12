import { Toaster } from 'sonner'

import { AuthInitializer } from '@/core/auth/components/AuthInitializer'
import { PWAInstallPrompt } from '@/core/pwa/PWAInstallPrompt'
import { ErrorBoundary } from '@/shared/components'

import { AppProviders } from './providers'
import { AppRoutes } from './routes'

/**
 * Main App component
 * Wraps the application with providers, error boundary, and auth initialization
 */
function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AuthInitializer>
          <AppRoutes />
        </AuthInitializer>
        <Toaster richColors position="top-right" />
        <PWAInstallPrompt />
      </AppProviders>
    </ErrorBoundary>
  )
}

export default App
