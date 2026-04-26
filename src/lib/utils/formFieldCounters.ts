/**
 * Utility functions for counting filled fields in form sections
 */

export interface FieldCounts {
  filled: number
  total: number
}

/**
 * Count filled basic info fields
 */
export function countBasicInfoFields(data: any): FieldCounts {
  const fields = [
    data.tag_number,
    data.name,
    data.breed,
    data.gender,
    data.birth_date,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled purchase information fields
 */
export function countPurchaseInfoFields(data: any): FieldCounts {
  const fields = [
    data.purchase_date,
    data.purchase_weight,
    data.weight,
    data.purchase_price,
    data.seller_info,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled current status fields
 */
export function countCurrentStatusFields(data: any): FieldCounts {
  const fields = [
    data.health_status,
    data.production_status,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled heifer-specific fields
 */
export function countHeiferFields(data: any): FieldCounts {
  const fields = [
    data.mother_daily_production,
    data.mother_lactation_number,
    data.mother_peak_production,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled served animal fields
 */
export function countServedFields(data: any, currentMilkProduction: number | string, currentLactationNumber: number | string): FieldCounts {
  const fields = [
    data.service_date,
    data.service_method,
    currentMilkProduction,
    currentLactationNumber,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '' && f !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled lactating animal fields
 */
export function countLactatingFields(data: any, currentMilkProduction: number | string, currentLactationNumber: number | string): FieldCounts {
  const fields = [
    data.current_daily_production || currentMilkProduction,
    data.days_in_milk,
    currentLactationNumber,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '' && f !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled steaming dry cow fields
 */
export function countSteamingDryCowsFields(data: any, breedingCycleNumber: number | string): FieldCounts {
  const fields = [
    data.expected_calving_date,
    breedingCycleNumber,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '' && f !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled open/culling dry cow fields
 */
export function countOpenDryCowsFields(data: any, lastBreedingCycleNumber: number | string): FieldCounts {
  const fields = [
    lastBreedingCycleNumber,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '' && f !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled parentage fields (for newborn calf)
 */
export function countParentageFields(data: any): FieldCounts {
  const fields = [
    data.mother_id,
    data.father_info,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled health and physical fields (for newborn calf)
 */
export function countHealthPhysicalFields(data: any): FieldCounts {
  const fields = [
    data.health_status,
    data.birth_weight,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '').length
  return { filled, total: fields.length }
}

/**
 * Count filled additional information fields
 */
export function countAdditionalInfoFields(data: any): FieldCounts {
  const fields = [
    data.notes,
  ]
  const filled = fields.filter(f => f && String(f).trim() !== '').length
  return { filled, total: fields.length }
}
