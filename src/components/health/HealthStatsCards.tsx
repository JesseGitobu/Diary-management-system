// src/components/health/HealthStatsCards.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { 
  Stethoscope, 
  Baby, 
  TrendingUp, 
  Activity, 
  Calendar,
  Target,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Clock,
  Syringe,
  AlertTriangle
} from 'lucide-react'

interface HealthStatsCardsProps {
  stats: {
    totalHealthRecords: number
    veterinariansRegistered: number
    protocolsRecorded: number
    outbreaksReported: number
    vaccinationsAdministered: number
    upcomingTasks: number
  }
}

export function HealthStatsCards({ stats }: HealthStatsCardsProps) {
  const { isMobile, isTouch } = useDeviceInfo()

  const statsData = [
    {
      id: 'total-health',
      title: 'Health Records',
      value: stats.totalHealthRecords,
      description: 'Health events',
      icon: Activity,
      color: 'bg-blue-100 text-blue-600',
      trend: stats.totalHealthRecords > 0 ? '+' : '',
      
    },
    {
      id: 'veterinarians-registered',
      title: 'Veterinarians',
      value: stats.veterinariansRegistered,
      description: 'Registered',
      icon: Stethoscope,
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      id: 'protocols-recorded',
      title: 'Protocols',
      value: stats.protocolsRecorded,
      description: 'Active',
      icon: BookOpen,
      color: 'bg-purple-100 text-purple-600',
      
    },
    {
      id: 'outbreaks-reported',
      title: 'Outbreaks',
      value: stats.outbreaksReported,
      description: 'Active',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-600',
    },
    {
      id: 'vaccinations-administered',
      title: 'Vaccinations',
      value: stats.vaccinationsAdministered,
      description: 'Active',
      icon: Syringe,
      color: 'bg-green-100 text-green-600',
      trend: stats.vaccinationsAdministered > 0 ? '+' : '',
    },
    {
      id: 'upcoming-tasks',
      title: 'Upcoming Tasks',
      value: stats.upcomingTasks,
      description: 'Pending tasks',
      icon: Clock,
      color: 'bg-purple-100 text-purple-600',
      
    }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={cn(
          "font-semibold text-gray-900",
          isMobile ? "text-lg" : "text-xl"
        )}>
          Health Records Overview
        </h2>
        {isMobile && (
          <p className="text-xs text-gray-500">Swipe to see all stats →</p>
        )}
      </div>

      {/* Horizontal Scrollable Cards Container */}
      <div className={cn(
        "relative",
        isMobile ? "overflow-x-auto scrollbar-hide" : ""
      )}>
        {/* Cards Grid/Flex */}
        <div className={cn(
          isMobile 
            ? "flex space-x-4 pb-2" // Horizontal scroll on mobile
            : "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4" // Grid on desktop
        )}>
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon
            
            return (
              <Card 
                key={stat.id}
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  isMobile ? [
                    "flex-shrink-0 w-48", // Fixed width for horizontal scroll
                    "active:scale-95", // Touch feedback
                    isTouch && "cursor-pointer"
                  ] : "hover:scale-105"
                )}
              >
                <CardHeader className={cn(
                  "flex flex-row items-center justify-between space-y-0",
                  isMobile ? "pb-2" : "pb-2"
                )}>
                  <CardTitle className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {stat.title}
                  </CardTitle>
                  <div className={cn(
                    "rounded-lg flex items-center justify-center",
                    isMobile ? "w-8 h-8" : "w-10 h-10",
                    stat.color
                  )}>
                    <IconComponent className={cn(
                      isMobile ? "w-4 h-4" : "w-5 h-5"
                    )} />
                  </div>
                </CardHeader>
                
                <CardContent className={cn(
                  isMobile ? "pt-0 pb-3" : "pt-0"
                )}>
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <div className={cn(
                        "font-bold",
                        isMobile ? "text-xl" : "text-2xl"
                      )}>
                        {stat.value}
                      </div>
                      
                      {/* Status Indicator */}
                      {stat.trend && (
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                          <span className={cn(
                            "font-medium",
                            isMobile ? "text-xs" : "text-xs",
                            
                          )}>
                            {stat.trend}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p className={cn(
                      "text-muted-foreground",
                      isMobile ? "text-xs" : "text-xs"
                    )}>
                      {stat.description}
                    </p>
                  </div>
                  
                
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {/* Scroll Indicator Dots for Mobile */}
        {isMobile && (
          <div className="flex justify-center space-x-1 mt-3">
            {statsData.map((_, index) => (
              <div
                key={index}
                className="w-1.5 h-1.5 rounded-full bg-gray-300"
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Summary Row for Mobile */}
      {isMobile && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">
                  Overall Status:
                </span>
              </div>
              <div className="flex items-center space-x-1">
                
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}