import { ChevronRight,LogOut, Settings, Shield, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/core/auth';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Separator } from '@/shared/components/ui/separator';
import { cn } from '@/shared/utils';

interface SettingsDialogProps {
  isCollapsed: boolean;
}

export function SettingsDialog({ isCollapsed }: SettingsDialogProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const menuItems = [
    {
      icon: User,
      label: 'Profile',
      description: 'View your profile details',
      onClick: () => handleNavigate('/settings?tab=profile'),
    },
    {
      icon: Shield,
      label: 'Permissions',
      description: 'View module-wise permissions',
      onClick: () => handleNavigate('/settings?tab=permissions'),
    },
  ];

  const trigger = isCollapsed ? (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
      </TooltipTrigger>
      <TooltipContent side="right">Settings</TooltipContent>
    </Tooltip>
  ) : (
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground justify-start"
      >
        <Settings className="h-5 w-5" />
        <span>Settings</span>
      </Button>
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {trigger}
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className={cn('p-0', isCollapsed ? 'w-56' : 'w-[calc(256px-1rem)]')}
      >
        {/* Menu items */}
        <div className="p-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'text-left',
              )}
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-muted-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <Separator />

        {/* Logout button */}
        <div className="p-1">
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
              'text-destructive border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground',
              'text-left',
            )}
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
