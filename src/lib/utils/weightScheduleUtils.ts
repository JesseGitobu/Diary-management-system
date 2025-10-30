// src/lib/utils/weightScheduleUtils.ts

export interface WeightScheduleRule {
  productionStatus: string[]
  ageMinDays?: number
  ageMaxDays?: number
  frequencyDays: number
  reason: string
  priority: 'high' | 'normal' | 'low'
  description: string
}

export const WEIGHT_SCHEDULE_RULES: WeightScheduleRule[] = [
  {
    productionStatus: ['calf'],
    ageMinDays: 0,
    ageMaxDays: 180, // 0-6 months
    frequencyDays: 30, // Monthly
    reason: 'Calf growth monitoring - critical for future productivity',
    priority: 'high',
    description: 'Target: 0.4-0.7 kg daily gain. Early detection of growth issues.'
  },
  {
    productionStatus: ['heifer'],
    ageMinDays: 180,
    ageMaxDays: 450, // 6-15 months
    frequencyDays: 60, // Every 2 months
    reason: 'Growing heifer monitoring - ensures proper breeding weight',
    priority: 'normal',
    description: 'Target: 280-320 kg before first service (~15 months)'
  },
  {
    productionStatus: ['served'], // Pregnant heifers/cows
    frequencyDays: 90, // Every 3 months
    reason: 'Pregnancy monitoring - prevent calving complications',
    priority: 'normal',
    description: 'Monitor body condition during gestation'
  },
  {
    productionStatus: ['lactating'],
    frequencyDays: 60, // Every 2 months
    reason: 'Lactating cow monitoring - fertility & production linked to weight',
    priority: 'normal',
    description: 'Monitor postpartum weight loss and recovery'
  },
  {
    productionStatus: ['dry'],
    frequencyDays: 90, // Every 3 months
    reason: 'Dry cow monitoring - prepare for next lactation',
    priority: 'normal',
    description: 'Set feeding plan for dry period'
  }
]

/**
 * Calculate next weight measurement due date
 */
export function calculateNextWeightDueDate(
  lastMeasurementDate: Date,
  productionStatus: string,
  ageDays: number
): Date {
  const rule = WEIGHT_SCHEDULE_RULES.find(r => {
    const statusMatch = r.productionStatus.includes(productionStatus)
    const ageMatch = !r.ageMinDays || !r.ageMaxDays || 
      (ageDays >= r.ageMinDays && ageDays <= r.ageMaxDays)
    return statusMatch && ageMatch
  })
  
  if (!rule) {
    // Default: every 3 months
    const dueDate = new Date(lastMeasurementDate)
    dueDate.setDate(dueDate.getDate() + 90)
    return dueDate
  }
  
  const dueDate = new Date(lastMeasurementDate)
  dueDate.setDate(dueDate.getDate() + rule.frequencyDays)
  return dueDate
}

/**
 * Check if weight update is required for new/purchased animal
 */
export function requiresImmediateWeightUpdate(
  animalSource: string,
  birthOrPurchaseDate: Date,
  currentWeight?: number
): boolean {
  const daysSince = Math.floor(
    (new Date().getTime() - birthOrPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // Require weight update if animal is > 30 days old and has no weight recorded
  return daysSince > 30 && !currentWeight
}

/**
 * Get weight schedule description for animal
 */
export function getWeightScheduleInfo(
  productionStatus: string,
  ageDays: number
): { frequency: string; reason: string; description: string; priority: string } {
  const rule = WEIGHT_SCHEDULE_RULES.find(r => {
    const statusMatch = r.productionStatus.includes(productionStatus)
    const ageMatch = !r.ageMinDays || !r.ageMaxDays || 
      (ageDays >= r.ageMinDays && ageDays <= r.ageMaxDays)
    return statusMatch && ageMatch
  })
  
  if (!rule) {
    return {
      frequency: 'Every 3 months',
      reason: 'Standard monitoring',
      description: 'Regular weight tracking',
      priority: 'normal'
    }
  }
  
  return {
    frequency: `Every ${Math.floor(rule.frequencyDays / 30)} month${rule.frequencyDays > 30 ? 's' : ''}`,
    reason: rule.reason,
    description: rule.description,
    priority: rule.priority
  }
}