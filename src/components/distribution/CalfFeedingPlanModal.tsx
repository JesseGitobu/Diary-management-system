// src/components/distribution/CalfFeedingPlanModal.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Baby, AlertTriangle, Loader2, Save, RotateCcw } from 'lucide-react'
import { CalfFeedingRequirement, CalfFeedingSession } from './CalfFeedingDisplay'

interface CalfFeedingPlan {
  calfId: string
  tagNumber: string
  name: string
  ageInDays: number
  dailyMilkPerCalf: number
  sessions: {
    sessionNumber: number
    timeRange: string
    originalAmount: number
    adjustedAmount: number
  }[]
}

interface CalfFeedingPlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  farmId: string
  onSave: () => void
}

export function CalfFeedingPlanModal({
  open,
  onOpenChange,
  date,
  farmId,
  onSave
}: CalfFeedingPlanModalProps) {
  const [data, setData] = useState<CalfFeedingPlan[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adjustedData, setAdjustedData] = useState<CalfFeedingPlan[] | null>(null)

  // Fetch calf feeding data when modal opens
  useEffect(() => {
    if (!open) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/distribution/calf-feeding?date=${encodeURIComponent(date)}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch calf feeding plan')
        }

        const result = await response.json()
        
        // Transform data into editable format
        const transformedData: CalfFeedingPlan[] = result.calves.map(
          (calf: CalfFeedingRequirement) => ({
            calfId: calf.calfId,
            tagNumber: calf.tagNumber,
            name: calf.name,
            ageInDays: calf.ageInDays,
            dailyMilkPerCalf: calf.dailyMilkPerCalf,
            sessions: calf.feedingSessions.map((session: CalfFeedingSession) => ({
              sessionNumber: session.sessionNumber,
              timeRange: session.timeRange,
              originalAmount: session.milkPerCalf,
              adjustedAmount: session.milkPerCalf
            }))
          })
        )

        setData(transformedData)
        setAdjustedData(JSON.parse(JSON.stringify(transformedData)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [open, date])

  const handleAmountChange = (
    calfId: string,
    sessionNumber: number,
    newAmount: number
  ) => {
    if (!adjustedData) return

    setAdjustedData(
      adjustedData.map((calf) =>
        calf.calfId === calfId
          ? {
              ...calf,
              sessions: calf.sessions.map((session) =>
                session.sessionNumber === sessionNumber
                  ? { ...session, adjustedAmount: newAmount }
                  : session
              )
            }
          : calf
      )
    )
  }

  const handleResetCalf = (calfId: string) => {
    if (!adjustedData || !data) return

    const originalCalf = data.find((c) => c.calfId === calfId)
    if (!originalCalf) return

    setAdjustedData(
      adjustedData.map((calf) =>
        calf.calfId === calfId
          ? {
              ...calf,
              sessions: calf.sessions.map((session) => ({
                ...session,
                adjustedAmount: session.originalAmount
              }))
            }
          : calf
      )
    )
  }

  const handleReset = () => {
    if (data) {
      setAdjustedData(JSON.parse(JSON.stringify(data)))
    }
  }

  const calculateTotalAdjusted = (calf: CalfFeedingPlan) => {
    return calf.sessions.reduce((sum, s) => sum + s.adjustedAmount, 0)
  }

  const hasChanges = () => {
    if (!data || !adjustedData) return false
    return adjustedData.some((calf, idx) =>
      calf.sessions.some(
        (session, sIdx) =>
          session.adjustedAmount !== data[idx].sessions[sIdx].originalAmount
      )
    )
  }

  const handleSave = async () => {
    if (!adjustedData) return

    setSaving(true)
    try {
      const payload = adjustedData.map((calf) => ({
        calfId: calf.calfId,
        date,
        sessions: calf.sessions.map((session) => ({
          sessionNumber: session.sessionNumber,
          adjustedAmount: session.adjustedAmount
        }))
      }))

      const response = await fetch('/api/distribution/calf-feeding/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          date,
          adjustments: payload
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save adjustments')
      }

      onSave()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save adjustments')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Baby className="w-5 h-5 text-pink-600" />
            <span>Manage Calf Feeding Plan</span>
          </DialogTitle>
          <DialogDescription>
            Adjust milk amounts for each calf per feeding session on{' '}
            {new Date(date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
            <span>Loading feeding plan...</span>
          </div>
        )}

        {!loading && adjustedData && adjustedData.length > 0 && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Calves</p>
                  <p className="text-2xl font-bold text-pink-600">
                    {adjustedData.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Daily Milk</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {adjustedData
                      .reduce((sum, calf) => sum + calculateTotalAdjusted(calf), 0)
                      .toFixed(2)}{' '}
                    L
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-600 mb-1">Sessions</p>
                  <p className="text-2xl font-bold text-green-600">
                    {adjustedData[0]?.sessions.length || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Feeding Plan Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 w-32">
                        Calf Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 w-24">
                        Tag #
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 w-20">
                        Age
                      </th>
                      {adjustedData[0]?.sessions.map((session) => (
                        <th
                          key={`header-${session.sessionNumber}`}
                          className="px-4 py-3 text-center font-semibold text-gray-900 min-w-24"
                        >
                          <div className="text-xs font-normal text-gray-600">
                            S{session.sessionNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {session.timeRange}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold text-gray-900 w-24">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900 w-16">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustedData.map((calf, calfIdx) => {
                      const originalCalf = data?.[calfIdx]
                      const isModified =
                        originalCalf &&
                        calf.sessions.some(
                          (session, sIdx) =>
                            session.adjustedAmount !==
                            originalCalf.sessions[sIdx].originalAmount
                        )

                      return (
                        <tr
                          key={calf.calfId}
                          className={`border-b ${
                            isModified ? 'bg-yellow-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {calf.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{calf.tagNumber}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {calf.ageInDays}d
                          </td>

                          {/* Session Inputs */}
                          {calf.sessions.map((session, sessionIdx) => {
                            const originalSession =
                              originalCalf?.sessions[sessionIdx]
                            const isSessionModified =
                              originalSession &&
                              session.adjustedAmount !==
                                originalSession.originalAmount

                            return (
                              <td
                                key={`${calf.calfId}-${session.sessionNumber}`}
                                className="px-4 py-3 text-center"
                              >
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={session.adjustedAmount}
                                  onChange={(e) =>
                                    handleAmountChange(
                                      calf.calfId,
                                      session.sessionNumber,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={`h-8 text-center text-xs ${
                                    isSessionModified
                                      ? 'border-yellow-400 bg-yellow-100'
                                      : ''
                                  }`}
                                />
                                {isSessionModified && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    was {originalSession?.originalAmount}
                                  </p>
                                )}
                              </td>
                            )
                          })}

                          {/* Total */}
                          <td className="px-4 py-3 text-center">
                            <div className="font-semibold text-gray-900">
                              {calculateTotalAdjusted(calf).toFixed(2)} L
                            </div>
                            {isModified && (
                              <div className="text-xs text-orange-600">
                                ↑ Adjusted
                              </div>
                            )}
                          </td>

                          {/* Reset Button */}
                          <td className="px-4 py-3 text-center">
                            {isModified && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetCalf(calf.calfId)}
                                title="Reset to original values"
                                className="h-6 w-6 p-0"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Alert */}
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <p className="font-medium mb-1">💡 Tips:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>
                    Enter the milk amount (in liters) each calf should receive in
                    each session
                  </li>
                  <li>
                    Modified rows are highlighted in yellow showing the original
                    amount
                  </li>
                  <li>Click the reset button to restore a calf to original values</li>
                  <li>
                    Use the &quot;Reset All&quot; button to discard all changes
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!loading && (!adjustedData || adjustedData.length === 0) && !error && (
          <Alert className="border-blue-200 bg-blue-50">
            <Baby className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              No calves in feeding program for {new Date(date).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 flex items-center justify-between">
          <div className="flex-1">
            {hasChanges() && (
              <p className="text-sm text-orange-600 font-medium">
                ⚠️ You have unsaved changes
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges() || loading || saving}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges() || loading || saving}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
