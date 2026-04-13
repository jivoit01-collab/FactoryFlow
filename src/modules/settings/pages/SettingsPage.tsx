import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronUp, Shield, User } from 'lucide-react';
import { useMemo,useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { getAllNavigation } from '@/app/registry';
import { ROUTES } from '@/config/routes.config';
import { useAuth } from '@/core/auth';
import { ChangePasswordDialog } from '@/modules/auth/components/ChangePasswordDialog';
import {
  formatDate,
  getInitials,
  groupPermissionsByApp,
} from '@/modules/auth/utils/profile.utils';
import { Collapsible, CollapsibleContent } from '@/shared/components/ui';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

/**
 * Build a map from permission app label to module icon.
 * Derived from the module registry navigation so icons stay in sync automatically.
 *
 * Works by:
 * 1. Checking modulePrefix (direct app label mapping)
 * 2. Extracting app labels from permission strings (e.g. 'gate_core.view_entry' → 'gate_core')
 * 3. Extracting app labels from children's permissions too
 */
function buildAppLabelIconMap(): Record<string, LucideIcon> {
  const map: Record<string, LucideIcon> = {};
  const navItems = getAllNavigation();

  for (const item of navItems) {
    if (!item.icon) continue;

    // 1. Map from modulePrefix if available
    if (item.modulePrefix) {
      const prefixes = Array.isArray(item.modulePrefix)
        ? item.modulePrefix
        : [item.modulePrefix];
      for (const prefix of prefixes) {
        map[prefix] = item.icon;
      }
    }

    // 2. Extract app labels from this item's permissions
    if (item.permissions) {
      for (const perm of item.permissions) {
        const appLabel = perm.split('.')[0];
        if (appLabel && !map[appLabel]) {
          map[appLabel] = item.icon;
        }
      }
    }

    // 3. Extract app labels from children's permissions
    if (item.children) {
      for (const child of item.children) {
        if (child.permissions) {
          for (const perm of child.permissions) {
            const appLabel = perm.split('.')[0];
            if (appLabel && !map[appLabel]) {
              map[appLabel] = item.icon;
            }
          }
        }
      }
    }
  }

  return map;
}

const appLabelIconMap = buildAppLabelIconMap();

export default function SettingsPage() {
  const { user, permissions, logout, currentCompany, switchCompany } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const activeTab = searchParams.get('tab') || 'profile';

  const groupedPermissions = useMemo(
    () => groupPermissionsByApp(permissions),
    [permissions],
  );

  const initials = useMemo(
    () => getInitials(user?.full_name, user?.email),
    [user?.full_name, user?.email],
  );

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleSwitchCompany = async (company: (typeof user.companies)[0]) => {
    if (currentCompany?.company_id === company.company_id) return;
    try {
      await switchCompany(company);
      navigate(ROUTES.DASHBOARD.path, { replace: true });
    } catch (error) {
      console.error('Failed to switch company:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your profile and view permissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                  {/* User Avatar */}
                  <Avatar className="h-20 w-20 border-2 sm:h-24 sm:w-24">
                    <AvatarFallback className="text-xl font-bold sm:text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Details */}
                  <div className="flex w-full flex-col gap-2 text-center sm:w-auto sm:text-left">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground sm:text-sm">employee_code</p>
                      <p className="text-sm font-medium break-words sm:text-base">
                        {user.employee_code || 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground sm:text-sm">employee name</p>
                      <p className="text-sm font-medium break-words sm:text-base">
                        {user.full_name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground sm:text-sm">email</p>
                      <p className="text-sm font-medium break-words sm:text-base">{user.email}</p>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap justify-center gap-2 pt-2 sm:justify-start">
                      {user.is_active && (
                        <Badge
                          variant="outline"
                          className="border-green-500 text-green-500 text-xs"
                        >
                          Active
                        </Badge>
                      )}
                      {user.is_staff && (
                        <Badge
                          variant="outline"
                          className="border-blue-500 text-blue-500 text-xs"
                        >
                          Staff
                        </Badge>
                      )}
                    </div>

                    {/* Joined Date */}
                    <div className="space-y-1 pt-2">
                      <p className="text-xs text-muted-foreground sm:text-sm">Joined On:</p>
                      <p className="text-sm font-medium break-words sm:text-base">
                        {formatDate(user.date_joined)}
                      </p>
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
                  {user.companies.map((company) => {
                    const isCurrentCompany =
                      currentCompany?.company_id === company.company_id;
                    return (
                      <Card
                        key={company.company_id}
                        onClick={() => handleSwitchCompany(company)}
                        className={`border relative transition-colors ${
                          isCurrentCompany
                            ? 'border-primary border-2 bg-primary/5 ring-2 ring-primary/20'
                            : 'cursor-pointer hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        {isCurrentCompany && (
                          <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
                            Current
                          </Badge>
                        )}
                        <CardContent className="flex flex-col items-center justify-center p-3 text-center sm:p-4">
                          <p className="text-base font-semibold sm:text-lg">{company.role}</p>
                          <p className="text-xs text-muted-foreground sm:text-sm break-words">
                            {company.company_name}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-6">
          <Card>
            <CardContent className="flex flex-col gap-1 p-4 sm:p-6">
              {Object.keys(groupedPermissions).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No permissions assigned
                </p>
              ) : (
                Object.entries(groupedPermissions).map(([appLabel, appPermissions]) => (
                  <PermissionGroup
                    key={appLabel}
                    appLabel={appLabel}
                    permissions={appPermissions}
                    icon={appLabelIconMap[appLabel]}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </div>
  );
}

/**
 * Collapsible permission group - matches sidebar dropdown style
 */
function PermissionGroup({
  appLabel,
  permissions,
  icon,
}: {
  appLabel: string;
  permissions: string[];
  icon?: LucideIcon;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = icon || Shield;

  // Format module name: replace underscores with spaces and title-case
  const moduleName = appLabel
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  // Format permission codename
  const formatName = (permission: string) => {
    const codename = permission.split('.').slice(1).join('.');
    return codename
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left"
      >
        <Icon className="h-5 w-5" />
        <span>{moduleName}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {permissions.length}
        </Badge>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      <CollapsibleContent className="px-3 pb-2">
        <div className="flex flex-wrap gap-2">
          {permissions.map((permission) => (
            <Badge
              key={permission}
              variant="outline"
              className="px-2 py-1 text-xs sm:px-3 sm:py-1"
            >
              {formatName(permission)}
            </Badge>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
