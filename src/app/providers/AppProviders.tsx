import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { queryClient } from '@/core/api';
import { NotificationPermissionPrompt } from '@/core/notifications';
import { store } from '@/core/store';
import { ConfirmDialogHost } from '@/shared/components';
import { SettingsProvider, ThemeProvider, useTheme } from '@/shared/contexts';

import { CompanyThemeSync } from './CompanyThemeSync';
import { NotificationProvider } from './NotificationProvider';

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme} position="top-right" richColors closeButton />;
}

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <SettingsProvider>
              <NotificationProvider>
                {/* Mirrors the active company onto <html> so the company
                    palettes in index.css take effect app-wide. */}
                <CompanyThemeSync />
                {children}
                <NotificationPermissionPrompt />
                <ThemedToaster />
                <ConfirmDialogHost />
              </NotificationProvider>
            </SettingsProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
