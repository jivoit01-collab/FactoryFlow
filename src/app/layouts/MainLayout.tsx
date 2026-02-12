import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { SIDEBAR_CONFIG } from '@/config/constants'
import { TooltipProvider } from '@/shared/components/ui'
import { useLocalStorage } from '@/shared/hooks'

import { Breadcrumbs, Header, MobileSidebar, Sidebar } from './components'

export function MainLayout() {
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useLocalStorage('sidebar-collapsed', false)

  // TODO: create a config variable for the sidebar-collapsed key and use it across the project

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < SIDEBAR_CONFIG.mobileBreakpoint)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const sidebarWidth = isMobile
    ? 0
    : isCollapsed
      ? SIDEBAR_CONFIG.collapsedWidth
      : SIDEBAR_CONFIG.expandedWidth

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
          <div className="container mx-auto p-6">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
