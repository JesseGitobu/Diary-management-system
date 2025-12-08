// lib/database/animal-tags.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface AnimalTag {
  id: string
  animalId: string
  tagType: 'custom_attribute' | 'color_code' | 'status' | 'system'
  tagKey: string
  tagValue: string
  appliedAt: string
  appliedBy: string
}

export interface BatchTagOperation {
  farmId: string
  animalIds: string[]
  tags: Array<{
    type: string
    key: string
    value: string
    display?: string
  }>
  operation: 'add' | 'remove' | 'replace'
  appliedBy: string
}

export async function getAnimalTags(animalId: string): Promise<AnimalTag[]> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('animal_tags')
      .select('*')
      .eq('animal_id', animalId)
      .order('applied_at', { ascending: false })

    if (error) {
      console.error('Error fetching animal tags:', error)
      return []
    }

    // FIXED: Safe cast to any[] to handle potential nulls and bypass 'never' type
    return ((data || []) as any[]).map(tag => ({
      id: tag.id,
      animalId: tag.animal_id,
      tagType: tag.tag_type as 'custom_attribute' | 'color_code' | 'status' | 'system',
      tagKey: tag.tag_key,
      tagValue: tag.tag_value,
      appliedAt: tag.applied_at ?? new Date().toISOString(),
      appliedBy: tag.applied_by ?? 'system'
    }))

  } catch (error) {
    console.error('Error in getAnimalTags:', error)
    return []
  }
}

