import { useState } from 'react'
import { useAuth } from '@/core/auth'
import { useAppDispatch } from '@/core/store'
import { clearCurrentCompany } from '@/core/auth'
import { useNavigate } from 'react-router-dom'
import { indexedDBService } from '@/core/auth/services/indexedDb.service'
import { ROUTES } from '@/config/routes.config'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import { ChangePasswordDialog } from '../components/ChangePasswordDialog'
import {
  getInitials,
  formatDate,
  groupPermissionsByApp,
  formatPermissionName,
} from '../utils/profile.utils'

/**
 * ProfilePage component
 * Displays user information, roles (companies), and permissions
 */
export default function ProfilePage() {
  const { user, permissions, logout, currentCompany } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading user data...</p>
      </div>
    )
  }

  const groupedPermissions = groupPermissionsByApp(permissions)
  const initials = getInitials(user.full_name, user.email)

  const handleChangeCompany = async () => {
    try {
      // Clear current company from IndexedDB
      await indexedDBService.updateCurrentCompany(null)
      
      // Clear from Redux
      dispatch(clearCurrentCompany())
      
      // Navigate to company selection page
      navigate(ROUTES.COMPANY_SELECTION.path, { replace: true })
    } catch (error) {
      console.error('Failed to change company:', error)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
              {/* User Avatar */}
              <Avatar className="h-20 w-20 border-2 sm:h-24 sm:w-24">
                <AvatarFallback className="text-xl font-bold sm:text-2xl">{initials}</AvatarFallback>
              </Avatar>

              {/* User Details */}
              <div className="flex w-full flex-col gap-2 text-center sm:w-auto sm:text-left">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground sm:text-sm">employee_code</p>
                  <p className="text-sm font-medium break-words sm:text-base">{user.employee_code || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground sm:text-sm">employee name</p>
                  <p className="text-sm font-medium break-words sm:text-base">{user.full_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground sm:text-sm">email</p>
                  <p className="text-sm font-medium break-words sm:text-base">{user.email}</p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap justify-center gap-2 pt-2 sm:justify-start">
                  {user.is_active && (
                    <Badge variant="outline" className="border-green-500 text-green-500 text-xs">
                      Active
                    </Badge>
                  )}
                  {user.is_staff && (
                    <Badge variant="outline" className="border-blue-500 text-blue-500 text-xs">
                      Staff
                    </Badge>
                  )}
                </div>

                {/* Joined Date */}
                <div className="space-y-1 pt-2">
                  <p className="text-xs text-muted-foreground sm:text-sm">Joined On:</p>
                  <p className="text-sm font-medium break-words sm:text-base">{formatDate(user.date_joined)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsChangePasswordOpen(true)}
                className="w-full sm:w-auto"
              >
                Change Password
              </Button>
              {currentCompany && (
                <Button
                  variant="outline"
                  onClick={handleChangeCompany}
                  className="w-full sm:w-auto"
                >
                  Change Company
                </Button>
              )}
              <Button
                variant="outline"
                onClick={logout}
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground sm:w-auto"
              >
                Logout
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4 sm:p-6">
          {/* Roles Section */}
          <div>
            <CardTitle className="mb-4 text-lg sm:text-xl">Roles</CardTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {user.companies.map((company) => (
                <Card key={company.company_id} className="border">
                  <CardContent className="flex flex-col items-center justify-center p-3 text-center sm:p-4">
                    <p className="text-base font-semibold sm:text-lg">{company.role}</p>
                    <p className="text-xs text-muted-foreground sm:text-sm break-words">{company.company_name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Permissions Section */}
          <div>
            <CardTitle className="mb-4 text-lg sm:text-xl">Permissions</CardTitle>
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(groupedPermissions).map(([appLabel, appPermissions]) => (
                <div key={appLabel}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mb-3 sm:text-sm">
                    {appLabel}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {appPermissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="px-2 py-1 text-xs sm:px-3 sm:py-1">
                        {formatPermissionName(permission)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />
    </div>
  )
}
