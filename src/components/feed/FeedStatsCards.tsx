// src/components/feed/FeedStatsCards.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { 
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface FeedStatsCardsProps {
  stats: Array<{
    title: string
    value: string | number
    icon: React.ComponentType<any>
    color: string
    bgColor: string
    description: string
    trend?: string
    isGood?: boolean
  }>
  averageDaysRemaining: number
  alertCounts: {
    critical: number
    low: number
    total: number
  }
}

export function FeedStatsCards({ stats, averageDaysRemaining, alertCounts }: FeedStatsCardsProps) {
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
  }, [stats])

  // Smooth scroll function
  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return

    const scrollAmount = 208 // Width of card + gap (w-48 + gap)
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

  // Determine overall feed status
  const overallStatus = alertCounts.total === 0 ? (averageDaysRemaining > 14 ? 'Good' : (averageDaysRemaining > 7 ? 'Monitor' : 'Critical')) : 'Alert'
  const isStatusGood = alertCounts.critical === 0 && averageDaysRemaining > 14

  if (isMobile) {
    return (
      <div className="w-full space-y-3 sm:space-y-4">
        {/* Header with Navigation Arrows */}
        <div className="flex items-center justify-between px-3 sm:px-4">
          <h2 className="font-semibold text-gray-900 text-base sm:text-lg">Feed Overview</h2>
          
          {/* Navigation Arrows */}
          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg transition-all touch-target",
                canScrollLeft
                  ? "text-dairy-primary hover:bg-dairy-primary/10 active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
              )}
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg transition-all touch-target",
                canScrollRight
                  ? "text-dairy-primary hover:bg-dairy-primary/10 active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
              )}
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-x-auto scrollbar-hide px-3 sm:px-4"
        >
          <div className="flex gap-2.5 sm:gap-3 pb-2">
            {stats.map((stat) => {
              const IconComponent = stat.icon
              
              return (
                <Card
                  key={stat.title}
                  className={cn(
                    "flex-shrink-0 w-40 sm:w-48 shadow-sm transition-all duration-200 hover:shadow-md",
                    isTouch && "active:scale-95"
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                    <CardTitle className="font-medium text-xs sm:text-sm line-clamp-2 flex-1">
                      {stat.title}
                    </CardTitle>
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white flex-shrink-0 flex items-center justify-center ml-1",
                      stat.color
                    )}>
                      <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-1.5 sm:space-y-2 px-3 sm:px-4 pb-3 sm:pb-4">
                    {/* Value with Status */}
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                          {stat.value}
                        </div>
                        
                        {/* Status Indicator */}
                        {stat.trend && (
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {stat.isGood ? (
                              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
                            )}
                            <span className={cn(
                              "font-medium text-2xs sm:text-xs whitespace-nowrap",
                              stat.isGood ? "text-green-600" : "text-yellow-600"
                            )}>
                              {stat.trend}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-2xs sm:text-xs text-gray-600 line-clamp-2">
                        {stat.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Dot Indicators */}
        {stats.length > 0 && (
          <div className="flex justify-center gap-1 sm:gap-1.5 px-3 sm:px-4">
            {stats.map((_, index) => {
              const cardWidth = 176 // w-40 + gap (mobile)
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
                    "rounded-full transition-all duration-200 touch-target",
                    isActive
                      ? "bg-dairy-primary scale-125 w-2 h-2 sm:w-2.5 sm:h-2.5"
                      : "bg-gray-300 hover:bg-gray-400 w-1.5 h-1.5 sm:w-2 sm:h-2"
                  )}
                  aria-label={`Go to stat ${index + 1}`}
                />
              )
            })}
          </div>
        )}

        {/* Summary Status */}
        <Card className="bg-gradient-to-r from-dairy-primary/5 to-dairy-primary/10 border-dairy-primary/20 mx-3 sm:mx-4">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-dairy-primary flex-shrink-0" />
                <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                  Status:
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isStatusGood ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    <span className="text-green-600 font-medium text-xs sm:text-sm">Good</span>
                  </>
                ) : averageDaysRemaining > 7 ? (
                  <>
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                    <span className="text-yellow-600 font-medium text-xs sm:text-sm">Monitor</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                    <span className="text-red-600 font-medium text-xs sm:text-sm">Critical</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Desktop View - Responsive Grid Layout
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <h2 className="font-semibold text-gray-900 text-lg px-4 sm:px-6 lg:px-0">
        Feed Overview
      </h2>

      {/* Grid Layout - Optimized for all screen sizes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-6 lg:px-0">
        {stats.map((stat) => {
          const IconComponent = stat.icon
          
          return (
            <Card
              key={stat.title}
              className="shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="font-medium text-sm leading-snug flex-1 line-clamp-2">
                  {stat.title}
                </CardTitle>
                <div className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-white flex items-center justify-center flex-shrink-0 ml-2",
                  stat.color
                )}>
                  <IconComponent className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
              </CardHeader>

              <CardContent className="space-y-2 px-3 sm:px-4 pb-3 sm:pb-4">
                {/* Value with Status */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 flex-1 truncate">
                      {stat.value}
                    </div>
                    
                    {/* Status Indicator */}
                    {stat.trend && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {stat.isGood ? (
                          <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-yellow-500" />
                        )}
                        <span className={cn(
                          "font-medium text-xs sm:text-sm whitespace-nowrap",
                          stat.isGood ? "text-green-600" : "text-yellow-600"
                        )}>
                          {stat.trend}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {stat.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Status Card */}
      <Card className="bg-gradient-to-r from-dairy-primary/5 to-dairy-primary/10 border-dairy-primary/20 px-4 sm:px-6 lg:px-0">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-dairy-primary flex-shrink-0" />
              <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                Overall Feed Status:
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isStatusGood ? (
                <>
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  <span className="text-green-600 font-semibold text-sm sm:text-base">Good</span>
                </>
              ) : averageDaysRemaining > 7 ? (
                <>
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                  <span className="text-yellow-600 font-semibold text-sm sm:text-base">Monitor</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                  <span className="text-red-600 font-semibold text-sm sm:text-base">Critical</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
