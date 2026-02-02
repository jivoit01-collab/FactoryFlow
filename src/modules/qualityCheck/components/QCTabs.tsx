import { cn } from '@/shared/utils'
import { QC_TABS, QC_TAB_LABELS, type QCTab } from '../constants/qualityCheck.constants'

interface QCTabsProps {
  activeTab: QCTab
  onTabChange: (tab: QCTab) => void
}

export function QCTabs({ activeTab, onTabChange }: QCTabsProps) {
  const tabs = [QC_TABS.VISUAL, QC_TABS.LAB, QC_TABS.ATTACHMENTS] as const

  return (
    <div className="border-b">
      {/* Scrollable tabs container for mobile */}
      <nav
        className="flex gap-4 overflow-x-auto pb-px"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        aria-label="Tabs"
      >
        <style>
          {`
            .qc-tabs-scroll::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        <div className="qc-tabs-scroll flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                'py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px]',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              {QC_TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
