// 3. src/components/mobile/MobileTabBar.tsx
'use client'

import { Badge } from '@/components/ui/Badge'
import { LucideIcon } from 'lucide-react'

interface TabConfig {
  id: string
  label: string
  shortLabel: string
  icon: LucideIcon
  count: number
  color: string
}

interface MobileTabBarProps {
  tabs: TabConfig[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function MobileTabBar({ tabs, activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <div className="mb-4">
      {/* Scrollable tab bar */}
      <div className="overflow-x-auto pb-2">
        <div className="flex space-x-1 min-w-max px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-farm-green text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.shortLabel}</span>
                <Badge 
                  variant={isActive ? "secondary" : "outline"}
                  className={`ml-1 text-xs ${isActive ? 'bg-white/20 text-white' : ''}`}
                >
                  {tab.count}
                </Badge>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}