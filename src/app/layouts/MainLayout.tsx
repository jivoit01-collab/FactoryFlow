import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { SIDEBAR_CONFIG } from '@/config/constants';
import { AiAssistantWidget } from '@/modules/ai/components';
import { TooltipProvider } from '@/shared/components/ui';
import { useSettings } from '@/shared/contexts';
import { useLocalStorage } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { Breadcrumbs, Header, MobileSidebar, Sidebar } from './components';
import { HeaderHelpTour } from './components/HeaderHelpTour';
import { PageWidthContext } from './pageWidth';

export function MainLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useLocalStorage('sidebar-collapsed', false);
  const { aiEnabled } = useSettings();
  /** Set by a page that asks for the whole width — see `useFullWidthPage`. */
  const [fullWidth, setFullWidth] = useState(false);

  // TODO: create a config variable for the sidebar-collapsed key and use it across the project

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < SIDEBAR_CONFIG.mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sidebarWidth = isMobile
    ? 0
    : isCollapsed
      ? SIDEBAR_CONFIG.collapsedWidth
      : SIDEBAR_CONFIG.expandedWidth;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        )}

        {/* Mobile Sidebar */}
        <MobileSidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

        {/* Header */}
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} sidebarWidth={sidebarWidth} />

        {/* Main Content */}
        <main className="pt-16 transition-all duration-300" style={{ marginLeft: sidebarWidth }}>
          <PageWidthContext.Provider value={setFullWidth}>
            {/* Centred and capped for ordinary pages; edge to edge for a board
                that asked, which on a wide screen is a whole column of tiles. */}
            <div className={cn(fullWidth ? 'w-full px-4 py-4' : 'container mx-auto p-6')}>
              <Breadcrumbs />
              <Outlet />
            </div>
          </PageWidthContext.Provider>
        </main>
        {aiEnabled && <AiAssistantWidget />}

        {/* Points out the support number and the issue tracker once, to a
            user who has never been shown either. */}
        <HeaderHelpTour />
      </div>
    </TooltipProvider>
  );
}
