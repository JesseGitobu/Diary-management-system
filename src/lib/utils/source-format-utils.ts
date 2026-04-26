/**
 * Pure utility functions for handling source-specific tag formats.
 * This file contains no server-side code and is safe to import in client components.
 */

/**
 * Normalizes source-specific formats from array to object keyed by sourceKey.
 * Handles both array format (from database) and object format (from component).
 * 
 * @param formats - Source formats as array or object
 * @returns Normalized object with sourceKey as keys
 */
export function normalizeSourceSpecificFormats(formats: any): Record<string, any> {
  if (!formats) {
    return {}
  }

  // If already an object, return as-is
  if (!Array.isArray(formats)) {
    return formats
  }

  // Convert array to object keyed by sourceKey
  const result: Record<string, any> = {}
  formats.forEach((format: any) => {
    if (format.sourceKey) {
      result[format.sourceKey] = {
        ...format,
        format: format.formatPattern || format.format  // Support both field names
      }
    }
  })

  return result
}

/**
 * Gets the source-specific format for a given animal source.
 * Safely handles both array and object format structures.
 * 
 * @param formats - Source formats (array or object)
 * @param sourceKey - The source key to look up ('newborn' or 'purchased')
 * @returns The format object or undefined
 */
export function getSourceFormat(formats: any, sourceKey: string): any {
  if (!formats) {
    return undefined
  }

  const normalized = normalizeSourceSpecificFormats(formats)
  return normalized[sourceKey]
}

/**
 * Checks if a source-specific format is enabled.
 * 
 * @param formats - Source formats (array or object)
 * @param sourceKey - The source key to check
 * @returns true if format exists and is enabled, false otherwise
 */
export function isSourceFormatEnabled(formats: any, sourceKey: string): boolean {
  const format = getSourceFormat(formats, sourceKey)
  return !!(format && format.enabled)
}
