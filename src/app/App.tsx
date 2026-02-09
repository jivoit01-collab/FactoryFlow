import { Toaster } from 'sonner'
import { AppProviders } from './providers'
import { AppRoutes } from './routes'
import { AuthInitializer } from '@/core/auth/components/AuthInitializer'
import { ErrorBoundary } from '@/shared/components'
import { PWAInstallPrompt } from '@/core/pwa/PWAInstallPrompt'

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
