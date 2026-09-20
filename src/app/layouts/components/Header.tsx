import { Bug, Menu, Monitor, Moon, MoreVertical, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { type Theme, THEME_OPTIONS } from '@/config/constants/app.constants';
import { COMPANY_CODES } from '@/config/constants/company.constants';
import { ISSUE_CREATE_ACCESS } from '@/config/permissions';
import { ROUTES } from '@/config/routes.config';
import { useAuth } from '@/core/auth';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { NotificationBell } from '@/core/notifications';
import { UniversalSearchButton } from '@/modules/universal-search';
import { HeaderGreeting } from '@/shared/components/HeaderGreeting';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui';
import { useTheme } from '@/shared/contexts';

import { HEADER_TOUR_TARGETS } from './headerTour';
import { SupportMenu } from './SupportMenu';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarWidth: number;
}

/**
 * Per-company header accent so users always know which company they're working in.
 *
 * The wash must stay OPAQUE: the header is fixed and the page scrolls underneath
 * it, so a translucent fill would let rows bleed through the band. Each dark hex
 * is the flattened form of `{hue}-500/15` composited over the dark --background
 * (#171A21) — the same tint the status chips use everywhere else, pre-blended.
 * The chip itself can stay translucent because it sits on that opaque wash.
 */
const COMPANY_ACCENTS: Record<string, { wash: string; chip: string; border: string }> = {
  [COMPANY_CODES.JIVO_OIL]: {
    wash: 'bg-amber-50 dark:bg-[#382e1e]',
    chip: 'bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25',
    border: 'border-b-2 border-b-amber-600 dark:border-b-amber-500',
  },
  [COMPANY_CODES.JIVO_MART]: {
    wash: 'bg-emerald-50 dark:bg-[#16322f]',
    chip: 'bg-emerald-200 text-emerald-900 hover:bg-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25',
    border: 'border-b-2 border-b-emerald-600 dark:border-b-emerald-500',
  },
  [COMPANY_CODES.JIVO_BEVERAGES]: {
    wash: 'bg-blue-50 dark:bg-[#1c2a41]',
    chip: 'bg-blue-200 text-blue-900 hover:bg-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25',
    border: 'border-b-2 border-b-blue-600 dark:border-b-blue-500',
  },
};

export function Header({ onMenuClick, sidebarWidth }: HeaderProps) {
  const { currentCompany } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyPermission } = usePermission();
  const canReportIssue = hasAnyPermission(ISSUE_CREATE_ACCESS);

  const accent = currentCompany ? COMPANY_ACCENTS[currentCompany.company_code] : undefined;

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  /*
   * Close on an outside click or Escape. `mousedown` rather than `click` so a
   * press that starts outside dismisses the panel before the target handles
   * it. The ref wraps the button too, so pressing it toggles rather than
   * closing-then-reopening.
   */
  useEffect(() => {
    if (!overflowOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!overflowRef.current?.contains(event.target as Node)) setOverflowOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverflowOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [overflowOpen]);

  const getThemeIcon = () => {
    if (theme === THEME_OPTIONS.SYSTEM) {
      return <Monitor className="h-5 w-5" />;
    }
    return resolvedTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
  };

  return (
    <header
      className={`fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b px-4 transition-all duration-300 ${
        accent ? `${accent.wash} ${accent.border}` : 'bg-background'
      }`}
      style={{ left: sidebarWidth }}
    >
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        {currentCompany && (
          <button
            onClick={() => navigate(ROUTES.COMPANY_SELECTION.path)}
            className={`text-sm font-semibold truncate max-w-48 shrink-0 cursor-pointer rounded-full px-3 py-1 transition-colors ${
              accent?.chip ?? 'hover:underline'
            }`}
          >
            {currentCompany.company_name}
          </button>
        )}
      </div>

      {/* Centred on the header itself, not placed between the two groups —
          see HeaderGreeting for why. */}
      <HeaderGreeting />

      {/*
        Desktop: the icons sit out in the open. Below `md` there is not room
        for five of them beside the company chip, so they move behind a single
        overflow button.

        The panel is deliberately plain state rather than a DropdownMenu: each
        of these controls owns its own Popover/Dialog, and nesting those inside
        a Radix menu fights its focus trap. A plain container lets every child
        keep the exact behaviour it has on desktop.
      */}
      <div className="hidden items-center gap-2 md:flex">
        {/* One number, looked up in every company's SAP and in this app at
            once. Ctrl+K opens it from any screen. */}
        <UniversalSearchButton />

        {/* Report a problem with the screen you are on. The current path rides
            along so the issue says where to look without anyone asking. */}
        {canReportIssue && (
          <Button
            variant="ghost"
            size="icon"
            title="Report an issue with this page"
            data-tour={HEADER_TOUR_TARGETS.reportIssue}
            onClick={() =>
              navigate(`/issues/new?from=${encodeURIComponent(location.pathname)}`)
            }
          >
            <Bug className="h-5 w-5" />
          </Button>
        )}

        {/* Customer support number, reachable from every screen. */}
        <SupportMenu />

        {/* Notification bell */}
        <NotificationBell />

        {/* Theme selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              {getThemeIcon()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <DropdownMenuRadioItem value={THEME_OPTIONS.LIGHT}>
                <div className="flex items-center">
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={THEME_OPTIONS.DARK}>
                <div className="flex items-center">
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={THEME_OPTIONS.SYSTEM}>
                <div className="flex items-center">
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>System</span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile: the same controls, behind one button. */}
      <div className="relative md:hidden" ref={overflowRef}>
        <Button
          variant="ghost"
          size="icon"
          aria-label="More actions"
          aria-expanded={overflowOpen}
          aria-haspopup="true"
          onClick={() => setOverflowOpen((wasOpen) => !wasOpen)}
        >
          <MoreVertical className="h-5 w-5" />
        </Button>

        {overflowOpen && (
          <div className="absolute right-0 top-12 z-40 flex flex-col items-center gap-1 rounded-md border bg-popover p-1 shadow-md">
            <UniversalSearchButton />
            {canReportIssue && (
              <Button
                variant="ghost"
                size="icon"
                title="Report an issue with this page"
                onClick={() =>
                  navigate(`/issues/new?from=${encodeURIComponent(location.pathname)}`)
                }
              >
                <Bug className="h-5 w-5" />
              </Button>
            )}
            <SupportMenu />
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Switch theme"
              onClick={() =>
                setTheme(resolvedTheme === 'light' ? THEME_OPTIONS.DARK : THEME_OPTIONS.LIGHT)
              }
            >
              {getThemeIcon()}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
