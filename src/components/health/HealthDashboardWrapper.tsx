// src/components/health/HealthDashboardWrapper.tsx (New Client Component)
'use client'

import { HealthRecordsContent } from '@/components/health/HealthDashboard'

interface HealthDashboardWrapperProps {
  farmId: string
  userRole: string
  user: any
  animals?: any[]
  healthRecords?: any[]
  healthStats?: any[]
  upcomingTasks?: any[]
}
export function HealthDashboardWrapper({ farmId, userRole, user, animals, healthRecords, healthStats, upcomingTasks }: HealthDashboardWrapperProps) {
  return (
    <HealthRecordsContent
      user={user}
      userRole={userRole}
      animals={animals ?? []}
      healthRecords={healthRecords ?? []}
      healthStats={healthStats}
      upcomingTasks={upcomingTasks ?? []}
    />
  )
} 