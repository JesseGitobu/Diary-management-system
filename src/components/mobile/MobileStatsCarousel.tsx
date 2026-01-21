// src/components/mobile/MobileStatsCarousel.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils/cn'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

interface StatsCard {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: string
}

interface MobileStatsCarouselProps {
  cards: StatsCard[]
  className?: string
}

export function MobileStatsCarousel({ cards, className }: MobileStatsCarouselProps) {
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
  }, [cards.length])

  // Smooth scroll function
  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return

    const scrollAmount = 280 // Width of card + gap
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

  // Get color value from Tailwind class
  const getColorValue = (colorClass: string): string => {
    const colorMap: { [key: string]: string } = {
      'bg-blue-500': '#3b82f6',
      'bg-green-500': '#10b981',
      'bg-red-500': '#ef4444',
      'bg-yellow-500': '#eab308',
      'bg-purple-500': '#a855f7',
      'bg-indigo-500': '#6366f1',
      'bg-pink-500': '#ec4899',
      'bg-orange-500': '#f97316',
    }
    return colorMap[colorClass] || '#3b82f6'
  }

  if (isMobile) {
    return (
      <div className={cn("w-full space-y-4", className)}>
        {/* Header with Navigation Arrows */}
        <div className="flex items-center justify-between px-4 sm:px-0">
          <h3 className="font-semibold text-gray-900 text-base">Quick Stats</h3>
          
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
          <div className="flex gap-3 pb-2">
            {cards.map((card, index) => (
              <Card
                key={index}
                className={cn(
                  "flex-shrink-0 w-64 shadow-sm border-l-4 transition-all duration-200",
                  isTouch && "active:scale-95"
                )}
                style={{ borderLeftColor: getColorValue(card.color) }}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={cn(
                          "p-2 rounded-lg text-white flex-shrink-0",
                          card.color
                        )}>
                          {card.icon}
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {card.title}
                        </h4>
                      </div>
                    </div>

                    {/* Value */}
                    <div>
                      <div className="text-3xl font-bold text-gray-900">
                        {card.value}
                      </div>
                    </div>

                    {/* Subtitle */}
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {card.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Dot Indicators */}
        {cards.length > 0 && (
          <div className="flex justify-center gap-1.5">
            {cards.map((_, index) => {
              // Calculate if this dot should be active based on scroll position
              const cardWidth = 280 // w-64 + gap
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
                  aria-label={`Go to card ${index + 1}`}
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
    <div className={cn("w-full space-y-4", className)}>
      {/* Header */}
      <h3 className="font-semibold text-gray-900 text-lg px-4 sm:px-0">
        Quick Stats
      </h3>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-0">
        {cards.map((card, index) => (
          <Card
            key={index}
            className={cn(
              "shadow-sm border-l-4 transition-all duration-200 hover:shadow-md hover:scale-105"
            )}
            style={{ borderLeftColor: getColorValue(card.color) }}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      "p-2.5 rounded-lg text-white flex-shrink-0",
                      card.color
                    )}>
                      {card.icon}
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm">
                      {card.title}
                    </h4>
                  </div>
                </div>

                {/* Value */}
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {card.value}
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-xs text-gray-600">
                  {card.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}