// src/components/reports/ReportsStatsCards.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { 
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface KPICard {
  title: string
  value: string
  change: number
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  inverted?: boolean
  subtitle?: string
}

interface ReportsStatsCardsProps {
  kpis: KPICard[]
}

export function ReportsStatsCards({ kpis }: ReportsStatsCardsProps) {
  const { isMobile, isTouch } = useDeviceInfo()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Check scroll position
  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
      setScrollPosition(scrollLeft)
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [kpis])

  // Smooth scroll function
  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return

    const scrollAmount = 300 // Width of card + gap (min-w-[280px] + gap)
    const newScrollLeft =
      direction === 'left'
        ? containerRef.current.scrollLeft - scrollAmount
        : containerRef.current.scrollLeft + scrollAmount

    containerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })

    // Update scroll state after animation
    setTimeout(checkScroll, 300)
  }

  // Handle scroll event for dot indicators
  const handleScroll = () => {
    checkScroll()
  }

  // Determine overall performance status
  const averageChange = kpis.length > 0 
    ? kpis.reduce((sum, kpi) => sum + kpi.change, 0) / kpis.length 
    : 0
  const isStatusGood = averageChange >= 5
  const isStatusWarning = averageChange >= 0 && averageChange < 5
  const isStatusAlert = averageChange < 0

  if (isMobile) {
    return (
      <div className="w-full space-y-4">
        {/* Header with Navigation Arrows */}
        <div className="flex items-center justify-between px-4 sm:px-0">
          <h2 className="font-semibold text-gray-900 text-base">Key Metrics</h2>
          
          {/* Navigation Arrows */}
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={cn(
                "p-2 rounded-lg transition-all",
                canScrollLeft
                  ? "text-dairy-primary hover:bg-dairy-primary/10 active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
              )}
              aria-label="Scroll left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={cn(
                "p-2 rounded-lg transition-all",
                canScrollRight
                  ? "text-dairy-primary hover:bg-dairy-primary/10 active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
              )}
              aria-label="Scroll right"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-x-auto scrollbar-hide px-4 sm:px-0"
        >
          <div className="flex gap-4 pb-2">
            {kpis.map((kpi, index) => {
              const Icon = kpi.icon
              const isPositiveChange = kpi.inverted ? kpi.change <= 0 : kpi.change >= 0
              const changeColor = isPositiveChange ? 'text-green-600' : 'text-red-600'
              
              return (
                <Card
                  key={index}
                  className={cn(
                    "flex-shrink-0 min-w-[280px] shadow-sm transition-all duration-200",
                    isTouch && "active:scale-95"
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="font-medium text-sm line-clamp-2">
                      {kpi.title}
                    </CardTitle>
                    <div className={cn(
                      "w-8 h-8 rounded-lg text-white flex-shrink-0 flex items-center justify-center",
                      kpi.color.replace('text-', 'bg-').replace('-600', '-500')
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {/* Value */}
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-gray-900">
                        {kpi.value}
                      </div>
                      
                      {/* Change Indicator */}
                      {kpi.change !== 0 ? (
                        <div className="flex items-center gap-1">
                          {isPositiveChange ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-green-600 font-medium text-xs">
                                +{kpi.change.toFixed(1)}%
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              <span className="text-red-600 font-medium text-xs">
                                {kpi.change.toFixed(1)}%
                              </span>
                            </>
                          )}
                        </div>
                      ) : null}
                      
                      <p className="text-xs text-gray-600">
                        {kpi.subtitle || 'From last month'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Dot Indicators */}
        {kpis.length > 0 && (
          <div className="flex justify-center gap-1.5">
            {kpis.map((_, index) => {
              const cardWidth = 300 // min-w-[280px] + gap
              const isActive = Math.round(scrollPosition / cardWidth) === index
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (containerRef.current) {
                      containerRef.current.scrollTo({
                        left: index * cardWidth,
                        behavior: 'smooth'
                      })
                      setTimeout(checkScroll, 300)
                    }
                  }}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    isActive
                      ? "bg-dairy-primary scale-125 w-2.5 h-2.5"
                      : "bg-gray-300 hover:bg-gray-400 w-2 h-2"
                  )}
                  aria-label={`Go to metric ${index + 1}`}
                />
              )
            })}
          </div>
        )}

        {/* Summary Status */}
        <Card className="bg-gradient-to-r from-dairy-primary/5 to-dairy-primary/10 border-dairy-primary/20 mx-4 sm:mx-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-dairy-primary" />
                <span className="font-medium text-gray-900 text-sm">
                  Overall:
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isStatusGood ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium text-sm">Strong</span>
                  </>
                ) : isStatusAlert ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-600 font-medium text-sm">Declining</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600 font-medium text-sm">Stable</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Desktop View - Grid Layout
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <h2 className="font-semibold text-gray-900 text-lg px-4 sm:px-0">
        Key Metrics
      </h2>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon
          const isPositiveChange = kpi.inverted ? kpi.change <= 0 : kpi.change >= 0
          
          return (
            <Card
              key={index}
              className="shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  {kpi.title}
                </CardTitle>
                <div className={cn(
                  "w-8 h-8 rounded-lg text-white flex items-center justify-center",
                  kpi.color.replace('text-', 'bg-').replace('-600', '-500')
                )}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {/* Value */}
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-900">
                    {kpi.value}
                  </div>
                  
                  {/* Change Indicator */}
                  {kpi.change !== 0 ? (
                    <div className="flex items-center gap-1">
                      {isPositiveChange ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 font-medium text-xs">
                            +{kpi.change.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          <span className="text-red-600 font-medium text-xs">
                            {kpi.change.toFixed(1)}%
                          </span>
                        </>
                      )}
                    </div>
                  ) : null}
                  
                  <p className="text-xs text-gray-600">
                    {kpi.subtitle || 'From last month'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Status Card */}
      <Card className="bg-gradient-to-r from-dairy-primary/5 to-dairy-primary/10 border-dairy-primary/20 px-4 sm:px-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-dairy-primary" />
              <span className="font-medium text-gray-900">
                Overall Performance:
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isStatusGood ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Strong Growth</span>
                </>
              ) : isStatusAlert ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-600 font-semibold">Declining Trends</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <span className="text-yellow-600 font-semibold">Stable - Monitor</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
