/**
 * Animal Tag Attributes - Centralized definitions for tag auto-generation
 * Provides consistent, type-safe attribute definitions for newborn calves and purchased animals
 */

export interface CustomAttribute {
  name: string
  value: string
  placeholder?: string // Optional: for tag preview display
  searchable?: boolean // Optional: whether this attribute can be searched/filtered
  editable?: boolean // Optional: whether user can edit after tag generation
}

export interface AnimalTagGenerationContext {
  breed?: string
  gender?: 'male' | 'female'
  source: 'newborn' | 'purchased'
  productionStatus?: string
  birthDate?: string
  purchaseDate?: string
  motherInfo?: {
    id: string
    tagNumber: string
    name?: string
  }
  sellerInfo?: string
  healthStatus?: string
}

export interface SourceSpecificTagFormat {
  enabled: boolean
  prefix: string
  format: string
  startNumber: number
  description: string
}

export interface TagFormatSettings {
  useSourceSpecificFormats: boolean
  sourceSpecificFormats: {
    newborn: SourceSpecificTagFormat
    purchased: SourceSpecificTagFormat
  }
}

/**
 * Generate custom attributes for tag numbering
 * Provides consistent, context-aware attributes for both animal sources
 */
export function getCustomAttributesForTag(context: AnimalTagGenerationContext): CustomAttribute[] {
  const attributes: CustomAttribute[] = []

  // ─── COMMON ATTRIBUTES ───────────────────────────────────────────────────
  // Breed Group
  if (context.breed) {
    attributes.push({
      name: 'Breed',
      value: context.breed,
      placeholder: 'holstein',
      searchable: true,
      editable: false,
    })
  }

  // Gender
  if (context.gender) {
    attributes.push({
      name: 'Gender',
      value: context.gender === 'female' ? 'F' : 'M',
      placeholder: 'F/M',
      searchable: true,
      editable: false,
    })
  }

  // Production Status
  if (context.productionStatus) {
    attributes.push({
      name: 'Production Status',
      value: getProductionStatusCode(context.productionStatus),
      placeholder: 'CALF/HFR/LAC/DRY',
      searchable: true,
      editable: true,
    })
  }

  // Health Status
  if (context.healthStatus && context.healthStatus !== 'healthy') {
    attributes.push({
      name: 'Health Status',
      value: getHealthStatusCode(context.healthStatus),
      placeholder: 'HLT/SIK/ATN/QAR',
      searchable: true,
      editable: true,
    })
  }

  // ─── SOURCE-SPECIFIC ATTRIBUTES ──────────────────────────────────────────
  
  if (context.source === 'newborn') {
    // Source indicator
    attributes.push({
      name: 'Source',
      value: 'BRN',
      placeholder: 'BRN (Born)',
      searchable: true,
      editable: false,
    })

    // Mother information (if available)
    if (context.motherInfo) {
      attributes.push({
        name: 'Mother Tag',
        value: context.motherInfo.tagNumber,
        placeholder: 'MOTHER-TAG',
        searchable: true,
        editable: false,
      })

      if (context.motherInfo.name) {
        attributes.push({
          name: 'Mother',
          value: context.motherInfo.name.substring(0, 10),
          placeholder: 'MOTHER-NAME',
          searchable: true,
          editable: false,
        })
      }
    }

    // Birth cohort (year-month) for easy grouping
    if (context.birthDate) {
      const cohort = getBirthCohort(context.birthDate)
      attributes.push({
        name: 'Birth Cohort',
        value: cohort,
        placeholder: 'YYYY-MM',
        searchable: true,
        editable: false,
      })
    }
  }

  if (context.source === 'purchased') {
    // Source indicator
    attributes.push({
      name: 'Source',
      value: 'PUR',
      placeholder: 'PUR (Purchased)',
      searchable: true,
      editable: false,
    })

    // Seller information (if available)
    if (context.sellerInfo) {
      attributes.push({
        name: 'Seller',
        value: context.sellerInfo.substring(0, 8).toUpperCase(),
        placeholder: 'SELLER-CODE',
        searchable: true,
        editable: true,
      })
    }

    // Purchase cohort (year-month) for easy grouping
    if (context.purchaseDate) {
      const cohort = getPurchaseCohort(context.purchaseDate)
      attributes.push({
        name: 'Purchase Cohort',
        value: cohort,
        placeholder: 'YYYY-MM',
        searchable: true,
        editable: false,
      })
    }
  }

  return attributes
}

