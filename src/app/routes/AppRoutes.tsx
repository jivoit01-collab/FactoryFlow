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
// Gate module pages
const GateDashboardPage = lazy(() => import('@/modules/gate/pages/GateDashboardPage'))
const RawMaterialsPage = lazy(() => import('@/modules/gate/pages/RawMaterialsPage'))
const Step1Page = lazy(() => import('@/modules/gate/pages/rawmaterialpages/Step1Page'))
const Step2Page = lazy(() => import('@/modules/gate/pages/rawmaterialpages/Step2Page'))
const Step3Page = lazy(() => import('@/modules/gate/pages/rawmaterialpages/Step3Page'))
const DailyNeedsPage = lazy(() => import('@/modules/gate/pages/DailyNeedsPage'))
const MaintenancePage = lazy(() => import('@/modules/gate/pages/MaintenancePage'))
const ConstructionPage = lazy(() => import('@/modules/gate/pages/ConstructionPage'))
const ReturnableItemsPage = lazy(() => import('@/modules/gate/pages/ReturnableItemsPage'))
const VisitorPage = lazy(() => import('@/modules/gate/pages/VisitorPage'))
const EmployeePage = lazy(() => import('@/modules/gate/pages/EmployeePage'))
const ContractorLaborPage = lazy(() => import('@/modules/gate/pages/ContractorLaborPage'))

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

          {/* Gate Dashboard */}
          <Route
            path={ROUTES.GATE.path}
            element={
              <ProtectedRoute>
                <GateDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Gate Routes */}
          <Route
            path={ROUTES.GATE.children?.RAW_MATERIALS.path}
            element={
              <ProtectedRoute>
                <RawMaterialsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE.children?.RAW_MATERIALS_NEW.path}
            element={
              <ProtectedRoute>
                <Step1Page />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gate/raw-materials/new/step2"
            element={
              <ProtectedRoute>
                <Step2Page />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gate/raw-materials/new/step3"
            element={
              <ProtectedRoute>
                <Step3Page />
              </ProtectedRoute>
            }
          />
          {/* Edit routes */}
          <Route
            path="/gate/raw-materials/edit/:entryId/step1"
            element={
              <ProtectedRoute>
                <Step1Page />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gate/raw-materials/edit/:entryId/step2"
            element={
              <ProtectedRoute>
                <Step2Page />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gate/raw-materials/edit/:entryId/step3"
            element={
              <ProtectedRoute>
                <Step3Page />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE.children?.DAILY_NEEDS.path}
            element={
              <ProtectedRoute>
                <DailyNeedsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE.children?.MAINTENANCE.path}
            element={
              <ProtectedRoute>
                <MaintenancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE.children?.CONSTRUCTION.path}
            element={
              <ProtectedRoute>
                <ConstructionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE.children?.RETURNABLE_ITEMS.path}
            element={
              <ProtectedRoute>
                <ReturnableItemsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE.children?.VISITOR.path}
            element={
              <ProtectedRoute>
                <VisitorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE.children?.EMPLOYEE.path}
            element={
              <ProtectedRoute>
                <EmployeePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GATE.children?.CONTRACTOR_LABOR.path}
            element={
              <ProtectedRoute>
                <ContractorLaborPage />
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
