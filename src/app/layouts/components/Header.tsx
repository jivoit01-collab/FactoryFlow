import { Menu, Monitor, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { type Theme, THEME_OPTIONS } from '@/config/constants/app.constants';
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

export function Header({ onMenuClick, sidebarWidth }: HeaderProps) {
  const { currentCompany } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const getThemeIcon = () => {
    if (theme === THEME_OPTIONS.SYSTEM) {
      return <Monitor className="h-5 w-5" />;
    }
    return resolvedTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
  };

  return (
    <header
      className="fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 transition-all duration-300"
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
            className="text-sm font-semibold truncate max-w-48 hover:underline cursor-pointer"
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