/**
 * Get a compact code for production status (useful for tag generation)
 */
export function getProductionStatusCode(status: string): string {
  const statusMap: Record<string, string> = {
    calf: 'CALF',
    heifer: 'HFR',
    served: 'SRV',
    lactating: 'LAC',
    steaming_dry_cows: 'DRY',
    open_culling_dry_cows: 'CUL',
    bull: 'BULL',
  }
  return statusMap[status] || status.substring(0, 4).toUpperCase()
}

/**
 * Get a compact code for health status (useful for tag generation)
 */
export function getHealthStatusCode(status: string): string {
  const statusMap: Record<string, string> = {
    healthy: 'HLT',
    sick: 'SIK',
    requires_attention: 'ATN',
    quarantined: 'QAR',
  }
  return statusMap[status] || status.substring(0, 3).toUpperCase()
}

/**
 * Get birth cohort (year-month) from a date string
 * Useful for grouping calves born in same month
 */
export function getBirthCohort(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month] = dateStr.split('-')
  return `${year}-${month}`
}

/**
 * Get purchase cohort (year-month) from a date string
 * Useful for grouping purchased animals in same month
 */
export function getPurchaseCohort(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month] = dateStr.split('-')
  return `${year}-${month}`
}

/**
 * Format attributes for display in tag preview
 * Example: "Holstein | F | CALF | BRN | 2026-01"
 */
export function formatAttributesForDisplay(attributes: CustomAttribute[]): string {
  return attributes.map((attr) => attr.value).join(' | ')
}

/**
 * Filter searchable attributes only
 */
export function getSearchableAttributes(attributes: CustomAttribute[]): CustomAttribute[] {
  return attributes.filter((attr) => attr.searchable !== false)
}

/**
 * Filter editable attributes only
 */
export function getEditableAttributes(attributes: CustomAttribute[]): CustomAttribute[] {
  return attributes.filter((attr) => attr.editable === true)
}

/**
 * Create attribute summary for quick reference
 * Example: { breed: 'Holstein', gender: 'F', source: 'BRN' }
 */
export function createAttributeSummary(attributes: CustomAttribute[]): Record<string, string> {
  return attributes.reduce(
    (acc, attr) => ({
      ...acc,
      [attr.name.toLowerCase().replace(/\s+/g, '_')]: attr.value,
    }),
    {}
  )
}

/**
 * Get the appropriate tag format for a given animal source
 * Considers source-specific settings if enabled
 */
export function getTagFormatForSource(
  source: 'newborn' | 'purchased',
  formatSettings?: TagFormatSettings
): { format: string; prefix: string; startNumber: number } {
  // If source-specific formats are enabled and available
  if (formatSettings?.useSourceSpecificFormats && formatSettings?.sourceSpecificFormats) {
    const sourceConfig = formatSettings.sourceSpecificFormats[source]
    if (sourceConfig && sourceConfig.enabled) {
      return {
        format: sourceConfig.format,
        prefix: sourceConfig.prefix,
        startNumber: sourceConfig.startNumber,
      }
    }
  }

  // Fall back to defaults based on source
  if (source === 'newborn') {
    return {
      format: '{PREFIX}-{YEAR}-{COHORT:2}-{NUMBER:3}',
      prefix: 'CALF',
      startNumber: 1,
    }
  } else {
    // purchased
    return {
      format: '{PREFIX}-{BREED:2}-{GENDER}-{NUMBER:3}',
      prefix: 'PUR',
      startNumber: 1,
    }
  }
}

/**
 * Get description for source-specific format
 */
export function getSourceFormatDescription(
  source: 'newborn' | 'purchased',
  formatSettings?: TagFormatSettings
): string {
  if (formatSettings?.useSourceSpecificFormats && formatSettings?.sourceSpecificFormats) {
    const sourceConfig = formatSettings.sourceSpecificFormats[source]
    if (sourceConfig) {
      return sourceConfig.description
    }
  }

  return source === 'newborn'
    ? 'Format for newborn calves'
    : 'Format for purchased animals'
}