export async function addTagToAnimal(
  animalId: string, 
  tag: {
    type: string
    key: string
    value: string
  },
  appliedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    // FIXED: Cast to any to bypass strict type checks on insert
    const { error } = await (supabase
      .from('animal_tags') as any)
      .insert({
        animal_id: animalId,
        tag_type: tag.type,
        tag_key: tag.key,
        tag_value: tag.value,
        applied_by: appliedBy,
        applied_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error adding tag to animal:', error)
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    console.error('Error in addTagToAnimal:', error)
    return { success: false, error: 'Failed to add tag' }
  }
}

export async function removeTagFromAnimal(
  animalId: string,
  tagType: string,
  tagKey: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    // FIXED: Cast to any to bypass strict type checks on delete
    const { error } = await (supabase
      .from('animal_tags') as any)
      .delete()
      .eq('animal_id', animalId)
      .eq('tag_type', tagType)
      .eq('tag_key', tagKey)

    if (error) {
      console.error('Error removing tag from animal:', error)
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    console.error('Error in removeTagFromAnimal:', error)
    return { success: false, error: 'Failed to remove tag' }
  }
}

export async function applyBatchTags(operation: BatchTagOperation): Promise<{
  success: boolean
  error?: string
  affectedCount?: number
}> {
  const supabase = await createServerSupabaseClient()

  try {
    let affectedCount = 0

    for (const animalId of operation.animalIds) {
      if (operation.operation === 'replace') {
        // Remove all existing tags first
        // FIXED: Cast to any
        await (supabase
          .from('animal_tags') as any)
          .delete()
          .eq('animal_id', animalId)
      }

      if (operation.operation === 'add' || operation.operation === 'replace') {
        // Add new tags
        const tagsToInsert = operation.tags.map(tag => ({
          animal_id: animalId,
          tag_type: tag.type,
          tag_key: tag.key,
          tag_value: tag.value,
          applied_by: operation.appliedBy,
          applied_at: new Date().toISOString()
        }))

        // FIXED: Cast to any for upsert
        const { error: insertError } = await (supabase
          .from('animal_tags') as any)
          .upsert(tagsToInsert)

        if (insertError) {
          console.error('Error inserting tags:', insertError)
          continue
        }
      } else if (operation.operation === 'remove') {
        // Remove specific tags
        for (const tag of operation.tags) {
          // FIXED: Cast to any for delete
          await (supabase
            .from('animal_tags') as any)
            .delete()
            .eq('animal_id', animalId)
            .eq('tag_type', tag.type)
            .eq('tag_key', tag.key)
        }
      }

      affectedCount++
    }

    return { success: true, affectedCount }

  } catch (error) {
    console.error('Error in batch tag operation:', error)
    return { success: false, error: 'Failed to apply batch tags' }
  }
}

export async function validateBatchTagOperation(
  farmId: string,
  animalIds: string[],
  tags: Array<{ type: string; key: string; value: string }>,
  operation?: string
): Promise<{ isValid: boolean; errors: string[] }> {
  const supabase = await createServerSupabaseClient()
  const errors: string[] = []

  try {
    // Verify all animals belong to the farm
    const { data: animals, error } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .in('id', animalIds)

    if (error) {
      errors.push('Failed to validate animal ownership')
    } else if ((animals || []).length !== animalIds.length) {
      errors.push('Some animals do not belong to this farm')
    }

    // Validate tags
    if (!tags || tags.length === 0) {
      errors.push('At least one tag is required')
    }

    tags.forEach((tag, index) => {
      if (!tag.type || !tag.key || !tag.value) {
        errors.push(`Tag ${index + 1}: Type, key, and value are required`)
      }

      if (tag.type === 'custom_attribute') {
        // Could add validation for custom attributes here
      }
    })

    // Validate operation
    if (operation && !['add', 'remove', 'replace'].includes(operation)) {
      errors.push('Invalid operation. Must be add, remove, or replace')
    }

    return {
      isValid: errors.length === 0,
      errors
    }

  } catch (error) {
    console.error('Error validating batch tag operation:', error)
    return {
      isValid: false,
      errors: ['Failed to validate operation']
    }
  }
}

export async function searchAnimalsByTags(
  farmId: string,
  tagFilters: Array<{ type: string; key: string; value: string }>
): Promise<string[]> {
  const supabase = await createServerSupabaseClient()

  try {
    // First get the animal IDs from the farm
    const { data: farmAnimals, error: farmError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (farmError || !farmAnimals) {
      console.error('Error getting farm animals:', farmError)
      return []
    }

    // FIXED: Cast farmAnimals to any[] to bypass 'never' type error
    const farmAnimalIds = (farmAnimals as any[]).map(animal => animal.id)

    // Build query to find animals with matching tags
    let query = supabase
      .from('animal_tags')
      .select('animal_id')
      .in('animal_id', farmAnimalIds)

    // Apply tag filters
    if (tagFilters.length > 0) {
      const orConditions = tagFilters.map(filter => 
        `and(tag_type.eq.${filter.type},tag_key.eq.${filter.key},tag_value.eq.${filter.value})`
      ).join(',')
      
      query = query.or(orConditions)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error searching animals by tags:', error)
      return []
    }

    // FIXED: Cast data to any[] to handle potential 'never' type
    const animalIds = [...new Set(((data || []) as any[]).map(item => item.animal_id))]
    return animalIds

  } catch (error) {
    console.error('Error in searchAnimalsByTags:', error)
    return []
  }
}

export async function getTagStatistics(farmId: string): Promise<{
  totalTaggedAnimals: number
  tagsByType: Record<string, number>
  mostUsedTags: Array<{ key: string; value: string; count: number }>
}> {
  const supabase = await createServerSupabaseClient()

  try {
    // First get the animal IDs from the farm
    const { data: farmAnimals, error: farmError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (farmError || !farmAnimals) {
      console.error('Error getting farm animals:', farmError)
      return { totalTaggedAnimals: 0, tagsByType: {}, mostUsedTags: [] }
    }

    // FIXED: Cast farmAnimals to any[] here as well
    const farmAnimalIds = (farmAnimals as any[]).map(animal => animal.id)

    // Get all tags for the farm's animals
    const { data: tags, error: tagsError } = await supabase
      .from('animal_tags')
      .select('tag_type, tag_key, tag_value, animal_id')
      .in('animal_id', farmAnimalIds)

    if (tagsError || !tags) {
      console.error('Error getting animal tags:', tagsError)
      return { totalTaggedAnimals: 0, tagsByType: {}, mostUsedTags: [] }
    }

    // FIXED: Cast tags to any[] to safely access properties
    const safeTags = (tags || []) as any[]

    // Calculate statistics
    const uniqueAnimals = new Set(safeTags.map(tag => tag.animal_id))
    const totalTaggedAnimals = uniqueAnimals.size

    const tagsByType: Record<string, number> = {}
    const tagCounts: Record<string, number> = {}

    safeTags.forEach(tag => {
      // Count by type
      tagsByType[tag.tag_type] = (tagsByType[tag.tag_type] || 0) + 1

      // Count individual tags
      const tagIdentifier = `${tag.tag_key}:${tag.tag_value}`
      tagCounts[tagIdentifier] = (tagCounts[tagIdentifier] || 0) + 1
    })

    // Get most used tags
    const mostUsedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => {
        const [key, value] = tag.split(':')
        return { key, value, count }
      })

    return {
      totalTaggedAnimals,
      tagsByType,
      mostUsedTags
    }

  } catch (error) {
    console.error('Error getting tag statistics:', error)
    return { totalTaggedAnimals: 0, tagsByType: {}, mostUsedTags: [] }
  }
}