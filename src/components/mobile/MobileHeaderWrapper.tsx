'use client'

import { MobileHeader } from './MobileHeader'

interface MobileHeaderWrapperProps {
  trackingFeatures?: string[] | null
  animalCount?: number
  farmId?: string | null
}

/**
 * Wrapper component to ensure MobileHeader has access to AuthProvider context
 * This component is a Client Component that wraps MobileHeader
 * It ensures the proper context boundary between Server and Client components
 */
export function MobileHeaderWrapper({ 
  trackingFeatures = [], 
  animalCount = 0, 
  farmId 
}: MobileHeaderWrapperProps) {
  return (
    <MobileHeader 
      trackingFeatures={trackingFeatures}
      animalCount={animalCount}
      farmId={farmId}
    />
  )
}
