// lib/utils/tag-generator.ts
import { getTaggingSettings } from '@/lib/database/tagging-settings'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface TagGenerationOptions {
  prefix?: string
  numberingSystem?: 'sequential' | 'custom' | 'barcode'
  startingNumber?: number
  paddingLength?: number
}

export interface TagGenerationContext {
  animalSource: 'newborn_calf' | 'purchased_animal'
  animalData: {
    breed?: string
    gender?: string
    mother_id?: string
    birth_date?: string
    production_status?: string
    [key: string]: any
  }
  customAttributes?: Array<{
    name: string
    value: string
  }>}

export async function generateAnimalTagNumber(
  farmId: string,
  taggingSettings?: any,
  context?: TagGenerationContext
): Promise<string> {
  let settings: any;
  try {
    // Get settings if not provided
    settings = taggingSettings || await getTaggingSettings(farmId)
    
    console.log('🏷️ Generating tag number with settings:', {
      method: settings.method,
      numberingSystem: settings.numberingSystem,
      tagPrefix: settings.tagPrefix,
      customFormat: settings.customFormat
    })

    let generatedTag: string

    switch (settings.numberingSystem) {
      case 'sequential':
        generatedTag = await generateSequentialTag(farmId, settings)
        break
        
      case 'custom':
        generatedTag = await generateCustomFormatTag(farmId, settings, context)
        break
        
      case 'barcode':
        generatedTag = await generateBarcodeTag(farmId, settings)
        break
        
      default:
        generatedTag = await generateSequentialTag(farmId, settings)
        break
    }

    console.log('✅ Generated tag number:', generatedTag)
    
    // Validate the generated tag
    const validation = validateGeneratedTag(generatedTag, settings)
    if (!validation.isValid) {
      throw new Error(`Generated tag validation failed: ${validation.errors.join(', ')}`)
    }

    // Check for uniqueness
    const isUnique = await checkTagUniqueness(farmId, generatedTag)
    if (!isUnique) {
      // Try to generate alternative
      const alternativeTag = await generateAlternativeTag(farmId, settings, generatedTag, context)
      console.log('⚠️ Tag not unique, using alternative:', alternativeTag)
      return alternativeTag
    }

    return generatedTag

  } catch (error) {
    console.error('❌ Error generating animal tag number:', error)
    
    // Fallback to simple sequential
    const fallbackTag = await generateFallbackTag(farmId, settings?.tagPrefix || 'COW')
    console.log('🔄 Using fallback tag:', fallbackTag)
    return fallbackTag
  }
}

async function generateSequentialTag(farmId: string, settings: any): Promise<string> {
  const nextNumber = await getNextSequenceNumber(farmId)
  const paddedNumber = nextNumber.toString().padStart(3, '0')
  return `${settings.tagPrefix || 'COW'}-${paddedNumber}`
}

