// src/components/production/ProductionStatsCards.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

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
  /** Called whenever the selected date changes. Pass undefined to clear. */
  onDateChange?: (date: string | undefined) => void
  /** Controlled value — if the parent manages state, pass it here */
  selectedDate?: string
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const t = new Date(today() + 'T00:00:00')
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Date filter control ───────────────────────────────────────────────────────

function DateFilter({
  value,
  onChange,
  compact = false,
}: {
  value: string | undefined
  onChange: (date: string | undefined) => void
  compact?: boolean
}) {
  const isFiltered = !!value

  return (
    <div className={cn('flex items-center gap-1.5', compact ? 'text-xs' : 'text-sm')}>
      <div className="relative flex items-center">
        <Calendar
          className={cn(
            'absolute pointer-events-none',
            compact ? 'left-2 w-3 h-3' : 'left-2.5 w-4 h-4',
            isFiltered ? 'text-emerald-600' : 'text-gray-400'
          )}
        />
        <input
          type="date"
          value={value ?? ''}
          max={today()}
          onChange={e => onChange(e.target.value || undefined)}
          className={cn(
            'border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors cursor-pointer',
            'text-gray-700 placeholder:text-gray-400',
            compact
              ? 'text-xs pl-6 pr-2 py-1.5 border-gray-200'
              : 'text-sm pl-8 pr-3 py-2 border-gray-200',
            isFiltered && 'border-emerald-300 bg-emerald-50/40 text-emerald-800'
          )}
          title="Filter stats by date"
        />
      </div>

      {isFiltered && (
        <button
          onClick={() => onChange(undefined)}
          title="Clear date filter"
          className={cn(
            'flex items-center gap-1 font-medium rounded-xl border transition-colors',
            'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
            compact ? 'text-[11px] px-2 py-1.5' : 'text-xs px-2.5 py-2'
          )}
        >
          <span className={compact ? 'hidden sm:inline' : ''}>{formatDisplayDate(value!)}</span>
          <X className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductionStatsCards({
  stats,
  onDateChange,
  selectedDate: controlledDate,
}: ProductionStatsCardsProps) {
  const { isMobile, isSmallMobile, isTablet } = useDeviceInfo()

  // Uncontrolled internal state (used when parent doesn't pass selectedDate)
  const [internalDate, setInternalDate] = useState<string | undefined>(undefined)
  const selectedDate = controlledDate !== undefined ? controlledDate : internalDate

  const handleDateChange = (date: string | undefined) => {
    console.log('[ProductionStatsCards] Date filter changed:', {
      selectedDate: date,
      isCleared: !date,
      timestamp: new Date().toISOString(),
    })
    setInternalDate(date)
    onDateChange?.(date)
  }

  // Per-card carousel index
  const [currentItemIndex, setCurrentItemIndex] = useState<Record<string, number>>({})

  const getCurrentItemIndex = (cardTitle: string) =>
    currentItemIndex[cardTitle] ?? 0

  const goToItem = (cardTitle: string, direction: 'prev' | 'next', totalItems: number) => {
    const cur = getCurrentItemIndex(cardTitle)
    const next =
      direction === 'next'
        ? (cur + 1) % totalItems
        : (cur - 1 + totalItems) % totalItems
    setCurrentItemIndex(prev => ({ ...prev, [cardTitle]: next }))
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div className="w-full space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 px-4">
          <h2 className="font-semibold text-gray-900 text-sm whitespace-nowrap">Production</h2>
          <DateFilter value={selectedDate} onChange={handleDateChange} compact />
        </div>

        {/* Horizontally scrollable cards */}
        <div className="overflow-x-auto scroll-smooth -mx-4">
          <div className="flex gap-2 px-4 pb-2">
            {stats.map(card => {
              const IconComponent = card.icon
              const currentIndex = getCurrentItemIndex(card.title)
              const currentItem = card.items[currentIndex]
              const totalItems = card.items.length

              return (
                <Card
                  key={card.title}
                  className="shadow-sm flex-shrink-0 rounded-2xl border-gray-100"
                  style={{ width: isSmallMobile ? '85vw' : '70vw' }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="font-medium text-xs line-clamp-1">{card.title}</CardTitle>
                    <div
                      className={cn(
                        'w-5 h-5 rounded-lg text-white flex-shrink-0 flex items-center justify-center',
                        card.color
                      )}
                    >
                      <IconComponent className="w-3 h-3" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">{currentItem?.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{currentItem?.value}</p>
                    <p className="text-xs text-gray-400">{currentItem?.description}</p>

                    {totalItems > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => goToItem(card.title, 'prev', totalItems)}
                          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-label="Previous metric"
                        >
                          <ChevronLeft className="w-3 h-3 text-gray-500" />
                        </button>
                        <div className="flex gap-1">
                          {card.items.map((_, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                'w-1 h-1 rounded-full transition-colors',
                                idx === currentIndex ? 'bg-gray-900' : 'bg-gray-300'
                              )}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => goToItem(card.title, 'next', totalItems)}
                          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-label="Next metric"
                        >
                          <ChevronRight className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Active filter label (below cards on mobile) */}
        {selectedDate && (
          <p className="px-4 text-xs text-emerald-600 font-medium">
            Showing stats for {formatDisplayDate(selectedDate)}
          </p>
        )}
      </div>
    )
  }

  // ── Desktop / tablet layout ───────────────────────────────────────────────

  return (
    <div className="w-full space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-gray-900 text-lg whitespace-nowrap">
          Production Overview
          {selectedDate && (
            <span className="ml-2 text-sm font-normal text-emerald-600">
              · {formatDisplayDate(selectedDate)}
            </span>
          )}
        </h2>
        <DateFilter value={selectedDate} onChange={handleDateChange} />
      </div>

      {/* Card grid */}
      <div className={cn('grid gap-3', isTablet ? 'grid-cols-2' : 'grid-cols-4')}>
        {stats.map(card => {
          const IconComponent = card.icon
          const currentIndex = getCurrentItemIndex(card.title)
          const currentItem = card.items[currentIndex]
          const totalItems = card.items.length

          return (
            <Card
              key={card.title}
              className="rounded-2xl border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
                <CardTitle className="font-semibold text-sm text-gray-800">{card.title}</CardTitle>
                <div
                  className={cn(
                    'w-7 h-7 rounded-xl text-white flex items-center justify-center',
                    card.color
                  )}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  {currentItem?.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 leading-none">
                  {currentItem?.value}
                </p>
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg w-fit">
                  {currentItem?.description}
                </p>

                {totalItems > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      onClick={() => goToItem(card.title, 'prev', totalItems)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Previous metric"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
                    </button>

                    <div className="flex gap-1.5">
                      {card.items.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() =>
                            setCurrentItemIndex(prev => ({ ...prev, [card.title]: idx }))
                          }
                          className={cn(
                            'w-1.5 h-1.5 rounded-full transition-colors',
                            idx === currentIndex ? 'bg-gray-900' : 'bg-gray-300 hover:bg-gray-400'
                          )}
                          aria-label={`Go to metric ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => goToItem(card.title, 'next', totalItems)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Next metric"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
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