import { Menu, Monitor, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { type Theme, THEME_OPTIONS } from '@/config/constants/app.constants';
import { COMPANY_CODES } from '@/config/constants/company.constants';
import { ROUTES } from '@/config/routes.config';
import { useAuth } from '@/core/auth';
import { NotificationBell } from '@/core/notifications';
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

interface HeaderProps {
  onMenuClick: () => void;
  sidebarWidth: number;
}

/** Per-company header accent so users always know which company they're working in. */
const COMPANY_ACCENTS: Record<string, { chip: string; border: string }> = {
  [COMPANY_CODES.JIVO_OIL]: {
    chip: 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900',
    border: 'border-b-2 border-b-amber-600 dark:border-b-amber-500',
  },
  [COMPANY_CODES.JIVO_MART]: {
    chip: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900',
    border: 'border-b-2 border-b-emerald-600 dark:border-b-emerald-500',
  },
  [COMPANY_CODES.JIVO_BEVERAGES]: {
    chip: 'bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900',
    border: 'border-b-2 border-b-blue-600 dark:border-b-blue-500',
  },
};

export function Header({ onMenuClick, sidebarWidth }: HeaderProps) {
  const { currentCompany } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const accent = currentCompany ? COMPANY_ACCENTS[currentCompany.company_code] : undefined;

  const getThemeIcon = () => {
    if (theme === THEME_OPTIONS.SYSTEM) {
      return <Monitor className="h-5 w-5" />;
    }
    return resolvedTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
  };

  return (
    <header
      className={`fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 transition-all duration-300 ${accent?.border ?? ''}`}
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
            className={`text-sm font-semibold truncate max-w-48 cursor-pointer rounded-full px-3 py-1 transition-colors ${
              accent?.chip ?? 'hover:underline'
            }`}
          >
            {currentCompany.company_name}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
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
    </header>
  );
}
