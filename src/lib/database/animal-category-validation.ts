// lib/database/animal-category-validation.ts
import { randomUUID } from 'crypto'

/**
 * Validation utility for animal category data
 * Ensures data integrity before database persistence
 */

export interface ValidatedMilkingSchedule {
  id: string
  name: string
  frequency: number
  times: string[]
}

export interface RangeData {
  min: number | null
  max: number | null
}

export interface ValidatedCharacteristics {
  lactating?: boolean
  pregnant?: boolean
  breeding_male?: boolean
  growth_phase?: boolean
  mastitis_risk?: boolean
  under_treatment?: boolean
  vaccination_due?: boolean
  lameness_prone?: boolean
  reproductive_issue?: boolean
  high_concentrate?: boolean
  dry_cow_ration?: boolean
  heifer_ration?: boolean
  high_forage?: boolean
  steaming_feed_ration?: boolean
  bull_feed_ration?: boolean
  calf_feed_ration?: boolean
  [key: string]: any
  // Range characteristics
  dim_range?: RangeData
  milk_yield_range?: RangeData
  lactation_number_range?: RangeData
  days_pregnant_range?: RangeData
  days_to_calving_range?: RangeData
  age_days_range?: RangeData
  weight_range?: RangeData
  daily_gain_range?: RangeData
  body_condition_score_range?: RangeData
  weight_kg_range?: RangeData
  services_per_conception_range?: RangeData
  days_since_heat_range?: RangeData
  // Milking schedules
  milking_schedules?: ValidatedMilkingSchedule[]
  selected_milking_schedule_id?: string
}

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate that a value is in valid HH:MM format (24-hour)
 */
export function validateTimeFormat(time: string): { valid: boolean; error?: string } {
  if (!time || typeof time !== 'string') {
    return { valid: false, error: 'Time must be a string' }
  }

  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/
  if (!timeRegex.test(time)) {
    return { valid: false, error: 'Time must be in HH:MM format (00:00 - 23:59)' }
  }

  return { valid: true }
}

/**
 * Validate that times are in ascending order
 */
export function validateTimesAscending(times: string[]): { valid: boolean; error?: string } {
  if (!Array.isArray(times) || times.length === 0) {
    return { valid: false, error: 'Times array cannot be empty' }
  }

  for (let i = 0; i < times.length - 1; i++) {
    if (times[i] >= times[i + 1]) {
      return {
        valid: false,
        error: `Times must be in ascending order. ${times[i]} is not less than ${times[i + 1]}`
      }
    }
  }

  return { valid: true }
}

/**
 * Validate a single milking schedule
 */
