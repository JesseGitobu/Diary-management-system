// src/components/distribution/CalfFeedingDisplay.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Baby, TrendingUp, AlertTriangle, Loader2, Edit2, CheckCircle2 } from 'lucide-react'
import { CalfFeedingPlanModal } from './CalfFeedingPlanModal'

export interface CalfFeedingSession {
  sessionNumber: number
  timeRange: string
  milkPerCalf: number
}

export interface CalfFeedingRequirement {
  calfId: string
  tagNumber: string
  name: string
  ageInDays: number
  feedingSessions: CalfFeedingSession[]
  dailyMilkPerCalf: number
}

export interface CalfFeedingSummary {
  date: string
  totalCalves: number
  calves: CalfFeedingRequirement[]
  sessionBreakdown: {
    sessionNumber: number
    totalMilkRequired: number
    calfCount: number
  }[]
  totalDailyMilk: number
}

interface CalfFeedingDisplayProps {
  farmId: string
  date?: string
  compact?: boolean
  isMobile?: boolean
}

export function CalfFeedingDisplay({
  farmId,
  date,
  compact = false,
  isMobile = false
}: CalfFeedingDisplayProps) {
  const [data, setData] = useState<CalfFeedingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [displayDate, setDisplayDate] = useState(date || new Date().toISOString().split('T')[0])
  const [adjustments, setAdjustments] = useState<Map<string, any>>(new Map())
  const [hasAdjustments, setHasAdjustments] = useState(false)

  const fetchAdjustments = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/distribution/calf-feeding/adjustments?date=${encodeURIComponent(displayDate)}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch adjustments')
      }
      
      const result = await response.json()
      
      // Create a map of animal_id -> adjustments
      const adjustmentMap = new Map()
      result.forEach((adj: any) => {
        adjustmentMap.set(adj.animal_id, adj)
      })
      
      setAdjustments(adjustmentMap)
      setHasAdjustments(adjustmentMap.size > 0)
    } catch (err) {
      console.error('Error fetching adjustments:', err)
      // Don't fail if adjustments can't be fetched
      setAdjustments(new Map())
      setHasAdjustments(false)
    }
  }, [displayDate])

  // Fetch adjustments for the date
  useEffect(() => {
    fetchAdjustments()
  }, [displayDate, fetchAdjustments])

  // Apply adjustments to data
  const getAdjustedData = (originalData: CalfFeedingSummary): CalfFeedingSummary => {
    if (adjustments.size === 0) return originalData

    const adjustedCalves = originalData.calves.map((calf) => {
      const calfAdjustment = adjustments.get(calf.calfId)
      
      if (!calfAdjustment) return calf
      
      // Apply session adjustments
      const adjustedSessions = calf.feedingSessions.map((session) => {
        const sessionAdj = calfAdjustment.adjustments.find(
          (adj: any) => adj.sessionNumber === session.sessionNumber
        )
        
        return {
          ...session,
          milkPerCalf: sessionAdj ? sessionAdj.adjustedAmount : session.milkPerCalf,
          isAdjusted: !!sessionAdj
        }
      })

      const adjustedDailyTotal = adjustedSessions.reduce((sum, s) => sum + s.milkPerCalf, 0)

      return {
        ...calf,
        feedingSessions: adjustedSessions,
        dailyMilkPerCalf: adjustedDailyTotal,
        isAdjusted: true
      }
    })

    // Recalculate session breakdown with adjusted amounts
    const adjustedSessionBreakdown = originalData.sessionBreakdown.map((session) => {
      let totalMilkRequired = 0
      let calfCount = 0

      adjustedCalves.forEach((calf) => {
        const calfSession = calf.feedingSessions.find((s) => s.sessionNumber === session.sessionNumber)
        if (calfSession) {
          totalMilkRequired += calfSession.milkPerCalf
          calfCount++
        }
      })

      return {
        ...session,
        totalMilkRequired,
        calfCount
      }
    })

    const adjustedTotalDailyMilk = adjustedCalves.reduce(
      (sum, calf) => sum + calf.dailyMilkPerCalf,
      0
    )

    return {
      ...originalData,
      calves: adjustedCalves,
      sessionBreakdown: adjustedSessionBreakdown,
      totalDailyMilk: adjustedTotalDailyMilk
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams()
        if (displayDate) params.append('date', displayDate)
        
        const response = await fetch(`/api/distribution/calf-feeding?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch calf feeding data')
        }
        
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [farmId, displayDate])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span className="text-sm text-gray-600">Loading calf feeding data...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return null
  }

  if (data.totalCalves === 0) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Baby className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          No calves currently in feeding program for {new Date(data.date).toLocaleDateString()}
        </AlertDescription>
      </Alert>
    )
  }

  if (compact) {
    // Compact view for quick overview
    const displayData = getAdjustedData(data)
    
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
            <p className="text-xs text-gray-600 font-medium">Calves Today</p>
            <p className="text-2xl font-bold text-pink-600">{displayData.totalCalves}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-600 font-medium">Total Milk (L)</p>
            <p className="text-2xl font-bold text-blue-600">{displayData.totalDailyMilk}</p>
            {hasAdjustments && (
              <p className="text-xs text-green-600 mt-1 font-medium">📌 Adjusted</p>
            )}
          </div>
        </div>
        
        {displayData.sessionBreakdown.length > 0 && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-700 mb-2">Feeding Sessions</p>
            <div className="space-y-1">
              {displayData.sessionBreakdown.map((session) => (
                <div key={session.sessionNumber} className="flex justify-between text-xs">
                  <span className="text-gray-600">Session {session.sessionNumber}:</span>
                  <span className="font-semibold text-gray-900">
                    {session.totalMilkRequired}L ({session.calfCount} calves)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Get adjusted data for display
  const displayData = getAdjustedData(data)

  // Detailed view
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Baby className="w-5 h-5 text-pink-600" />
              <div>
                <CardTitle>Calf Feeding Schedule</CardTitle>
                <CardDescription>
                  {new Date(data.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-pink-100 text-pink-800">
                {displayData.totalCalves} Calves
              </Badge>
              <Button
                onClick={() => setShowPlanModal(true)}
                variant="outline"
                className="gap-2"
                size="sm"
              >
                <Edit2 className="w-4 h-4" />
                Manage Plan
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
            <p className="text-xs text-gray-600 font-medium mb-1">Total Calves</p>
            <p className="text-3xl font-bold text-pink-600">{displayData.totalCalves}</p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-600 font-medium mb-1">Daily Milk Required</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-blue-600">{displayData.totalDailyMilk.toFixed(2)}</p>
              <span className="text-sm text-blue-600">L</span>
            </div>
            {hasAdjustments && (
              <p className="text-xs text-green-600 mt-2 font-medium">📌 Showing adjusted amounts</p>
            )}
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-gray-600 font-medium mb-1">Feeding Sessions</p>
            <p className="text-3xl font-bold text-green-600">{displayData.sessionBreakdown.length}</p>
          </div>
        </div>

        {/* Feeding Sessions Breakdown */}
        {displayData.sessionBreakdown.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Session Breakdown</span>
              {hasAdjustments && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Adjusted
                </Badge>
              )}
            </h3>
            <div className="space-y-2">
              {displayData.sessionBreakdown.map((session) => (
                <div
                  key={session.sessionNumber}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">Session {session.sessionNumber}</p>
                    <p className="text-sm text-gray-600">{session.calfCount} calf{session.calfCount !== 1 ? 'ves' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">{session.totalMilkRequired.toFixed(2)} L</p>
                    <p className="text-xs text-gray-500">
                      {(session.totalMilkRequired / session.calfCount).toFixed(2)} L/calf
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Calf Details */}
        {displayData.calves.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Individual Calf Details</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {displayData.calves.map((calf) => (
                <div
                  key={calf.calfId}
                  className={`p-3 border rounded-lg text-sm ${
                    (calf as any).isAdjusted
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {calf.name} <span className="text-gray-500">#{calf.tagNumber}</span>
                      </p>
                      <p className="text-xs text-gray-600">Age: {calf.ageInDays} days</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 text-xs whitespace-nowrap">
                        {calf.dailyMilkPerCalf.toFixed(2)} L/day
                      </Badge>
                      {(calf as any).isAdjusted && (
                        <Badge className="bg-green-100 text-green-800 text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Adjusted
                        </Badge>
                      )}
                    </div>
                  </div>
                  {calf.feedingSessions.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {calf.feedingSessions.map((session) => (
                        <div
                          key={`${calf.calfId}-session-${session.sessionNumber}`}
                          className={`p-1.5 rounded text-center ${
                            (session as any).isAdjusted
                              ? 'bg-green-100 border border-green-300'
                              : 'bg-gray-50'
                          }`}
                        >
                          <p className="text-gray-600">S{session.sessionNumber}</p>
                          <p className="font-semibold text-gray-900">{session.milkPerCalf.toFixed(2)}L</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Message */}
        <Alert className={`border-blue-200 ${hasAdjustments ? 'bg-green-50' : 'bg-blue-50'}`}>
          <AlertTriangle className={`h-4 w-4 ${hasAdjustments ? 'text-green-600' : 'text-blue-600'}`} />
          <AlertDescription className={hasAdjustments ? 'text-green-800 text-sm' : 'text-blue-800 text-sm'}>
            {hasAdjustments ? (
              <>
                <p className="font-medium mb-1">✅ Adjustments Applied</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Displaying adjusted milk amounts from your feeding plan</li>
                  <li>Green highlighted items show adjusted calves/sessions</li>
                  <li>Click "Manage Plan" to view or modify adjustments</li>
                </ul>
              </>
            ) : (
              <>
                <p className="font-medium mb-1">📌 Feeding Schedule Based On:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Calf age (calculated from birth date)</li>
                  <li>Milk adjustment schedule from Calf Management Settings</li>
                  <li>Current feeding configuration for each age group</li>
                </ul>
              </>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>

    {/* Manage Feeding Plan Modal */}
    <CalfFeedingPlanModal
      open={showPlanModal}
      onOpenChange={setShowPlanModal}
      date={displayDate}
      farmId={farmId}
      onSave={() => {
        // Refresh adjustments after save
        fetchAdjustments()
      }}
    />
    </>
  )
}
