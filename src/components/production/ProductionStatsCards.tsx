// src/components/production/ProductionStatsCards.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductionStatsCardsProps {
  stats: Array<{
    title: string
    icon: React.ComponentType<any>
    color: string
    bgColor: string
    items: Array<{
      label: string
      value: string | number
      description: string
    }>
  }>
}

export function ProductionStatsCards({ stats }: ProductionStatsCardsProps) {
  const { isMobile, isSmallMobile, isTablet } = useDeviceInfo()
  const [currentItemIndex, setCurrentItemIndex] = useState<Record<string, number>>({})

  // Initialize current item index for each card
  const getCurrentItemIndex = (cardTitle: string) => {
    if (!(cardTitle in currentItemIndex)) {
      currentItemIndex[cardTitle] = 0
    }
    return currentItemIndex[cardTitle]
  }

  // Navigate through items in a card
  const goToItem = (cardTitle: string, direction: 'prev' | 'next', totalItems: number) => {
    const currentIndex = getCurrentItemIndex(cardTitle)
    let newIndex = currentIndex

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % totalItems
    } else {
      newIndex = (currentIndex - 1 + totalItems) % totalItems
    }

    setCurrentItemIndex({
      ...currentItemIndex,
      [cardTitle]: newIndex
    })
  }

  if (isMobile) {
    return (
      <div className="w-full space-y-3">
        {/* Header */}
        <h2 className="font-semibold text-gray-900 text-sm px-4">Production</h2>

        {/* Horizontal scrollable cards with adaptive sizing */}
        <div className="overflow-x-auto scroll-smooth -mx-4">
          <div className="flex gap-2 px-4 pb-2">
            {stats.map((card) => {
              const IconComponent = card.icon
              const currentIndex = getCurrentItemIndex(card.title)
              const currentItem = card.items[currentIndex]
              const totalItems = card.items.length
              
              return (
                <Card
                  key={card.title}
                  className="shadow-sm flex-shrink-0"
                  style={{
                    width: isSmallMobile ? '85vw' : '70vw'
                  }}
                >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-xs line-clamp-1">
                    {card.title}
                  </CardTitle>
                  <div className={cn(
                    "w-5 h-5 rounded text-white flex-shrink-0 flex items-center justify-center",
                    card.color
                  )}>
                    <IconComponent className="w-3 h-3" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {/* Metric Label */}
                  <p className="text-xs text-gray-600 font-medium">{currentItem?.label}</p>
                  
                  {/* Large Value */}
                  <p className="text-2xl font-bold text-gray-900">{currentItem?.value}</p>
                  
                  {/* Description */}
                  <p className="text-xs text-gray-500">{currentItem?.description}</p>

                  {/* Navigation Arrows */}
                  {totalItems > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => goToItem(card.title, 'prev', totalItems)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        aria-label="Previous metric"
                      >
                        <ChevronLeft className="w-3 h-3 text-gray-600" />
                      </button>
                      
                      <div className="flex gap-1">
                        {card.items.map((_, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "w-1 h-1 rounded-full",
                              idx === currentIndex ? "bg-gray-900" : "bg-gray-300"
                            )}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => goToItem(card.title, 'next', totalItems)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        aria-label="Next metric"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-600" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        </div>
      </div>
    )
  }

  // Desktop View - 4 cards in a row
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <h2 className="font-semibold text-gray-900 text-lg">Production Overview</h2>

      {/* Grid Layout — 2 cols on tablet, 4 cols on desktop */}
      <div className={`grid gap-3 ${isTablet ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {stats.map((card) => {
          const IconComponent = card.icon
          const currentIndex = getCurrentItemIndex(card.title)
          const currentItem = card.items[currentIndex]
          const totalItems = card.items.length
          
          return (
            <Card
              key={card.title}
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
                <CardTitle className="font-semibold text-sm">{card.title}</CardTitle>
                <div className={cn(
                  "w-6 h-6 rounded-lg text-white flex items-center justify-center",
                  card.color
                )}>
                  <IconComponent className="w-3 h-3" />
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {/* Metric Label */}
                <p className="text-xs text-gray-600 font-medium">{currentItem?.label}</p>
                
                {/* Large Value */}
                <p className="text-3xl font-bold text-gray-900">{currentItem?.value}</p>
                
                {/* Description */}
                <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
                  {currentItem?.description}
                </p>

                {/* Navigation Controls */}
                {totalItems > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <button
                      onClick={() => goToItem(card.title, 'prev', totalItems)}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                      aria-label="Previous metric"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    
                    <div className="flex gap-1.5">
                      {card.items.map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors cursor-pointer",
                            idx === currentIndex ? "bg-gray-900" : "bg-gray-300"
                          )}
                          onClick={() => setCurrentItemIndex({
                            ...currentItemIndex,
                            [card.title]: idx
                          })}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => goToItem(card.title, 'next', totalItems)}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                      aria-label="Next metric"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
