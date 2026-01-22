# Layout Components

This document describes the layout system and components used in the Factory Management System.

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Shell                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       Header                              │   │
│  │  [Logo]              [Breadcrumbs]           [User Menu]  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────┐ ┌────────────────────────────────────────────┐   │
│  │          │ │                                            │   │
│  │          │ │                                            │   │
│  │ Sidebar  │ │              Main Content                  │   │
│  │          │ │              (Outlet)                      │   │
│  │          │ │                                            │   │
│  │          │ │                                            │   │
│  │          │ │                                            │   │
│  └──────────┘ └────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Components

Location: `src/app/layouts/`

```
src/app/layouts/
├── MainLayout.tsx       # Primary authenticated layout
├── AuthLayout.tsx       # Authentication pages layout
└── components/
    ├── Header.tsx       # Top navigation bar
    ├── Sidebar.tsx      # Desktop sidebar navigation
    ├── MobileSidebar.tsx # Mobile responsive sidebar
    └── Breadcrumbs.tsx  # Navigation breadcrumbs
```

## MainLayout

The primary layout for authenticated pages.

### Features

- Responsive sidebar (collapsible on desktop, slide-out on mobile)
- Fixed header with user menu
- Breadcrumb navigation
- Main content area with outlet

### Implementation

```typescript
// src/app/layouts/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileSidebar } from './components/MobileSidebar';
import { Breadcrumbs } from './components/Breadcrumbs';

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        onMenuClick={() => setMobileOpen(true)}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex">
        {/* Desktop Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 transition-all duration-200',
            sidebarCollapsed ? 'ml-16' : 'ml-64',
            'md:ml-0' // Reset on mobile
          )}
        >
          <div className="p-6">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
```

## AuthLayout

Minimal layout for authentication pages.

### Features

- Centered content
- No sidebar
- Optional branding/logo
- Clean, focused design

### Implementation

```typescript
// src/app/layouts/AuthLayout.tsx
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Factory Flow</h1>
          <p className="text-muted-foreground">
            Factory Management System
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
```

## Header Component

Top navigation bar with user controls.

### Features

- Mobile menu toggle
- Desktop sidebar toggle
- User avatar and dropdown
- Optional notifications
- Theme toggle (if implemented)

### Implementation

```typescript
// src/app/layouts/components/Header.tsx
import { useAuth } from '@/core/auth/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui';

interface HeaderProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
}

export function Header({ onMenuClick, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 h-16 border-b bg-background/95 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={onToggleSidebar}
          >
            <PanelLeftIcon className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <span className="font-semibold">Factory Flow</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.name?.charAt(0) ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

## Sidebar Component

Desktop navigation sidebar.

### Features

- Collapsible width (256px ↔ 64px)
- Dynamic menu from route configuration
- Active state highlighting
- Nested menu support with collapsible sections
- Permission-based menu filtering

### Implementation

```typescript
// src/app/layouts/components/Sidebar.tsx
import { NavLink, useLocation } from 'react-router-dom';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { SIDEBAR_MENU } from '@/config/routes.config';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/components/ui';

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const { hasPermission } = usePermission();

  // Filter menu items by permission
  const visibleMenu = SIDEBAR_MENU.filter((item) =>
    !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] border-r bg-background transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
        'hidden md:block'
      )}
    >
      <nav className="p-2 space-y-1">
        {visibleMenu.map((item) =>
          item.children ? (
            <CollapsibleMenuItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              currentPath={location.pathname}
            />
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground'
                )
              }
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}

function CollapsibleMenuItem({ item, collapsed, currentPath }) {
  const isChildActive = item.children?.some(
    (child) => currentPath.startsWith(child.path)
  );

  return (
    <Collapsible defaultOpen={isChildActive}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          'flex items-center justify-between rounded-md px-3 py-2 text-sm',
          'hover:bg-accent hover:text-accent-foreground',
          isChildActive && 'bg-accent/50'
        )}>
          <div className="flex items-center gap-3">
            {item.icon && <item.icon className="h-4 w-4" />}
            {!collapsed && <span>{item.label}</span>}
          </div>
          {!collapsed && <ChevronDownIcon className="h-4 w-4" />}
        </div>
      </CollapsibleTrigger>
      {!collapsed && (
        <CollapsibleContent>
          <div className="ml-6 space-y-1 mt-1">
            {item.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-2 text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground'
                  )
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
```

## MobileSidebar Component

Slide-out sidebar for mobile devices.

### Features

- Sheet-based slide-out panel
- Full navigation menu
- Touch-friendly
- Closes on navigation

### Implementation

```typescript
// src/app/layouts/components/MobileSidebar.tsx
import { Sheet, SheetContent } from '@/shared/components/ui';
import { NavLink, useNavigate } from 'react-router-dom';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0">
        <div className="p-4 border-b">
          <span className="font-semibold">Factory Flow</span>
        </div>
        <nav className="p-2">
          {/* Same menu structure as Sidebar */}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

## Breadcrumbs Component

Navigation breadcrumb trail.

### Features

- Dynamic breadcrumb generation from route
- Clickable navigation
- Current page highlight

### Implementation

```typescript
// src/app/layouts/components/Breadcrumbs.tsx
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from 'lucide-react';

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Generate breadcrumb items from path
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return { path, label };
  });

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground">
        <HomeIcon className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center">
          <ChevronRightIcon className="h-4 w-4 mx-2" />
          {index === breadcrumbs.length - 1 ? (
            <span className="text-foreground font-medium">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
```

## Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 768px | Hidden sidebar, hamburger menu |
| Tablet | 768px - 1024px | Collapsible sidebar |
| Desktop | > 1024px | Full sidebar |

### CSS Classes

```css
/* Mobile: hidden sidebar */
.md:hidden { display: none at 768px+ }

/* Desktop: visible sidebar */
.hidden.md:block { display: block at 768px+ }

/* Transition for sidebar collapse */
.transition-all.duration-200 { smooth 200ms transitions }
```

## Layout Constants

```typescript
// src/config/constants/ui.constants.ts
export const SIDEBAR = {
  EXPANDED_WIDTH: 256,    // 16rem / w-64
  COLLAPSED_WIDTH: 64,    // 4rem / w-16
  MOBILE_BREAKPOINT: 768, // md breakpoint
};

export const HEADER = {
  HEIGHT: 64,             // 4rem / h-16
};
```

## Usage in Routes

```typescript
// src/app/routes/AppRoutes.tsx
import { MainLayout } from '@/app/layouts/MainLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';

const routes = [
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/gate/*', element: <GateRoutes /> },
    ],
  },
];
```

## Related Documentation

- [UI Components](./ui-components.md)
- [Architecture Overview](../architecture/overview.md)
- [Routes Configuration](../configuration/constants.md)
