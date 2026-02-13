import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthLayout, MainLayout } from '@/app/layouts';
import { getRoutesByLayout } from '@/app/registry';
import { ProtectedRoute } from '@/core/auth';
import { NotificationGate } from '@/core/notifications/components/NotificationGate';
import { PageLoadError } from '@/shared/components/PageLoadError';

// Unauthorized page
function UnauthorizedPage() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Unauthorized</h1>
      <p className="text-muted-foreground">You don't have permission to access this page.</p>
    </div>
  );
}

export function AppRoutes() {
  // Get routes organized by layout type from module registry
  const authRoutes = getRoutesByLayout('auth');
  const mainRoutes = getRoutesByLayout('main');

  return (
    <Suspense fallback={<PageLoadError />}>
      <Routes>
        {/* Auth routes (public) */}
        <Route element={<AuthLayout />}>
          {authRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>

        {/* Protected routes (require authentication + notification permission) */}
        <Route
          element={
            <ProtectedRoute>
              <NotificationGate>
                <MainLayout />
              </NotificationGate>
            </ProtectedRoute>
          }
        >
          {mainRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                route.permissions ? (
                  <ProtectedRoute permissions={route.permissions}>{route.element}</ProtectedRoute>
                ) : (
                  route.element
                )
              }
            />
          ))}

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
