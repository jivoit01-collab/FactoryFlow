import type { Reducer } from '@reduxjs/toolkit';
import type { LucideIcon } from 'lucide-react';

/**
 * Navigation item configuration for sidebar menu
 */
export interface ModuleNavItem {
  /** Route path */
  path: string;
  /** Display title */
  title: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Required permissions (Django format: 'app_label.permission_codename') */
  permissions?: readonly string[];
  /** Module prefix for dynamic sidebar filtering (e.g., 'quality_control' to show if user has any 'quality_control.*' permission). Use array for modules spanning multiple Django apps. */
  modulePrefix?: string | readonly string[];
  /** Whether to show in sidebar */
  showInSidebar?: boolean;
  /** Whether this route has a submenu in the sidebar */
  hasSubmenu?: boolean;
  /** Child navigation items for submenus */
  children?: ModuleNavItem[];
}

/**
 * Route configuration with layout and protection options
 */
export interface ModuleRoute {
  /** Route path */
  path: string;
  /** React element to render */
  element: React.ReactNode;
  /** Required permissions for this route */
  permissions?: readonly string[];
  /** Whether this route requires authentication (default: true for protected modules) */
  requiresAuth?: boolean;
  /** Layout type: 'auth' for AuthLayout, 'main' for MainLayout (default) */
  layout?: 'auth' | 'main';
}

/**
 * Module configuration that each feature module exports
 */
export interface ModuleConfig {
  /** Unique module name */
  name: string;
  /** Route configurations for this module */
  routes: ModuleRoute[];
  /** Navigation items for sidebar */
  navigation?: ModuleNavItem[];
  /** Redux reducers exported by this module (key = slice name) */
  reducer?: Record<string, Reducer>;
}
