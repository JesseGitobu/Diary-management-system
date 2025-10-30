// src/lib/utils/productionStatusUtils.ts

interface AnimalCategory {
  id: string
  name: string
  min_age_days?: number
  max_age_days?: number
  gender?: string
  characteristics: {
    lactating?: boolean
    pregnant?: boolean
    breeding_male?: boolean
    growth_phase?: boolean
  }
  production_status?: 'calf' | 'heifer' | 'bull' | 'served' | 'lactating' | 'dry' | null
}

/**
 * Default production status rules based on age and gender
 * Males are now either 'calf' or 'bull' (never 'heifer')
 */
const DEFAULT_PRODUCTION_RULES = {
  female: [
    { maxAgeDays: 180, status: 'calf' },        // 0-6 months = Calf
    { maxAgeDays: 730, status: 'heifer' },      // 6-24 months = Heifer
    { maxAgeDays: Infinity, status: 'dry' }     // 24+ months = Dry (until bred/lactating)
  ],
  male: [
    { maxAgeDays: 180, status: 'calf' },        // 0-6 months = Calf
    { maxAgeDays: Infinity, status: 'bull' }    // 6+ months = Bull (changed from 'heifer')
  ]
}

/**
 * Calculate age in days from birth date
 */
export function calculateAgeDays(birthDate: string | Date | null): number {
  if (!birthDate) return 0
  
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - birth.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// Then update the determineInitialProductionStatus function signature


/**
 * Determine production status from animal categories
 */
export function getProductionStatusFromCategories(
  ageDays: number,
  gender: 'male' | 'female',
  categories: AnimalCategory[]
): string {
  // Filter categories by gender (or gender-neutral categories)
  const applicableCategories = categories
    .filter(cat => !cat.gender || cat.gender === gender)
    .sort((a, b) => (a.min_age_days || 0) - (b.min_age_days || 0))

  // Find matching category based on age range
  for (const category of applicableCategories) {
    const minAge = category.min_age_days ?? 0
    const maxAge = category.max_age_days ?? Infinity

    if (ageDays >= minAge && ageDays <= maxAge) {
      // Use explicit production_status if available
      if (category.production_status) {
        // Validate gender-specific statuses
        if (gender === 'male' && ['heifer', 'served', 'lactating', 'dry'].includes(category.production_status)) {
          console.warn(`Category "${category.name}" has female-only status "${category.production_status}" but is being applied to a male animal. Using default rules.`)
          return getDefaultProductionStatus(ageDays, gender)
        }
        
        if (gender === 'female' && category.production_status === 'bull') {
          console.warn(`Category "${category.name}" has male-only status "bull" but is being applied to a female animal. Using default rules.`)
          return getDefaultProductionStatus(ageDays, gender)
        }
        
        return category.production_status
      }
      
      // Fallback to mapping characteristics
      return mapCategoryToProductionStatus(category, ageDays, gender)
    }
  }

  // Fallback to default rules
  return getDefaultProductionStatus(ageDays, gender)
}

/**
 * Map category characteristics to production status (FALLBACK ONLY)
 * Updated to handle male animals correctly
 */
function mapCategoryToProductionStatus(
  category: AnimalCategory, 
  ageDays: number,
  gender: 'male' | 'female'
): string {
  const chars = category.characteristics
  const nameLower = category.name.toLowerCase()

  // MALE-SPECIFIC LOGIC
  if (gender === 'male') {
    // Young males are calves
    if (ageDays < 180 || chars.growth_phase || nameLower.includes('calf')) {
      return 'calf'
    }
    
    // Mature males are bulls (breeding males)
    if (chars.breeding_male || nameLower.includes('bull') || nameLower.includes('breeding')) {
      return 'bull'
    }
    
    // Default for males
    return ageDays < 180 ? 'calf' : 'bull'
  }

  // FEMALE-SPECIFIC LOGIC
  // Priority order for mapping:
  if (chars.lactating || nameLower.includes('lactating')) {
    return 'lactating'
  }
  
  if (chars.pregnant || nameLower.includes('served') || nameLower.includes('pregnant') || nameLower.includes('in-calf')) {
    return 'served'
  }
  
  if (nameLower.includes('dry')) {
    return 'dry'
  }
  
  if (chars.growth_phase || nameLower.includes('young')) {
    if (ageDays < 180 || nameLower.includes('calf')) {
      return 'calf'
    }
    return 'heifer'
  }
  
  if (nameLower.includes('calf')) return 'calf'
  if (nameLower.includes('heifer')) return 'heifer'
  
  // Default for females
  return getDefaultProductionStatus(ageDays, gender)
}

/**
 * Get default production status when no categories match
 * Males are now properly handled
 */
function getDefaultProductionStatus(ageDays: number, gender: 'male' | 'female'): string {
  const rules = DEFAULT_PRODUCTION_RULES[gender]
  
  for (const rule of rules) {
    if (ageDays <= rule.maxAgeDays) {
      return rule.status
    }
  }
  
  // Final fallback
  return gender === 'female' ? 'dry' : 'bull'
}

/**
 * Validate if production status is appropriate for gender
 */
export function isValidProductionStatusForGender(
  productionStatus: string,
  gender: 'male' | 'female'
): boolean {
  const femaleOnlyStatuses = ['heifer', 'served', 'lactating', 'dry']
  const maleOnlyStatuses = ['bull']
  
  if (gender === 'male' && femaleOnlyStatuses.includes(productionStatus)) {
    return false
  }
  
  if (gender === 'female' && maleOnlyStatuses.includes(productionStatus)) {
    return false
  }
  
  return true
}

/**
 * Get valid production statuses for a given gender
 */
export function getValidProductionStatusesForGender(gender: 'male' | 'female'): string[] {
  if (gender === 'male') {
    return ['calf', 'bull']
  }
  
  return ['calf', 'heifer', 'served', 'lactating', 'dry']
}

/**
 * Client-side helper to determine production status for new animals
 * This can be used in forms before submission
 */
export function determineInitialProductionStatus(
  birthDate: string | Date | null,
  gender: 'male' | 'female',
  categories: AnimalCategory[] = []
): string {
  const ageDays = calculateAgeDays(birthDate)
  return getProductionStatusFromCategories(ageDays, gender, categories)
}

/**
 * Enhanced version that considers health status
 * Don't override production status if animal has active health issues
 */
export function getProductionStatusWithHealthCheck(
  ageDays: number,
  gender: 'male' | 'female',
  categories: AnimalCategory[],
  currentProductionStatus?: string,
  healthStatus?: string
): string {
  // If animal is sick/quarantined and already has a production status, keep it
  if (healthStatus && ['sick', 'quarantined'].includes(healthStatus)) {
    if (currentProductionStatus) {
      return currentProductionStatus
    }
  }
  
  return getProductionStatusFromCategories(ageDays, gender, categories)
}

/**
 * Validate if production status change makes sense
 */
export function validateProductionStatusTransition(
  currentStatus: string,
  newStatus: string,
  ageDays: number
): { valid: boolean; reason?: string } {
  // Define valid transitions
  const validTransitions: Record<string, string[]> = {
    'calf': ['heifer', 'calf'], // Can stay calf or progress to heifer
    'heifer': ['served', 'lactating', 'heifer'], // Can be served or start lactating
    'served': ['lactating', 'dry', 'served'], // After serving, can lactate or dry
    'lactating': ['dry', 'served', 'lactating'], // After lactation, can dry or be served again
    'dry': ['served', 'lactating', 'dry'] // Dry cows can be served or lactate
  }
  
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}`
    }
  }
  
  // Age-based validation
  if (newStatus === 'calf' && ageDays > 180) {
    return {
      valid: false,
      reason: 'Animal is too old to be classified as calf'
    }
  }
  
  return { valid: true }
}

// Add this helper function for display labels
export function getProductionStatusDisplay(status: string, gender?: string): string {
  const labels: Record<string, string> = {
    'calf': 'Calf',
    'heifer': 'Heifer',
    'bull': 'Bull',
    'served': 'Served (In-Calf)',
    'lactating': 'Lactating',
    'dry': 'Dry'
  }
  
  return labels[status] || status
}

export function getProductionStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    'calf': 'bg-blue-100 text-blue-800',
    'heifer': 'bg-purple-100 text-purple-800',
    'bull': 'bg-orange-100 text-orange-800',
    'served': 'bg-pink-100 text-pink-800',
    'lactating': 'bg-green-100 text-green-800',
    'dry': 'bg-gray-100 text-gray-800'
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}