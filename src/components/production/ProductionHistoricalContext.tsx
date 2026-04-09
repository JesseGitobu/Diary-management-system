'use client'

import { useEffect, useState, useRef } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HistoricalData {
  yesterdayTotal?: number | null
  previousSessionVolume?: number | null
  previousSessionId?: string | null
  previousSessionIsFromYesterday?: boolean
  sameTimeYesterdayVolume?: number | null
  sameTimeYesterdaySessionId?: string | null
}

interface CacheEntry {
  data: HistoricalData
  timestamp: number
}

// Global cache for historical data (5-minute TTL)
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const historyCache = new Map<string, CacheEntry>()

interface ProductionHistoricalContextProps {
  farmId: string
  animalId: string
  currentDate: string
  currentSession: string
  currentSessionName?: string
  sessions?: Array<{ id: string; name: string }>
}

export function ProductionHistoricalContext({
  farmId,
  animalId,
  currentDate,
  currentSession,
  currentSessionName,
  sessions
}: ProductionHistoricalContextProps) {
  const { isMobile } = useDeviceInfo()
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null)
  const [loading, setLoading] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        // Create cache key from query parameters
        const cacheKey = `${farmId}:${animalId}:${currentDate}:${currentSession}`
        
        // Check cache first
        const cachedEntry = historyCache.get(cacheKey)
        const now = Date.now()
        
        if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_TTL) {
          console.log('[ProductionHistoricalContext] Using cached data for:', cacheKey)
          setHistoricalData(cachedEntry.data)
          setLoading(false)
          return
        }

        // Cancel any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        
        abortControllerRef.current = new AbortController()

        const response = await fetch(
          `/api/production/history?farmId=${farmId}&animalId=${animalId}&date=${currentDate}&session=${currentSession}`,
          { signal: abortControllerRef.current.signal }
        )

        if (response.ok) {
          const data = await response.json()
          
          // Store in cache
          historyCache.set(cacheKey, {
            data,
            timestamp: now
          })
          
          console.log('[ProductionHistoricalContext] Cached new data for:', cacheKey)
          setHistoricalData(data)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to fetch historical data:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    if (animalId) {
      fetchHistoricalData()
    }

    // Cleanup: cancel request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [farmId, animalId, currentDate, currentSession])

  const getSessionName = (sessionId?: string | null) => {
    if (!sessionId) return 'Previous Session'
    if (!sessions) return sessionId
    const session = sessions.find(s => s.id === sessionId)
    return session?.name || sessionId
  }

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
    <div className={`p-3 sm:p-4 bg-stone-50 rounded-lg border border-stone-200 ${
      isMobile
        ? 'flex overflow-x-auto gap-3 snap-x snap-mandatory scrollbar-hide'
        : 'grid grid-cols-3 gap-3'
    }`}>
      {/* Yesterday's Total */}
      <div className="flex flex-col space-y-1 flex-shrink-0 snap-start min-w-[140px] sm:min-w-0">
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
      <div className="flex flex-col space-y-1 flex-shrink-0 snap-start min-w-[140px] sm:min-w-0">
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
          <p className="text-xs text-stone-500">
            {getSessionName(historicalData.previousSessionId)} {historicalData.previousSessionIsFromYesterday ? 'yesterday' : 'earlier today'}
          </p>
        )}
      </div>

      {/* Same Time Yesterday */}
      <div className="flex flex-col space-y-1 flex-shrink-0 snap-start min-w-[140px] sm:min-w-0">
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
          <p className="text-xs text-stone-500">{getSessionName(historicalData.sameTimeYesterdaySessionId)} session</p>
        )}
      </div>
    </div>
  )
}
