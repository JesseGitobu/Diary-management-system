// src/components/health/HealthDashboardWrapper.tsx
'use client'
import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { HealthRecordsContent } from '@/components/health/HealthDashboard'

interface HealthDashboardWrapperProps {
  farmId: string
  userRole: any
  user: any
  animals?: any[]
  healthRecords?: any[]
  initialHealthStats: {
    totalHealthRecords: number
    veterinariansRegistered: number
    protocolsRecorded: number
    outbreaksReported: number
    vaccinationsAdministered: number
    upcomingTasks: number
  }
  upcomingTasks?: any[]
}

export function HealthDashboardWrapper({
  farmId,
  userRole,
  user,
  animals: initialAnimals,
  healthRecords,
  initialHealthStats,
  upcomingTasks
}: HealthDashboardWrapperProps) {
  const [healthStats, setHealthStats] = useState(initialHealthStats)
  const [animals, setAnimals] = useState(initialAnimals ?? [])
  const [loading, setLoading] = useState(false)

  const refreshData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/health-stats')
      if (!response.ok) {
        throw new Error('Failed to fetch health stats')
      }

      const data = await response.json()
      setHealthStats(data.healthStats)
    } catch (error) {
      console.error('Error refreshing health data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnimalUpdated = (updatedAnimal: any) => {
    setAnimals(prev => 
      prev.map(animal => 
        animal.id === updatedAnimal.id ? updatedAnimal : animal
      )
    )
  }

  return (
    <>
      {loading && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-600">Updating stats...</span>
        </div>
      )}
      <HealthRecordsContent
        user={user}
        userRole={userRole}
        animals={animals}
        healthRecords={healthRecords ?? []}
        healthStats={healthStats}
        upcomingTasks={upcomingTasks ?? []}
        onAnimalUpdated={handleAnimalUpdated}
      />
    </>
  )
}