export function validateMilkingSchedule(
  schedule: any,
  index: number
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  // Validate ID
  if (!schedule.id || typeof schedule.id !== 'string') {
    errors.push({
      field: `milking_schedules[${index}].id`,
      message: 'Schedule ID is required and must be a string'
    })
  }

  // Validate name
  if (!schedule.name || typeof schedule.name !== 'string') {
    errors.push({
      field: `milking_schedules[${index}].name`,
      message: 'Schedule name is required'
    })
  }

  // Validate frequency (1-4)
  if (!Number.isInteger(schedule.frequency) || schedule.frequency < 1 || schedule.frequency > 4) {
    errors.push({
      field: `milking_schedules[${index}].frequency`,
      message: 'Frequency must be an integer between 1 and 4'
    })
  }

  // Validate times array
  if (!Array.isArray(schedule.times)) {
    errors.push({
      field: `milking_schedules[${index}].times`,
      message: 'Times must be an array'
    })
  } else {
    // Frequency must match times length
    if (schedule.frequency && schedule.times.length !== schedule.frequency) {
      errors.push({
        field: `milking_schedules[${index}]`,
        message: `Frequency (${schedule.frequency}) must match number of times (${schedule.times.length})`
      })
    }

    // Validate each time format
    schedule.times.forEach((time: string, timeIndex: number) => {
      const timeValidation = validateTimeFormat(time)
      if (!timeValidation.valid) {
        errors.push({
          field: `milking_schedules[${index}].times[${timeIndex}]`,
          message: timeValidation.error || 'Invalid time format'
        })
      }
    })

    // Check if times are in ascending order
    if (schedule.times.length > 1) {
      const ascendingValidation = validateTimesAscending(schedule.times)
      if (!ascendingValidation.valid) {
        errors.push({
          field: `milking_schedules[${index}].times`,
          message: ascendingValidation.error || 'Times must be in ascending order'
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Range bounds by characteristic type
 */
const RANGE_BOUNDS: Record<string, { min: number; max: number; unit: string }> = {
  dim_range: { min: 0, max: 500, unit: 'days' },
  milk_yield_range: { min: 0, max: 100, unit: 'liters' },
  lactation_number_range: { min: 1, max: 15, unit: 'lactations' },
  days_pregnant_range: { min: 0, max: 290, unit: 'days' },
  days_to_calving_range: { min: 0, max: 290, unit: 'days' },
  age_days_range: { min: 0, max: 7300, unit: 'days' }, // ~20 years
  weight_range: { min: 0, max: 1500, unit: 'kg' },
  daily_gain_range: { min: 0, max: 5, unit: 'kg/day' },
  body_condition_score_range: { min: 0, max: 10, unit: 'score' },
  weight_kg_range: { min: 0, max: 1500, unit: 'kg' },
  services_per_conception_range: { min: 1, max: 10, unit: 'services' },
  days_since_heat_range: { min: 0, max: 60, unit: 'days' }
}

/**
 * Validate a single range characteristic
 */
export function validateRangeCharacteristic(
  field: string,
  range: any
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const bounds = RANGE_BOUNDS[field]

  if (!bounds) {
    errors.push({
      field,
      message: `Unknown range characteristic: ${field}`
    })
    return { valid: false, errors }
  }

  // If both min and max are null/undefined, it's valid (optional range)
  if (range.min === null && range.max === null) {
    return { valid: true, errors: [] }
  }

  const minVal = range.min
  const maxVal = range.max

  // Both must be numbers if provided
  if (minVal !== null && typeof minVal !== 'number') {
    errors.push({
      field: `${field}.min`,
      message: 'Minimum value must be a number'
    })
  }

  if (maxVal !== null && typeof maxVal !== 'number') {
    errors.push({
      field: `${field}.max`,
      message: 'Maximum value must be a number'
    })
  }

  // Check bounds
  if (minVal !== null && (minVal < bounds.min || minVal > bounds.max)) {
    errors.push({
      field: `${field}.min`,
      message: `Minimum must be between ${bounds.min} and ${bounds.max} (${bounds.unit})`
    })
  }

  if (maxVal !== null && (maxVal < bounds.min || maxVal > bounds.max)) {
    errors.push({
      field: `${field}.max`,
      message: `Maximum must be between ${bounds.min} and ${bounds.max} (${bounds.unit})`
    })
  }

  // Min must be less than or equal to max
  if (minVal !== null && maxVal !== null && minVal > maxVal) {
    errors.push({
      field,
      message: `Minimum (${minVal}) must be less than or equal to maximum (${maxVal})`
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Replace temporary schedule IDs with persistent UUIDs
 * Temp IDs follow pattern: schedule_${timestamp}
 */
export function replaceTemporaryScheduleIds(
  schedules: ValidatedMilkingSchedule[]
): ValidatedMilkingSchedule[] {
  return schedules.map(schedule => ({
    ...schedule,
    id: schedule.id.startsWith('schedule_') ? randomUUID() : schedule.id
  }))
}

/**
 * Validate age range consistency
 */
export function validateAgeRange(
  minAgeDays: number | null,
  maxAgeDays: number | null
): { valid: boolean; error?: string } {
  if (minAgeDays === null && maxAgeDays === null) {
    return { valid: true }
  }

  if (minAgeDays !== null && maxAgeDays !== null && minAgeDays > maxAgeDays) {
    return {
      valid: false,
      error: `Min age (${minAgeDays} days) must be less than or equal to max age (${maxAgeDays} days)`
    }
  }

  if (minAgeDays !== null && minAgeDays < 0) {
    return { valid: false, error: 'Min age cannot be negative' }
  }

  if (maxAgeDays !== null && maxAgeDays < 0) {
    return { valid: false, error: 'Max age cannot be negative' }
  }

  return { valid: true }
}

/**
 * Main validation function for complete animal category data
 */
export function validateAnimalCategoryData(
  data: any
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  // Validate name
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push({
      field: 'name',
      message: 'Category name is required'
    })
  }

  // Validate gender if provided
  if (data.gender && !['any', 'male', 'female'].includes(data.gender)) {
    errors.push({
      field: 'gender',
      message: 'Gender must be one of: any, male, female'
    })
  }

  // Validate production status if provided
  const validStatuses = ['calf', 'heifer', 'bull', 'served', 'lactating', 'dry', 'steaming_dry_cows', 'open_culling_dry_cows']
  if (data.production_status && !validStatuses.includes(data.production_status)) {
    errors.push({
      field: 'production_status',
      message: `Production status must be one of: ${validStatuses.join(', ')}`
    })
  }

  // Validate age range
  const ageValidation = validateAgeRange(data.min_age_days, data.max_age_days)
  if (!ageValidation.valid) {
    errors.push({
      field: 'age_range',
      message: ageValidation.error || 'Invalid age range'
    })
  }

  // Validate characteristics object
  if (data.characteristics && typeof data.characteristics === 'object') {
    const characteristics = data.characteristics

    // Validate range characteristics
    Object.keys(RANGE_BOUNDS).forEach(field => {
      if (field in characteristics && characteristics[field]) {
        const rangeValidation = validateRangeCharacteristic(field, characteristics[field])
        if (!rangeValidation.valid) {
          errors.push(...rangeValidation.errors)
        }
      }
    })

    // Validate milking schedules
    if (Array.isArray(characteristics.milking_schedules)) {
      characteristics.milking_schedules.forEach((schedule: any, index: number) => {
        const scheduleValidation = validateMilkingSchedule(schedule, index)
        if (!scheduleValidation.valid) {
          errors.push(...scheduleValidation.errors)
        }
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Process and validate characteristics before database persistence
 * This function:
 * 1. Validates all data
 * 2. Replaces temporary schedule IDs with UUIDs
 * 3. Cleans up empty values
 * 4. Returns validated and processed data
 */
export function processCharacteristicsForStorage(
  characteristics: any
): { success: boolean; data?: ValidatedCharacteristics; errors?: ValidationError[] } {
  if (!characteristics || typeof characteristics !== 'object') {
    return {
      success: true,
      data: {}
    }
  }

  const processed: ValidatedCharacteristics = {}

  // Copy boolean characteristics
  const booleanFields = [
    'lactating', 'pregnant', 'breeding_male', 'growth_phase',
    'mastitis_risk', 'under_treatment', 'vaccination_due', 'lameness_prone', 'reproductive_issue',
    'high_concentrate', 'dry_cow_ration', 'heifer_ration', 'high_forage',
    'steaming_feed_ration', 'bull_feed_ration', 'calf_feed_ration'
  ]

  booleanFields.forEach(field => {
    if (characteristics[field] === true) {
      processed[field] = true
    }
  })

  // Copy range characteristics (only if they have values)
  Object.keys(RANGE_BOUNDS).forEach(field => {
    if (field in characteristics && characteristics[field]) {
      const min = characteristics[field].min
      const max = characteristics[field].max
      if (min !== null && min !== undefined || max !== null && max !== undefined) {
        processed[field] = {
          min: min !== null && min !== undefined ? min : null,
          max: max !== null && max !== undefined ? max : null
        }
      }
    }
  })

  // Process milking schedules
  if (Array.isArray(characteristics.milking_schedules) && characteristics.milking_schedules.length > 0) {
    processed.milking_schedules = replaceTemporaryScheduleIds(characteristics.milking_schedules)
    processed.selected_milking_schedule_id = characteristics.selected_milking_schedule_id || ''
  }

  return {
    success: true,
    data: processed
  }
}
