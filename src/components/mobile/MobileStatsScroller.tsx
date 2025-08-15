// 1. src/components/mobile/MobileStatsScroller.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LucideIcon } from 'lucide-react'

interface StatConfig {
  title: string
  value: number | string
  icon: LucideIcon
  color: string
  bgColor: string
  description: string
}

interface MobileStatsScrollerProps {
  stats: StatConfig[]
}

export function MobileStatsScroller({ stats }: MobileStatsScrollerProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex space-x-3 min-w-max px-1">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="min-w-[140px] flex-shrink-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-medium">{stat.title}</CardTitle>
                <div className={`p-1 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-3 w-3 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}