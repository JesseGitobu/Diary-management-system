// src/components/breeding/BreedingDashboardWrapper.tsx
'use client'

import { useState, useEffect } from 'react'
import { BreedingDashboard } from './BreedingDashboard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { BreedingAlert } from '@/lib/database/breeding-stats'

interface BreedingDashboardWrapperProps {
  userRole: string
  farmId: string
  initialBreedingStats: {
    totalBreedings: number
    heatDetected: number
    currentPregnant: number
    expectedCalvingsThisMonth: number
    conceptionRate: number
  }
  initialCalendarEvents: any[]
  initialBreedingAlerts: BreedingAlert[]
}

export function BreedingDashboardWrapper({
  userRole,
  farmId,
  initialBreedingStats,
  initialCalendarEvents,
  initialBreedingAlerts
}: BreedingDashboardWrapperProps) {
  const [breedingStats, setBreedingStats] = useState(initialBreedingStats)
  const [calendarEvents, setCalendarEvents] = useState(initialCalendarEvents)
  const [breedingAlerts, setBreedingAlerts] = useState(initialBreedingAlerts)
  const [loading, setLoading] = useState(false)

  const refreshData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/breeding-stats')
      if (!response.ok) {
        throw new Error('Failed to fetch breeding stats')
      }
      
      const data = await response.json()
      setBreedingStats(data.breedingStats)
      setCalendarEvents(data.calendarEvents)
      setBreedingAlerts(data.breedingAlerts)
    } catch (error) {
      console.error('Error refreshing breeding data:', error)
      // Could show toast notification here
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-600">Updating stats...</span>
        </div>
      )}
      
      <BreedingDashboard
        userRole={userRole}
        farmId={farmId}
        onActionComplete={refreshData}
        breedingStats={breedingStats}
        calendarEvents={calendarEvents}
        breedingAlerts={breedingAlerts}
      />
    </>
  )
}