async function generateCustomFormatTag(
  farmId: string, 
  settings: any, 
  context?: TagGenerationContext
): Promise<string> {
  const format = settings.customFormat || '{PREFIX}-{NUMBER:3}'
  const nextNumber = await getNextSequenceNumber(farmId)
  
  const currentYear = new Date().getFullYear().toString()
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')

  let result: string = format
    .replace(/\{PREFIX\}/g, settings.tagPrefix || 'COW')
    .replace(/\{YEAR\}/g, currentYear)
    .replace(/\{YEAR:2\}/g, currentYear.slice(-2))
    .replace(/\{MONTH\}/g, currentMonth)
    .replace(/\{MONTH:1\}/g, (new Date().getMonth() + 1).toString())
    .replace(/\{NUMBER:(\d+)\}/g, (match: string, digits: string) => {
      return nextNumber.toString().padStart(parseInt(digits), '0')
    })
    .replace(/\{NUMBER\}/g, nextNumber.toString())

  // Handle standard animal data placeholders
  if (context?.animalData) {
    const animalData = context.animalData
    
    // PRODUCTION_STAGE replacements - NEW
    if (animalData.production_status) {
      const productionStageAbbrev = getProductionStatusAbbreviation(animalData.production_status)
      result = result
        .replace(/\{PRODUCTION_STAGE:(\d+)\}/g, (match: string, digits: string) => {
          return productionStageAbbrev.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
        })
        .replace(/\{PRODUCTION_STAGE\}/g, productionStageAbbrev)
    }
    
    // BREED_GROUP replacements - NEW  
    if (animalData.breed) {
      const breedGroupAbbrev = getBreedAbbreviation(animalData.breed)
      result = result
        .replace(/\{BREED_GROUP:(\d+)\}/g, (match: string, digits: string) => {
          return breedGroupAbbrev.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
        })
        .replace(/\{BREED_GROUP\}/g, breedGroupAbbrev)
    }
    
    // Existing replacements...
    if (animalData.breed) {
      const breedShort = getBreedAbbreviation(animalData.breed)
      result = result
        .replace(/\{BREED:(\d+)\}/g, (match: string, digits: string) => {
          return breedShort.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
        })
        .replace(/\{BREED\}/g, breedShort)
    }
    
    if (animalData.gender) {
      const genderShort = animalData.gender.charAt(0).toUpperCase()
      result = result
        .replace(/\{GENDER:(\d+)\}/g, (match: string, digits: string) => {
          return genderShort.padEnd(parseInt(digits), 'X')
        })
        .replace(/\{GENDER\}/g, genderShort)
    }
    
    if (animalData.production_status) {
      const statusShort = getProductionStatusAbbreviation(animalData.production_status)
      result = result
        .replace(/\{STATUS:(\d+)\}/g, (match: string, digits: string) => {
          return statusShort.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
        })
        .replace(/\{STATUS\}/g, statusShort)
    }
    
    const sourceShort = context.animalSource === 'newborn_calf' ? 'BC' : 'PU'
    result = result
      .replace(/\{SOURCE:(\d+)\}/g, (match: string, digits: string) => {
        return sourceShort.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
      })
      .replace(/\{SOURCE\}/g, sourceShort)
  }

  // Handle custom attributes if available
  if (context?.customAttributes && settings.customAttributes) {
    settings.customAttributes.forEach((attr: any) => {
      const attributePlaceholder = attr.name.toUpperCase().replace(/\s+/g, '_')
      
      const contextAttr = context.customAttributes?.find(
        ca => ca.name.toLowerCase() === attr.name.toLowerCase()
      )
      
      const attributeValue = contextAttr?.value || attr.values[0] || 'X'
      
      const regex = new RegExp(`\\{${attributePlaceholder}:(\\d+)\\}`, 'g')
      result = result.replace(regex, (match, digits) => {
        return attributeValue.substring(0, parseInt(digits)).toUpperCase().padEnd(parseInt(digits), 'X')
      })
      
      const simpleRegex = new RegExp(`\\{${attributePlaceholder}\\}`, 'g')
      result = result.replace(simpleRegex, attributeValue.substring(0, 3).toUpperCase())
    })
  }

  return result
}

async function generateBarcodeTag(farmId: string, settings: any): Promise<string> {
  const nextNumber = await getNextSequenceNumber(farmId)
  const prefix = settings.tagPrefix || 'COW'
  const barcodeType = settings.barcodeType || 'code128'
  const length = settings.barcodeLength || 8
  const includePadding = settings.paddingZeros ?? true
  const includeCheckDigit = settings.includeCheckDigit || false

  let result: string

  switch (barcodeType) {
    case 'code128':
      const paddedNum = includePadding
        ? nextNumber.toString().padStart(Math.max(0, length - prefix.length), '0')
        : nextNumber.toString()
      result = `${prefix}${paddedNum}`
      break

    case 'code39':
      const code39Prefix = prefix.replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '')
      const code39Num = includePadding
        ? nextNumber.toString().padStart(Math.max(0, length - code39Prefix.length), '0')
        : nextNumber.toString()
      result = `${code39Prefix}${code39Num}`
      break

    case 'ean13':
      const prefixDigits = prefix.replace(/\D/g, '').slice(0, 3).padStart(3, '0')
      const numberDigits = nextNumber.toString().padStart(9, '0').slice(0, 9)
      const ean13Base = `${prefixDigits}${numberDigits}`
      const checkDigit = includeCheckDigit ? calculateEAN13CheckDigit(ean13Base) : '0'
      result = ean13Base + checkDigit
      break

    case 'upc':
      const upcPrefix = prefix.replace(/\D/g, '').slice(0, 1).padStart(1, '0')
      const upcNumber = nextNumber.toString().padStart(10, '0').slice(0, 10)
      const upcBase = `${upcPrefix}${upcNumber}`
      const upcCheck = includeCheckDigit ? calculateUPCCheckDigit(upcBase) : '0'
      result = upcBase + upcCheck
      break

    default:
      result = `${prefix}${nextNumber}`
      break
  }

  return result
}

