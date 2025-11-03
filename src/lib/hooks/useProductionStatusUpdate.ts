// src/lib/hooks/useProductionStatusUpdate.ts
import { useEffect } from 'react'
import { Animal } from '@/types/database'

/**
 * Hook to automatically update production tab visibility when animal status changes
 * Particularly useful when:
 * - A heifer calves for the first time (heifer -> lactating)
 * - A cow goes dry (lactating -> dry)
 * - A dry cow starts lactating again (dry -> lactating)
 */
export function useProductionStatusUpdate(
  animal: Animal,
  onStatusChange?: (newStatus: Animal['production_status']) => void
) {
  useEffect(() => {
    // Check if the animal's production status has changed in a way that affects
    // production tab visibility
    const checkStatusChange = () => {
      // This would typically be triggered by breeding records, calving events, etc.
      // The actual status update happens in the database, but we can react to it here
      
      // Example: If a heifer just calved, the status should change to 'lactating'
      // This is handled by your breeding/calving record creation
    }
    
    checkStatusChange()
  }, [animal.production_status, animal.id, onStatusChange])
  
  // Return useful information about production status
  return {
    canProduceNow: animal.production_status === 'lactating',
    willProduceSoon: animal.production_status === 'served',
    isPaused: animal.production_status === 'dry',
    notYetProducing: ['heifer', 'calf'].includes(animal.production_status || ''),
    neverWillProduce: animal.gender === 'male'
  }
}

/**
 * Helper function to determine if production tab should be visible
 */
export function shouldShowProductionTab(animal: Animal): boolean {
  return (
    animal.gender === 'female' &&
    ['lactating', 'served', 'dry'].includes(animal.production_status || '')
  )
}

/**
 * Helper to get production status message
 */
export function getProductionStatusInfo(animal: Animal) {
  const status = animal.production_status
  const gender = animal.gender
  
  if (gender === 'male') {
    return {
      canRecord: false,
      message: 'Not applicable for male animals',
      badge: 'N/A',
      color: 'gray'
    }
  }
  
  switch (status) {
    case 'lactating':
      return {
        canRecord: true,
        message: 'Currently producing milk',
        badge: 'Active',
        color: 'green'
      }
    case 'served':
      return {
        canRecord: false,
        message: 'Pregnant - Production will resume after calving',
        badge: 'Pregnant',
        color: 'blue'
      }
    case 'dry':
      return {
        canRecord: false,
        message: 'Dry period - Not currently producing',
        badge: 'Dry',
        color: 'yellow'
      }
    case 'heifer':
      return {
        canRecord: false,
        message: 'Will become available after first calving',
        badge: 'Not Started',
        color: 'gray'
      }
    case 'calf':
      return {
        canRecord: false,
        message: 'Too young for production',
        badge: 'Calf',
        color: 'gray'
      }
    default:
      return {
        canRecord: false,
        message: 'Unknown production status',
        badge: 'Unknown',
        color: 'gray'
      }
  }
}