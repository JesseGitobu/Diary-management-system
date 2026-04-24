'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, Trash2, Plus, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/Alert'

interface FeedingSession {
  id: string
  slot_name: string
  scheduled_time: string
  is_active: boolean
}

interface SessionQuantity {
  session_id: string
  session_name: string
  quantity_per_animal_kg: number | null
  percentage: number | null
}

interface SessionQuantityInputProps {
  sessions: FeedingSession[]
  selectedSessions: SessionQuantity[]
  onSessionsChange: (sessions: SessionQuantity[]) => void
  totalDailyRationKg?: number
  numAnimals?: number
  isMobile?: boolean
  /** When true, hides the session selector (sessions are pre-selected externally) */
  hideSelector?: boolean
}

export function SessionQuantityInput({
  sessions,
  selectedSessions,
  onSessionsChange,
  totalDailyRationKg,
  numAnimals = 1,
  isMobile = false,
  hideSelector = false,
}: SessionQuantityInputProps) {
  const [localSessions, setLocalSessions] = useState<SessionQuantity[]>(selectedSessions)

  // Sync external changes
  useEffect(() => {
    setLocalSessions(selectedSessions)
  }, [selectedSessions])

  const handleSelectSession = (session: FeedingSession) => {
    const exists = localSessions.find(s => s.session_id === session.id)
    if (exists) {
      // Remove session
      const updated = localSessions.filter(s => s.session_id !== session.id)
      setLocalSessions(updated)
      onSessionsChange(updated)
    } else {
      // Add session
      const updated = [
        ...localSessions,
        {
          session_id: session.id,
          session_name: session.slot_name,
          quantity_per_animal_kg: null,
          percentage: null,
        },
      ]
      setLocalSessions(updated)
      onSessionsChange(updated)
    }
  }

  const handleQuantityChange = useCallback(
    (session_id: string, quantity_kg: string) => {
      const num = parseFloat(quantity_kg)
      if (isNaN(num) && quantity_kg !== '') return

      const updated = localSessions.map(s => {
        if (s.session_id === session_id) {
          // Auto-calculate percentage if total daily ration is known
          // percentage = (quantity_per_animal_kg * numAnimals) / totalDailyRationKg * 100
          let pct = null
          if (!isNaN(num) && totalDailyRationKg && totalDailyRationKg > 0 && numAnimals > 0) {
            pct = parseFloat((((num * numAnimals) / totalDailyRationKg) * 100).toFixed(2))
          }
          return {
            ...s,
            quantity_per_animal_kg: isNaN(num) ? null : num,
            percentage: pct,
          }
        }
        return s
      })

      setLocalSessions(updated)
      onSessionsChange(updated)
    },
    [localSessions, totalDailyRationKg, numAnimals, onSessionsChange]
  )

  const handlePercentageChange = useCallback(
    (session_id: string, percentage: string) => {
      const num = parseFloat(percentage)
      if (isNaN(num) && percentage !== '') return

      const updated = localSessions.map(s => {
        if (s.session_id === session_id) {
          // Auto-calculate per-animal quantity from percentage
          // qty = (totalDailyRationKg * percentage / 100) / numAnimals
          let qty = null
          if (!isNaN(num) && totalDailyRationKg && totalDailyRationKg > 0 && numAnimals > 0) {
            qty = parseFloat(((totalDailyRationKg * num / 100) / numAnimals).toFixed(3))
          }
          return {
            ...s,
            percentage: isNaN(num) ? null : num,
            quantity_per_animal_kg: qty,
          }
        }
        return s
      })

      setLocalSessions(updated)
      onSessionsChange(updated)
    },
    [localSessions, totalDailyRationKg, numAnimals, onSessionsChange]
  )

  const handleRemoveSession = (session_id: string) => {
    const updated = localSessions.filter(s => s.session_id !== session_id)
    setLocalSessions(updated)
    onSessionsChange(updated)
  }

  // Calculate total percentages
  const totalPercentage = localSessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0)
  // Total quantity = sum of (per-animal qty × numAnimals) for all sessions
  const totalQuantity = localSessions.reduce((sum, s) => sum + ((s.quantity_per_animal_kg ?? 0) * numAnimals), 0)

  const isPercentageMismatch = totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.5
  const isQuantityMismatch = totalDailyRationKg && Math.abs(totalQuantity - totalDailyRationKg) > 0.1

  return (
    <div className="space-y-4">
      {/* Session Selection — hidden when sessions are pre-selected externally */}
      {!hideSelector && (
        <div>
          <Label className="text-sm font-semibold text-gray-700 mb-2 block">
            Select Feeding Sessions
          </Label>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
            {sessions.map(session => {
              const isSelected = localSessions.some(s => s.session_id === session.id)
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => handleSelectSession(session)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${!session.is_active ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!session.is_active}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <div>
                      <p className="font-medium text-sm">{session.slot_name}</p>
                      <p className="text-xs text-gray-500">{session.scheduled_time}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Sessions with Quantity Input */}
      {localSessions.length > 0 && (
        <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
          <CardContent className="pt-4">
            <div className="space-y-3">
              {localSessions.map(sessionQty => {
                const session = sessions.find(s => s.id === sessionQty.session_id)
                if (!session) return null

                return (
                  <div
                    key={sessionQty.session_id}
                    className="p-3 bg-white border border-gray-200 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-gray-900">
                        {sessionQty.session_name} • {session.scheduled_time}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveSession(sessionQty.session_id)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                      {/* Quantity per animal */}
                      <div>
                        <Label htmlFor={`qty-${sessionQty.session_id}`} className="text-xs">
                          Quantity per Animal (kg)
                        </Label>
                        <Input
                          id={`qty-${sessionQty.session_id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={sessionQty.quantity_per_animal_kg ?? ''}
                          onChange={e =>
                            handleQuantityChange(sessionQty.session_id, e.target.value)
                          }
                          placeholder="e.g., 2.5"
                          className="mt-1 text-sm"
                        />
                      </div>

                      {/* Percentage */}
                      <div>
                        <Label htmlFor={`pct-${sessionQty.session_id}`} className="text-xs">
                          Percentage of Daily Ration (%)
                        </Label>
                        <Input
                          id={`pct-${sessionQty.session_id}`}
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={sessionQty.percentage ?? ''}
                          onChange={e =>
                            handlePercentageChange(sessionQty.session_id, e.target.value)
                          }
                          placeholder="e.g., 33.33"
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary and warnings */}
            <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Total Quantity</p>
                  <p className="font-semibold">
                    {totalQuantity.toFixed(2)} kg
                    {totalDailyRationKg && (
                      <span className="text-xs text-gray-500 ml-1">
                        (of {totalDailyRationKg.toFixed(2)} kg target)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Percentage</p>
                  <p className={`font-semibold ${isPercentageMismatch ? 'text-orange-600' : ''}`}>
                    {totalPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              {isPercentageMismatch && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 text-sm">
                    Percentages should total 100% (currently {totalPercentage.toFixed(1)}%)
                  </AlertDescription>
                </Alert>
              )}

              {isQuantityMismatch && totalDailyRationKg && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 text-sm">
                    Total quantity should match daily ration of {totalDailyRationKg.toFixed(2)} kg
                    (currently {totalQuantity.toFixed(2)} kg)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