async function getNextSequenceNumber(farmId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  try {
    // Get current next number and increment it atomically
    const { data, error } = await supabase
      .rpc('increment_tag_number', { farm_id_input: farmId })

    if (error) {
      console.error('Error incrementing tag number:', error)
      // Fallback: get current number and add 1
      const settings = await getTaggingSettings(farmId)
      return (settings.nextNumber || 1) + 1
    }

    return data || 1
  } catch (error) {
    console.error('Error in getNextSequenceNumber:', error)
    return 1
  }
}

async function checkTagUniqueness(farmId: string, tagNumber: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('animals')
    .select('id')
    .eq('farm_id', farmId)
    .eq('tag_number', tagNumber)
    .neq('status', 'inactive')
    .single()

  if (error && error.code === 'PGRST116') {
    // No rows found - tag is unique
    return true
  }

  return !data // Returns true if no existing animal found
}

async function generateAlternativeTag(
  farmId: string, 
  settings: any, 
  originalTag: string,
  context?: TagGenerationContext
): Promise<string> {
  // Try up to 10 alternatives
  for (let attempt = 1; attempt <= 10; attempt++) {
    let alternativeTag: string

    if (settings.numberingSystem === 'sequential') {
      const nextNumber = await getNextSequenceNumber(farmId)
      const paddedNumber = (nextNumber + attempt).toString().padStart(3, '0')
      alternativeTag = `${settings.tagPrefix || 'COW'}-${paddedNumber}`
    } else {
      // For other formats, append a suffix
      alternativeTag = `${originalTag}-${attempt}`
    }

    const isUnique = await checkTagUniqueness(farmId, alternativeTag)
    if (isUnique) {
      return alternativeTag
    }
  }

  // If all alternatives fail, use timestamp
  const timestamp = Date.now().toString().slice(-6)
  return `${settings.tagPrefix || 'COW'}-${timestamp}`
}

async function generateFallbackTag(farmId: string, prefix: string): Promise<string> {
  const timestamp = Date.now().toString().slice(-6)
  const fallbackTag = `${prefix}-${timestamp}`
  
  const isUnique = await checkTagUniqueness(farmId, fallbackTag)
  if (isUnique) {
    return fallbackTag
  }

  // Ultimate fallback
  return `${prefix}-${Date.now()}`
}

