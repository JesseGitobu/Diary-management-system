// src/components/breeding/PregnancyCheckFormWrapper.tsx
'use client'

import { useRouter } from 'next/navigation'
import { PregnancyCheckForm } from '@/components/breeding/PregnancyCheckForm'

export function PregnancyCheckFormWrapper({ farmId }: { farmId: string }) {
  const router = useRouter()
  
  const handleEventCreated = () => {
    // Redirect to breeding page or show success message
    router.push('/dashboard/breeding')
  }
  
  const handleCancel = () => {
    // Navigate back to breeding page
    router.push('/dashboard/breeding')
  }
  
  return (
    <PregnancyCheckForm 
      farmId={farmId}
      onEventCreated={handleEventCreated}
      onCancel={handleCancel}
    />
  )
}