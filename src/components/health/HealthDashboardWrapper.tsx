// src/components/health/HealthDashboardWrapper.tsx (New Client Component)
'use client'

import { HealthDashboard } from '@/components/health/HealthDashboard'

interface HealthDashboardWrapperProps {
  farmId: string
  userRole: string
}

export function HealthDashboardWrapper({ farmId, userRole }: HealthDashboardWrapperProps) {
  return (
    <HealthDashboard 
      farmId={farmId}
      userRole={userRole}
    />
  )
}