function validateGeneratedTag(tagNumber: string, settings: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!tagNumber || tagNumber.trim().length === 0) {
    errors.push('Tag number cannot be empty')
  }

  if (tagNumber.length > 50) {
    errors.push('Tag number exceeds maximum length (50 characters)')
  }

  if (!/^[A-Za-z0-9\-_]+$/.test(tagNumber)) {
    errors.push('Tag number contains invalid characters')
  }

  // Barcode-specific validations
  if (settings.numberingSystem === 'barcode') {
    switch (settings.barcodeType) {
      case 'ean13':
        if (!/^\d{13}$/.test(tagNumber)) {
          errors.push('EAN-13 barcode must be exactly 13 digits')
        }
        break
      case 'upc':
        if (!/^\d{12}$/.test(tagNumber)) {
          errors.push('UPC barcode must be exactly 12 digits')
        }
        break
      case 'code39':
        if (!/^[A-Z0-9\-\.\ \$\/\+\%]*$/.test(tagNumber)) {
          errors.push('Code 39 barcode contains invalid characters')
        }
        break
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function previewTagGeneration(
  settings: any, 
  context?: TagGenerationContext,
  nextNumber: number = 1
): string {
  try {
    console.log('🎯 Generating preview with:', { 
      numberingSystem: settings.numberingSystem, 
      nextNumber, 
      context: context?.animalData 
    })

    switch (settings.numberingSystem) {
      case 'sequential':
        return generateSequentialPreview(settings, nextNumber)
        
      case 'custom':
        return generateCustomFormatPreview(settings, context, nextNumber)
        
      case 'barcode':
        return generateEnhancedBarcodePreview(settings, nextNumber)
        
      default:
        return generateSequentialPreview(settings, nextNumber)
    }
  } catch (error) {
    console.error('Error in previewTagGeneration:', error)
    return `${settings.tagPrefix || 'COW'}-${nextNumber.toString().padStart(3, '0')}`
  }
}

function generateSequentialPreview(settings: any, nextNumber: number): string {
  const prefix = settings.tagPrefix || 'COW'
  const paddedNumber = nextNumber.toString().padStart(3, '0')
  return `${prefix}-${paddedNumber}`
}

function generateCustomFormatPreview(
  settings: any, 
  context?: TagGenerationContext, 
  nextNumber: number = 1
): string {
  const format = settings.customFormat || '{PREFIX}-{NUMBER:3}'
  const currentYear = new Date().getFullYear().toString()
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
  
  // Start with basic replacements
  let result = format
    .replace(/\{PREFIX\}/g, settings.tagPrefix || 'COW')
    .replace(/\{YEAR\}/g, currentYear)
    .replace(/\{YEAR:2\}/g, currentYear.slice(-2))
    .replace(/\{MONTH\}/g, currentMonth)
    .replace(/\{MONTH:1\}/g, (new Date().getMonth() + 1).toString())
    .replace(/\{NUMBER:(\d+)\}/g, (match: string, digits: string) => {
      return nextNumber.toString().padStart(parseInt(digits), '0')
    })
    .replace(/\{NUMBER\}/g, nextNumber.toString())

  // Handle standard animal data placeholders
  if (context?.animalData) {
    const animalData = context.animalData
    
    // PRODUCTION_STAGE replacements - NEW
    if (animalData.production_status) {
      const productionStageAbbrev = getProductionStatusAbbreviation(animalData.production_status)
      result = result
        .replace(/\{PRODUCTION_STAGE:(\d+)\}/g, (match: string, digits: string): string => {
          return productionStageAbbrev.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
        })
        .replace(/\{PRODUCTION_STAGE\}/g, productionStageAbbrev)
    }
    
    // BREED_GROUP replacements - NEW  
    if (animalData.breed) {
      const breedGroupAbbrev = getBreedAbbreviation(animalData.breed)
      result = result
        .replace(/\{BREED_GROUP:(\d+)\}/g, (match: string, digits: string): string => {
          return breedGroupAbbrev.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
        })
        .replace(/\{BREED_GROUP\}/g, breedGroupAbbrev)
    }
    
    // Existing breed replacements (keep for backward compatibility)
    if (animalData.breed) {
      const breedShort = getBreedAbbreviation(animalData.breed)
      result = result
        .replace(/\{BREED:(\d+)\}/g, (match: string, digits: string): string => {
          return breedShort.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
        })
        .replace(/\{BREED\}/g, breedShort)
    }
    
    // Gender replacements
    if (animalData.gender) {
      const genderShort = animalData.gender.charAt(0).toUpperCase()
      result = result
        .replace(/\{GENDER:(\d+)\}/g, (match: string, digits: string): string => {
          return genderShort.padEnd(parseInt(digits), 'X')
        })
        .replace(/\{GENDER\}/g, genderShort)
    }
    
    // Production status replacements (existing)
    if (animalData.production_status) {
      const statusShort = getProductionStatusAbbreviation(animalData.production_status)
      result = result
        .replace(/\{STATUS:(\d+)\}/g, (match: string, digits: string): string => {
          return statusShort.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
        })
        .replace(/\{STATUS\}/g, statusShort)
    }
    
    // Source replacements
    const sourceShort = context.animalSource === 'newborn_calf' ? 'BC' : 'PU' // Born/Purchased
    result = result
      .replace(/\{SOURCE:(\d+)\}/g, (match: string, digits: string): string => {
        return sourceShort.substring(0, parseInt(digits)).padEnd(parseInt(digits), 'X')
      })
      .replace(/\{SOURCE\}/g, sourceShort)
  }

  // Handle dynamic custom attributes if available in context
  if (context?.customAttributes) {
    context.customAttributes.forEach(attr => {
      const attributeName = attr.name.toUpperCase().replace(/\s+/g, '_')
      const attributeValue = attr.value || 'X'
      
      // Replace with length specification: {BREED:3} -> HOL
      const lengthRegex = new RegExp(`\\{${attributeName}:(\\d+)\\}`, 'g')
      result = result.replace(lengthRegex, (match: string, digits: string): string => {
        return attributeValue.substring(0, parseInt(digits)).toUpperCase().padEnd(parseInt(digits), 'X')
      })
      
      // Replace simple placeholders: {BREED} -> HOL
      const simpleRegex = new RegExp(`\\{${attributeName}\\}`, 'g')
      result = result.replace(simpleRegex, attributeValue.substring(0, 3).toUpperCase())
    })
  }

  // Clean up any remaining unresolved placeholders
  result = result.replace(/\{[^}]+\}/g, 'X')

  return result
}

function getBreedAbbreviation(breed: string): string {
  const abbreviations: Record<string, string> = {
    'holstein': 'HO',
    'jersey': 'JE', 
    'guernsey': 'GU',
    'ayrshire': 'AY',
    'brown_swiss': 'BR', // This should map to 'BR' for your format
    'crossbred': 'CR',
    'friesian': 'FR',
    'angus': 'AN',
    'hereford': 'HE',
    'simmental': 'SI',
    'charolais': 'CH',
    'limousin': 'LI',
    'other': 'OT'
  }
  
  return abbreviations[breed.toLowerCase()] || breed.substring(0, 2).toUpperCase()
}

function getProductionStatusAbbreviation(status: string): string {
  const abbreviations: Record<string, string> = {
    'calf': 'CA',
    'heifer': 'HE',
    'served': 'SE',
    'lactating': 'LA', // This should map to 'LA' for your format
    'dry': 'DR',
    'pregnant': 'PR'
  }
  
  return abbreviations[status.toLowerCase()] || status.substring(0, 2).toUpperCase()
}

export function generateMultipleTagPreviews(
  settings: any,
  context?: TagGenerationContext,
  count: number = 3
): string[] {
  const previews: string[] = []
  const startNumber = settings.nextNumber || 1
  
  for (let i = 0; i < count; i++) {
    const preview = previewTagGeneration(settings, context, startNumber + i)
    previews.push(preview)
  }
  
  return previews
}

// Validate that a custom format will work properly
export function validateCustomFormatForPreview(format: string): {
  isValid: boolean
  errors: string[]
  supportedPlaceholders: string[]
} {
  const errors: string[] = []
  const supportedPlaceholders = [
    '{PREFIX}', '{NUMBER}', '{NUMBER:1}', '{NUMBER:2}', '{NUMBER:3}', 
    '{NUMBER:4}', '{NUMBER:5}', '{NUMBER:6}',
    '{YEAR}', '{YEAR:2}', '{MONTH}', '{MONTH:1}',
    '{BREED}', '{BREED:1}', '{BREED:2}', '{BREED:3}',
    '{GENDER}', '{GENDER:1}',
    '{STATUS}', '{STATUS:1}', '{STATUS:2}', '{STATUS:3}',
    '{SOURCE}', '{SOURCE:1}', '{SOURCE:2}'
  ]
  
  // Find all placeholders in the format
  const placeholderPattern = /\{[^}]+\}/g
  const foundPlaceholders = format.match(placeholderPattern) || []
  
  // Check each placeholder
  foundPlaceholders.forEach(placeholder => {
    // Check if it's a supported placeholder or matches a pattern
    const isSupported = supportedPlaceholders.includes(placeholder) ||
                       /\{NUMBER:\d+\}/.test(placeholder) ||
                       /\{BREED:\d+\}/.test(placeholder) ||
                       /\{STATUS:\d+\}/.test(placeholder) ||
                       /\{SOURCE:\d+\}/.test(placeholder)
    
    if (!isSupported) {
      errors.push(`Unsupported placeholder: ${placeholder}`)
    }
  })
  
  // Must contain a number placeholder
  if (!format.includes('{NUMBER')) {
    errors.push('Format must include a {NUMBER} or {NUMBER:digits} placeholder')
  }
  
  // Check for balanced braces
  const openBraces = (format.match(/\{/g) || []).length
  const closeBraces = (format.match(/\}/g) || []).length
  if (openBraces !== closeBraces) {
    errors.push('Format contains unbalanced braces')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    supportedPlaceholders
  }
}

