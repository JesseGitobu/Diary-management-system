// src/components/settings/team/TeamStatsCards.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'

interface StatCard {
  id: string
  title: string
  value: number
  description: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
}

interface TeamStatsCardsProps {
  stats: StatCard[]
}

export function TeamStatsCards({ stats }: TeamStatsCardsProps) {
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

    const scrollAmount = 300 // Width of card + gap
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

  if (isMobile) {
    return (
      <div className="w-full space-y-4">
        {/* Header with Navigation Arrows */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-base">Team Overview</h2>
          
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
          className="overflow-x-auto scrollbar-hide"
        >
          <div className="flex gap-4 pb-2">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              
              return (
                <Card
                  key={stat.id}
                  className={cn(
                    "flex-shrink-0 min-w-[280px] shadow-sm transition-all duration-200",
                    isTouch && "active:scale-95"
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="font-medium text-sm">
                      {stat.title}
                    </CardTitle>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      stat.bgColor
                    )}>
                      <Icon className={cn("w-4 h-4", stat.color)} />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </div>
                    <p className="text-xs text-gray-600">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Dot Indicators */}
        {stats.length > 0 && (
          <div className="flex justify-center gap-1.5">
            {stats.map((_, index) => {
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
                  aria-label={`Go to stat ${index + 1}`}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Desktop View - Grid Layout
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <h2 className="font-semibold text-gray-900 text-lg">
        Team Overview
      </h2>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          
          return (
            <Card
              key={stat.id}
              className="shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  {stat.title}
                </CardTitle>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  stat.bgColor
                )}>
                  <Icon className={cn("w-4 h-4", stat.color)} />
                </div>
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
