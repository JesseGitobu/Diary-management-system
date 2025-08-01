// src/components/mobile/MobileStatsCarousel.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils/cn'

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)

  // Auto-scroll functionality
  useEffect(() => {
    if (!isAutoScrolling) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length)
    }, 4000) // Change card every 4 seconds

    return () => clearInterval(interval)
  }, [cards.length, isAutoScrolling])

  // Handle manual scroll
  const handleScroll = (direction: 'left' | 'right') => {
    setIsAutoScrolling(false)
    if (direction === 'left') {
      setCurrentIndex((prevIndex) => 
        prevIndex === 0 ? cards.length - 1 : prevIndex - 1
      )
    } else {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length)
    }
    
    // Re-enable auto-scroll after 10 seconds
    setTimeout(() => setIsAutoScrolling(true), 10000)
  }

  const handleDotClick = (index: number) => {
    setIsAutoScrolling(false)
    setCurrentIndex(index)
    setTimeout(() => setIsAutoScrolling(true), 10000)
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Main Card Display */}
      <Card className="mb-3 shadow-sm border-l-4" 
            style={{ borderLeftColor: cards[currentIndex]?.color?.replace('bg-', '#') || '#3b82f6' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg text-white",
                  cards[currentIndex]?.color || "bg-blue-500"
                )}>
                  {cards[currentIndex]?.icon}
                </div>
                <h3 className="font-medium text-gray-900 text-sm">
                  {cards[currentIndex]?.title}
                </h3>
              </div>
              
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {cards[currentIndex]?.value}
              </div>
              
              <p className="text-xs text-gray-600">
                {cards[currentIndex]?.subtitle}
              </p>
            </div>
            
            {/* Navigation Arrows */}
            <div className="flex flex-col space-y-2 ml-4">
              <button
                onClick={() => handleScroll('left')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Previous stat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Next stat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dot Indicators */}
      <div className="flex justify-center space-x-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-200",
              index === currentIndex
                ? "bg-dairy-primary scale-125"
                : "bg-gray-300 hover:bg-gray-400"
            )}
            aria-label={`Go to stat ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}