import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { queryClient } from '@/core/api';
import { store } from '@/core/store';
import { ThemeProvider, useTheme } from '@/shared/contexts';

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
            <NotificationProvider>
              {children}
              <ThemedToaster />
            </NotificationProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
