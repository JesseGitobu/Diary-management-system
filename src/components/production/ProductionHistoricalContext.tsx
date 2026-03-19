'use client'

import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HistoricalData {
  yesterdayTotal?: number | null
  previousSessionVolume?: number | null
  sameTimeYesterdayVolume?: number | null
}

interface ProductionHistoricalContextProps {
  farmId: string
  animalId: string
  currentDate: string
  currentSession: string
}

export function ProductionHistoricalContext({
  farmId,
  animalId,
  currentDate,
  currentSession
}: ProductionHistoricalContextProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        const response = await fetch(
          `/api/production/history?farmId=${farmId}&animalId=${animalId}&date=${currentDate}&session=${currentSession}`
        )

        if (response.ok) {
          const data = await response.json()
          setHistoricalData(data)
        }
      } catch (error) {
        console.error('Failed to fetch historical data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (animalId) {
      fetchHistoricalData()
    }
  }, [farmId, animalId, currentDate, currentSession])

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="sm" />
      </div>
    )
  }

  if (!historicalData) {
    return null
  }

  const getTrendIcon = (current: number | null | undefined, previous: number | null | undefined) => {
    if (!current || !previous) return <Minus className="w-4 h-4 text-stone-400" />
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-stone-400" />
  }

  return (
    <div className="grid grid-cols-3 gap-3 p-4 bg-stone-50 rounded-lg border border-stone-200">
      {/* Yesterday's Total */}
      <div className="flex flex-col space-y-1">
        <p className="text-xs font-medium text-stone-600 uppercase tracking-wide">Yesterday Total</p>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-stone-900">
            {historicalData.yesterdayTotal?.toFixed(1) ?? '—'}
          </span>
          <span className="text-sm text-stone-500">L</span>
        </div>
        {historicalData.yesterdayTotal && (
          <p className="text-xs text-stone-500">All sessions combined</p>
        )}
      </div>

      {/* Previous Session */}
      <div className="flex flex-col space-y-1">
        <p className="text-xs font-medium text-stone-600 uppercase tracking-wide">Previous Session</p>
        <div className="flex items-baseline space-x-2">
          {historicalData.previousSessionVolume ? (
            <>
              <span className="text-2xl font-bold text-stone-900">
                {historicalData.previousSessionVolume.toFixed(1)}
              </span>
              <span className="text-sm text-stone-500">L</span>
            </>
          ) : (
            <span className="text-2xl font-bold text-stone-300">—</span>
          )}
        </div>
        {historicalData.previousSessionVolume && (
          <p className="text-xs text-stone-500">Earlier today</p>
        )}
      </div>

      {/* Same Time Yesterday */}
      <div className="flex flex-col space-y-1">
        <p className="text-xs font-medium text-stone-600 uppercase tracking-wide">Same Time Yesterday</p>
        <div className="flex items-center space-x-2">
          <div className="flex items-baseline space-x-2">
            {historicalData.sameTimeYesterdayVolume ? (
              <>
                <span className="text-2xl font-bold text-stone-900">
                  {historicalData.sameTimeYesterdayVolume.toFixed(1)}
                </span>
                <span className="text-sm text-stone-500">L</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-stone-300">—</span>
            )}
          </div>
        </div>
        {historicalData.sameTimeYesterdayVolume && (
          <p className="text-xs text-stone-500">{currentSession} session</p>
        )}
      </div>
    </div>
  )
}