function generateEnhancedBarcodePreview(settings: any, nextNumber: number): string {
  const prefix = settings.tagPrefix || 'COW'
  const barcodeLength = settings.barcodeLength || 8
  const paddingZeros = settings.paddingZeros ?? true
  
  if (paddingZeros) {
    const availableLength = Math.max(0, barcodeLength - prefix.length)
    const paddedNumber = nextNumber.toString().padStart(availableLength, '0')
    return `${prefix}${paddedNumber}`
  } else {
    return `${prefix}${nextNumber}`
  }
}


export async function generateNextTagNumber(
  farmId: string,
  options?: TagGenerationOptions
): Promise<string> {
  try {
    const settings = await getTaggingSettings(farmId)
    
    const prefix = options?.prefix || settings.tagPrefix
    const system = options?.numberingSystem || settings.numberingSystem
    const nextNum = options?.startingNumber || settings.nextNumber

    switch (system) {
      case 'sequential':
        return formatSequentialTag(prefix, nextNum, options?.paddingLength || 3)
      
      case 'barcode':
        return formatBarcodeTag(prefix, nextNum, {
          type: 'code128',
          length: options?.paddingLength || 6,
          includeCheckDigit: false,
          paddingZeros: true
        })
      
      case 'custom':
        return formatCustomTag(prefix, '{PREFIX}-{NUMBER}', nextNum)
      
      default:
        return formatSequentialTag(prefix, nextNum, 3)
    }
  } catch (error) {
    console.error('Error generating tag number:', error)
    return 'COW-001' // Fallback
  }
}

