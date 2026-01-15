import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout, AuthLayout } from '@/app/layouts'
import { ProtectedRoute } from '@/core/auth'
import { ROUTES } from '@/config/routes.config'

// Lazy load modules
const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'))
const CompanySelectionPage = lazy(() => import('@/modules/auth/pages/CompanySelectionPage'))
const LoadingUserPage = lazy(() => import('@/modules/auth/pages/LoadingUserPage'))
const ProfilePage = lazy(() => import('@/modules/auth/pages/ProfilePage'))
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'))
const GateInListPage = lazy(() => import('@/modules/gateIn/pages/GateInListPage'))
const GateInDetailPage = lazy(() => import('@/modules/gateIn/pages/GateInDetailPage'))
const QualityCheckListPage = lazy(() => import('@/modules/qualityCheck/pages/QualityCheckListPage'))
const QualityCheckDetailPage = lazy(
  () => import('@/modules/qualityCheck/pages/QualityCheckDetailPage')
)

// Loading fallback
function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

// Unauthorized page
function UnauthorizedPage() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Unauthorized</h1>
      <p className="text-muted-foreground">You don't have permission to access this page.</p>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN.path} element={<LoginPage />} />
          <Route path={ROUTES.COMPANY_SELECTION.path} element={<CompanySelectionPage />} />
          <Route path={ROUTES.LOADING_USER.path} element={<LoadingUserPage />} />
        </Route>

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route
            path={ROUTES.DASHBOARD.path}
            element={
              <ProtectedRoute permissions={ROUTES.DASHBOARD.permissions}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Gate In */}
          <Route
            path={ROUTES.GATE_IN.path}
            element={
              <ProtectedRoute permissions={ROUTES.GATE_IN.permissions}>
                <GateInListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE_IN.children?.CREATE.path}
            element={
              <ProtectedRoute permissions={ROUTES.GATE_IN.children?.CREATE.permissions}>
                <GateInDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE_IN.children?.DETAIL.path}
            element={
              <ProtectedRoute permissions={ROUTES.GATE_IN.children?.DETAIL.permissions}>
                <GateInDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Quality Check */}
          <Route
            path={ROUTES.QUALITY_CHECK.path}
            element={
              <ProtectedRoute permissions={ROUTES.QUALITY_CHECK.permissions}>
                <QualityCheckListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.QUALITY_CHECK.children?.CREATE.path}
            element={
              <ProtectedRoute permissions={ROUTES.QUALITY_CHECK.children?.CREATE.permissions}>
                <QualityCheckDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.QUALITY_CHECK.children?.DETAIL.path}
            element={
              <ProtectedRoute permissions={ROUTES.QUALITY_CHECK.children?.DETAIL.permissions}>
                <QualityCheckDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route path={ROUTES.PROFILE.path} element={<ProfilePage />} />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
