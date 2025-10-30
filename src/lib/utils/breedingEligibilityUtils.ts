import { Animal } from '@/types/database'
import { BreedingSettings } from '@/lib/database/breeding-settings'
import { calculateAgeDays } from '@/lib/utils/productionStatusUtils'

export interface BreedingEligibility {
  canBreed: boolean
  reasons: string[]
  blockers: string[]
  recommendations: string[]
  nextBreedingDate?: string
}

export function checkBreedingEligibility(
  animal: Animal,
  settings: BreedingSettings,
  lastCalvingDate?: string,
  lastBreedingDate?: string
): BreedingEligibility {
  const reasons: string[] = []
  const blockers: string[] = []
  const recommendations: string[] = []
  let canBreed = true

  // 1. Check Gender
  if (animal.gender === 'male') {
    blockers.push('Male animals cannot be bred (they are sires)')
    canBreed = false
    return { canBreed, reasons, blockers, recommendations }
  }

  // 2. Check Age
  const ageInDays = calculateAgeDays(animal.birth_date)
  const ageInMonths = Math.floor(ageInDays / 30)
  const minAgeMonths = settings.minimumBreedingAgeMonths

  if (ageInMonths < minAgeMonths) {
    const daysUntilEligible = (minAgeMonths * 30) - ageInDays
    blockers.push(
      `Too young - minimum breeding age is ${minAgeMonths} months (${daysUntilEligible} days remaining)`
    )
    canBreed = false
    return { canBreed, reasons, blockers, recommendations }
  }

  // 3. Check Production Status
  const eligibleStatuses = ['heifer', 'dry', 'lactating']
  if (!animal.production_status || !eligibleStatuses.includes(animal.production_status)) {
    blockers.push(
      `Production status "${animal.production_status}" is not eligible for breeding`
    )
    canBreed = false
    return { canBreed, reasons, blockers, recommendations }
  }

  // 4. Check Post-Calving Delay
  if (lastCalvingDate) {
    const daysSinceCalving = Math.floor(
      (new Date().getTime() - new Date(lastCalvingDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceCalving < settings.postpartumBreedingDelayDays) {
      const daysRemaining = settings.postpartumBreedingDelayDays - daysSinceCalving
      blockers.push(
        `Too soon after calving - must wait ${settings.postpartumBreedingDelayDays} days (${daysRemaining} days remaining)`
      )
      canBreed = false
      
      const nextDate = new Date(lastCalvingDate)
      nextDate.setDate(nextDate.getDate() + settings.postpartumBreedingDelayDays)
      return { 
        canBreed, 
        reasons, 
        blockers, 
        recommendations, 
        nextBreedingDate: nextDate.toISOString().split('T')[0] 
      }
    } else {
      reasons.push(`Postpartum recovery complete (${daysSinceCalving} days since calving)`)
    }
  }

  // 5. Check Health Status
  const healthBlockers = ['sick', 'quarantined']
  if (animal.health_status && healthBlockers.includes(animal.health_status)) {
    blockers.push(
      `Health status "${animal.health_status}" prevents breeding`
    )
    canBreed = false
    return { canBreed, reasons, blockers, recommendations }
  }

  // 6. Check if Currently Pregnant (served status with expected_calving_date)
  if (animal.production_status === 'served' && animal.expected_calving_date) {
    blockers.push('Animal is currently pregnant')
    canBreed = false
    return { canBreed, reasons, blockers, recommendations }
  }

  // 7. Check Recent Breeding
  if (lastBreedingDate) {
    const daysSinceBreeding = Math.floor(
      (new Date().getTime() - new Date(lastBreedingDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceBreeding < settings.defaultCycleInterval) {
      recommendations.push(
        `Recently bred ${daysSinceBreeding} days ago - typical cycle is ${settings.defaultCycleInterval} days`
      )
    }
  }

  // 8. Production Status Specific Recommendations
  if (animal.production_status === 'heifer') {
    recommendations.push('First time breeding - consider using proven sire with good ease of calving')
  } else if (animal.production_status === 'dry') {
    recommendations.push('Dry cow ready for breeding')
  } else if (animal.production_status === 'lactating') {
    recommendations.push('Currently lactating - breeding will start next lactation cycle')
  }

  // 9. Age-based recommendations
  if (ageInMonths >= minAgeMonths && ageInMonths < (minAgeMonths + 3)) {
    recommendations.push('Recently reached breeding age - monitor heat cycles carefully')
  }

  reasons.push(`Age: ${ageInMonths} months (meets minimum ${minAgeMonths} months)`)
  reasons.push(`Production status: ${animal.production_status} (eligible)`)
  reasons.push(`Health status: ${animal.health_status || 'healthy'}`)

  return { canBreed, reasons, blockers, recommendations }
}

// Helper to get next expected heat date
export function getNextExpectedHeatDate(
  lastHeatDate: string,
  cycleInterval: number
): string {
  const lastHeat = new Date(lastHeatDate)
  lastHeat.setDate(lastHeat.getDate() + cycleInterval)
  return lastHeat.toISOString().split('T')[0]
}

// Helper to calculate expected calving date
export function calculateExpectedCalvingDate(
  breedingDate: string,
  gestationDays: number
): string {
  const breeding = new Date(breedingDate)
  breeding.setDate(breeding.getDate() + gestationDays)
  return breeding.toISOString().split('T')[0]
}

// Helper to calculate expected dry-off date
export function calculateExpectedDryOffDate(
  breedingDate: string,
  daysPregnantAtDryoff: number
): string {
  const breeding = new Date(breedingDate)
  breeding.setDate(breeding.getDate() + daysPregnantAtDryoff)
  return breeding.toISOString().split('T')[0]
}