export function formatSequentialTag(
  prefix: string, 
  number: number, 
  paddingLength: number = 3
): string {
  return `${prefix}-${String(number).padStart(paddingLength, '0')}`
}

export function formatBarcodeTag(
  prefix: string,
  number: number,
  options: {
    type: 'code128' | 'code39' | 'ean13' | 'upc'
    length: number
    includeCheckDigit?: boolean
    paddingZeros?: boolean
  }
): string {
  const { type, length, includeCheckDigit, paddingZeros } = options
  
  let baseNumber = paddingZeros 
    ? number.toString().padStart(length, '0')
    : number.toString()
    
  switch (type) {
    case 'code128':
      // Code 128 supports alphanumeric, most flexible
      return `${prefix}${baseNumber}`
      
    case 'code39':
      // Code 39 basic format, limited character set
      return `${prefix.replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '')}${baseNumber}`
      
    case 'ean13':
      // EAN-13 requires exactly 13 digits
      const ean13Base = `${prefix.replace(/\D/g, '').slice(0, 3)}${baseNumber}`.slice(0, 12)
      const checkDigit = includeCheckDigit ? calculateEAN13CheckDigit(ean13Base) : '0'
      return ean13Base.padStart(12, '0') + checkDigit
      
    case 'upc':
      // UPC-A requires exactly 12 digits
      const upcBase = `${prefix.replace(/\D/g, '').slice(0, 2)}${baseNumber}`.slice(0, 11)
      const upcCheck = includeCheckDigit ? calculateUPCCheckDigit(upcBase) : '0'
      return upcBase.padStart(11, '0') + upcCheck
      
    default:
      return `${prefix}${baseNumber}`
  }
}

function calculateEAN13CheckDigit(barcode: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode[i])
    sum += i % 2 === 0 ? digit : digit * 3
  }
  return ((10 - (sum % 10)) % 10).toString()
}

function calculateUPCCheckDigit(barcode: string): string {
  let sum = 0
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(barcode[i])
    sum += i % 2 === 0 ? digit * 3 : digit
  }
  return ((10 - (sum % 10)) % 10).toString()
}

export function formatCustomTag(
  prefix: string, 
  customFormat: string, 
  number: number,
  options?: {
    breed?: string
    location?: string
    additionalData?: Record<string, string>
  }
): string {
  if (!customFormat) {
    return formatSequentialTag(prefix, number)
  }
  
  const currentYear = new Date().getFullYear().toString()
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const currentDay = new Date().getDate().toString().padStart(2, '0')
  
  let result = customFormat
    .replace(/\{PREFIX\}/g, prefix || 'COW')
    .replace(/\{YEAR\}/g, currentYear)
    .replace(/\{YEAR:2\}/g, currentYear.slice(-2))
    .replace(/\{MONTH\}/g, currentMonth)
    .replace(/\{MONTH:1\}/g, (new Date().getMonth() + 1).toString())
    .replace(/\{DAY\}/g, currentDay)
    .replace(/\{BREED:(\d+)\}/g, (match, digits) => {
      const breed = options?.breed?.toUpperCase().slice(0, parseInt(digits)) || 'X'.repeat(parseInt(digits))
      return breed.padEnd(parseInt(digits), 'X')
    })
    .replace(/\{LOCATION:(\d+)\}/g, (match, digits) => {
      const location = options?.location?.toUpperCase().slice(0, parseInt(digits)) || 'A'.repeat(parseInt(digits))
      return location.padEnd(parseInt(digits), 'A')
    })
    .replace(/\{NUMBER:(\d+)\}/g, (match, digits) => {
      return number.toString().padStart(parseInt(digits), '0')
    })
    .replace(/\{NUMBER\}/g, number.toString())
  
  // Handle any additional custom placeholders
  if (options?.additionalData) {
    Object.entries(options.additionalData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key.toUpperCase()}\\}`, 'g')
      result = result.replace(regex, value)
    })
  }
  
  return result
}

export function validateTagNumber(tagNumber: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Basic validation
  if (!tagNumber || tagNumber.trim().length === 0) {
    errors.push('Tag number is required')
  }

  if (tagNumber.length > 50) {
    errors.push('Tag number cannot exceed 50 characters')
  }

  // Check for invalid characters
  if (!/^[A-Za-z0-9\-_]+$/.test(tagNumber)) {
    errors.push('Tag number can only contain letters, numbers, hyphens, and underscores')
  }

  // Check for common issues
  if (tagNumber.startsWith('-') || tagNumber.endsWith('-')) {
    errors.push('Tag number cannot start or end with a hyphen')
  }

  if (tagNumber.includes('--')) {
    errors.push('Tag number cannot contain consecutive hyphens')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function parseTagNumber(tagNumber: string): {
  prefix: string
  number: number
  originalFormat: string
} {
  // Try to parse different tag formats
  const patterns = [
    /^([A-Za-z]+)-(\d+)$/, // PREFIX-123
    /^([A-Za-z]+)(\d+)$/, // PREFIX123
    /^([A-Za-z]+)_(\d+)$/ // PREFIX_123
  ]

  for (const pattern of patterns) {
    const match = tagNumber.match(pattern)
    if (match) {
      return {
        prefix: match[1],
        number: parseInt(match[2], 10),
        originalFormat: tagNumber
      }
    }
  }

  // If no pattern matches, treat whole thing as prefix
  return {
    prefix: tagNumber,
    number: 0,
    originalFormat: tagNumber
  }
}

export function generateBatchTagNumbers(
  farmId: string,
  count: number,
  options?: TagGenerationOptions
): Promise<string[]> {
  return Promise.all(
    Array.from({ length: count }, async (_, index) => {
      return generateNextTagNumber(farmId, {
        ...options,
        startingNumber: (options?.startingNumber || 1) + index
      })
    })
  )
}

export function isTagNumberAvailable(
  tagNumber: string,
  existingTags: string[]
): boolean {
  return !existingTags.includes(tagNumber.toUpperCase())
}

export function suggestAlternativeTagNumbers(
  desiredTag: string,
  existingTags: string[],
  count: number = 5
): string[] {
  const suggestions: string[] = []
  const parsed = parseTagNumber(desiredTag)
  
  // Generate variations with different numbers
  for (let i = 1; i <= count * 2; i++) {
    const newNumber = parsed.number + i
    const newTag = formatSequentialTag(parsed.prefix, newNumber)
    
    if (isTagNumberAvailable(newTag, existingTags) && suggestions.length < count) {
      suggestions.push(newTag)
    }
  }
  
  // If we don't have enough suggestions, try with different prefixes
  if (suggestions.length < count) {
    const alternativePrefixes = ['COW', 'ANIMAL', 'TAG']
    
    for (const prefix of alternativePrefixes) {
      if (prefix !== parsed.prefix.toUpperCase()) {
        const newTag = formatSequentialTag(prefix, parsed.number)
        if (isTagNumberAvailable(newTag, existingTags) && suggestions.length < count) {
          suggestions.push(newTag)
        }
      }
    }
  }
  
  return suggestions
}

export function convertTagFormat(
  tagNumber: string,
  newFormat: 'sequential' | 'barcode' | 'custom'
): string {
  const parsed = parseTagNumber(tagNumber)
  
  switch (newFormat) {
    case 'sequential':
      return formatSequentialTag(parsed.prefix, parsed.number)
    case 'barcode':
      return formatBarcodeTag(parsed.prefix, parsed.number, {
        type: 'code128',
        length: 6,
        includeCheckDigit: false,
        paddingZeros: true
      })
    case 'custom':
      return formatCustomTag(parsed.prefix, '{PREFIX}-{NUMBER}', parsed.number)
    default:
      return tagNumber
  }
}

export function generateQRData(animalId: string, tagNumber: string, farmId: string): string {
  // Generate QR code data that can be scanned to identify the animal
  const qrData = {
    animalId,
    tagNumber,
    farmId,
    timestamp: new Date().toISOString(),
    version: '1.0'
  }
  
  return JSON.stringify(qrData)
}

export function parseQRData(qrString: string): {
  animalId?: string
  tagNumber?: string
  farmId?: string
  timestamp?: string
  isValid: boolean
} {
  try {
    const data = JSON.parse(qrString)
    
    return {
      animalId: data.animalId,
      tagNumber: data.tagNumber,
      farmId: data.farmId,
      timestamp: data.timestamp,
      isValid: !!(data.animalId && data.tagNumber && data.farmId)
    }
  } catch (error) {
    return { isValid: false }
  }
}

export function validateCustomFormat(format: string): {
  isValid: boolean
  errors: string[]
  supportedPlaceholders: string[]
} {
  const errors: string[] = []
  const supportedPlaceholders = [
    '{PREFIX}', '{YEAR}', '{YEAR:2}', '{MONTH}', '{MONTH:1}', '{DAY}',
    '{BREED:1}', '{BREED:2}', '{BREED:3}', 
    '{LOCATION:1}', '{LOCATION:2}', '{LOCATION:3}',
    '{NUMBER}', '{NUMBER:1}', '{NUMBER:2}', '{NUMBER:3}', '{NUMBER:4}', '{NUMBER:5}', '{NUMBER:6}'
  ]
  
  // Check for unsupported placeholders
  const placeholderPattern = /\{[^}]+\}/g
  const foundPlaceholders = format.match(placeholderPattern) || []
  
  foundPlaceholders.forEach(placeholder => {
    if (!supportedPlaceholders.includes(placeholder) && !placeholder.match(/\{NUMBER:\d+\}/) && !placeholder.match(/\{BREED:\d+\}/) && !placeholder.match(/\{LOCATION:\d+\}/)) {
      errors.push(`Unsupported placeholder: ${placeholder}`)
    }
  })
  
  // Check if format contains at least a number placeholder
  if (!format.includes('{NUMBER')) {
    errors.push('Format must include a {NUMBER} or {NUMBER:digits} placeholder')
  }
  
  // Check format length
  if (format.length > 50) {
    errors.push('Format pattern is too long (max 50 characters)')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    supportedPlaceholders
  }
}

export function validateBarcodeFormat(
  type: string, 
  length: number, 
  prefix: string
): {
  isValid: boolean
  errors: string[]
  recommendations: string[]
} {
  const errors: string[] = []
  const recommendations: string[] = []
  
  switch (type) {
    case 'ean13':
      if (length !== 13) {
        errors.push('EAN-13 must be exactly 13 digits')
      }
      if (prefix.replace(/\D/g, '').length > 3) {
        errors.push('EAN-13 prefix should be 3 digits or less')
      }
      recommendations.push('Consider including check digit for better scan accuracy')
      break
      
    case 'upc':
      if (length !== 12) {
        errors.push('UPC-A must be exactly 12 digits')
      }
      if (prefix.replace(/\D/g, '').length > 2) {
        errors.push('UPC-A prefix should be 2 digits or less')
      }
      break
      
    case 'code128':
      if (length > 48) {
        errors.push('Code 128 should not exceed 48 characters')
      }
      recommendations.push('Code 128 is most versatile for mixed alphanumeric data')
      break
      
    case 'code39':
      if (length > 43) {
        errors.push('Code 39 should not exceed 43 characters')
      }
      if (/[^A-Z0-9\-\.\ \$\/\+\%]/.test(prefix)) {
        errors.push('Code 39 prefix contains unsupported characters')
      }
      break
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    recommendations
  }
}

export function generateFormatPreview(
  prefix: string,
  format: string,
  startNumber: number,
  count: number = 3
): string[] {
  const previews: string[] = []
  
  for (let i = 0; i < count; i++) {
    const tagNumber = formatCustomTag(prefix, format, startNumber + i, {
      breed: 'Holstein',
      location: 'A1'
    })
    previews.push(tagNumber)
  }
  
  return previews
}

export function generateBarcodePreview(
  prefix: string,
  type: string,
  length: number,
  includeCheckDigit: boolean,
  paddingZeros: boolean,
  count: number = 3
): string[] {
  const previews: string[] = []
  
  for (let i = 1; i <= count; i++) {
    const tagNumber = formatBarcodeTag(prefix, i, {
      type: type as any,
      length,
      includeCheckDigit,
      paddingZeros
    })
    previews.push(tagNumber)
  }
  
  return previews
}