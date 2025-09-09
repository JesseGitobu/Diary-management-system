// lib/database/scheduledFeedings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ScheduledFeeding {
    id: string
    farm_id: string
    animal_id?: string
    feed_type_id: string
    quantity_kg: number
    scheduled_time: string
    feeding_mode: 'individual' | 'batch'
    animal_count: number
    consumption_batch_id?: string
    notes?: string
    created_by: string
    status: 'pending' | 'completed' | 'cancelled' | 'overdue'
    completed_at?: string
    completed_by?: string
    late_by_minutes?: number
    late_reason?: string
    created_at: string
    updated_at: string
}

// Create a scheduled feeding
export async function createScheduledFeeding(
    data: any,
    userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    const supabase = await createServerSupabaseClient()

    try {
        const scheduledFeedings = []

        for (const entry of data.entries) {
            // Create the scheduled feeding record
            const scheduledFeedingData = {
                farm_id: data.farmId,
                feed_type_id: entry.feedTypeId,
                quantity_kg: parseFloat(entry.quantityKg.toString()),
                scheduled_time: new Date(data.feedingTime).toISOString(),
                feeding_mode: data.mode,
                animal_count: data.mode === 'batch' ? entry.animalCount : (entry.animalIds?.length || 1),
                consumption_batch_id: entry.batchId || data.batchId || null,
                notes: entry.notes || data.globalNotes || null,
                created_by: userId,
                status: 'pending',
                animal_id: entry.animalIds?.[0] || null
            }

            const { data: scheduledFeeding, error: scheduledError } = await supabase
                .from('scheduled_feedings')
                .insert(scheduledFeedingData)
                .select()
                .single()

            if (scheduledError) {
                console.error('Scheduled feeding insert error:', scheduledError)
                return {
                    success: false,
                    error: `Failed to create scheduled feeding: ${scheduledError.message}`
                }
            }

            // Link animals to the scheduled feeding
            if (entry.animalIds && entry.animalIds.length > 0) {
                const animalRecords = entry.animalIds.map((animalId: string) => ({
                    scheduled_feeding_id: scheduledFeeding.id,
                    animal_id: animalId
                }))

                const { error: animalError } = await supabase
                    .from('scheduled_feeding_animals')
                    .insert(animalRecords)

                if (animalError) {
                    console.error('Scheduled feeding animals insert error:', animalError)
                    // Continue but log warning
                }
            }

            scheduledFeedings.push(scheduledFeeding)
        }

        return { success: true, data: scheduledFeedings }
    } catch (error) {
        console.error('Error creating scheduled feeding:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create scheduled feeding'
        }
    }
}

// Get scheduled feedings for an animal
export async function getAnimalScheduledFeedings(
    farmId: string,
    animalId: string,
    status?: string
): Promise<ScheduledFeeding[]> {
    const supabase = await createServerSupabaseClient()

    try {
        let query = supabase
            .from('scheduled_feedings')
            .select(`
        *,
        feed_types (
          name,
          category_id
        ),
        consumption_batches (
          batch_name
        ),
        scheduled_feeding_animals!inner (
          animal_id
        )
      `)
            .eq('farm_id', farmId)
            .eq('scheduled_feeding_animals.animal_id', animalId)
            .order('scheduled_time', { ascending: true })

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching scheduled feedings:', error)
            return []
        }

        return (data as ScheduledFeeding[]) || []
    } catch (error) {
        console.error('Error in getAnimalScheduledFeedings:', error)
        return []
    }
}

// Complete a scheduled feeding (convert to actual feeding record)
export async function completeScheduledFeeding(
  scheduledFeedingId: string,
  userId: string,
  actualFeedingTime?: string,
  lateReason?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    // Get the scheduled feeding details
    const { data: scheduledFeeding, error: fetchError } = await supabase
      .from('scheduled_feedings')
      .select(`
        *,
        scheduled_feeding_animals (
          animal_id
        )
      `)
      .eq('id', scheduledFeedingId)
      .single()

    if (fetchError || !scheduledFeeding) {
      return { success: false, error: 'Scheduled feeding not found' }
    }

    if (scheduledFeeding.status !== 'pending' && scheduledFeeding.status !== 'overdue') {
      return { success: false, error: 'Scheduled feeding is not pending or overdue' }
    }

    const now = new Date()
    const scheduledTime = new Date(scheduledFeeding.scheduled_time)
    
    // Use provided actual feeding time or current time if not specified
    const actualCompletionTime = actualFeedingTime ? new Date(actualFeedingTime) : now
    
    // Validate actual feeding time is not in the future
    if (actualCompletionTime > now) {
      return { success: false, error: 'Actual feeding time cannot be in the future' }
    }

    // Calculate lateness based on actual feeding time vs scheduled time
    const lateByMinutes = Math.max(0, Math.floor((actualCompletionTime.getTime() - scheduledTime.getTime()) / (1000 * 60)))
    const wasActuallyLate = lateByMinutes > 0

    // If feeding was actually late but no reason provided, require reason
    if (wasActuallyLate && !lateReason?.trim()) {
      return { success: false, error: 'Late reason is required for feedings completed after scheduled time' }
    }

    // Prepare notes with timing information
    let completionNotes = scheduledFeeding.notes || ''
    
    if (wasActuallyLate) {
      const lateInfo = `Actually fed ${lateByMinutes} minutes late`
      const reasonInfo = lateReason ? ` - Reason: ${lateReason}` : ''
      completionNotes += completionNotes ? `\n${lateInfo}${reasonInfo}` : `${lateInfo}${reasonInfo}`
    } else {
      // Check if this is a late recording of an on-time feeding
      const recordingDelay = Math.floor((now.getTime() - actualCompletionTime.getTime()) / (1000 * 60))
      if (recordingDelay > 30) {
        completionNotes += completionNotes 
          ? `\nFed on time, recorded ${recordingDelay} minutes later` 
          : `Fed on time, recorded ${recordingDelay} minutes later`
      } else {
        completionNotes += completionNotes ? '\nCompleted on time' : 'Completed on time'
      }
    }

    // Create the actual feeding record using the actual feeding time
    const feedingData = {
      farm_id: scheduledFeeding.farm_id,
      feed_type_id: scheduledFeeding.feed_type_id,
      quantity_kg: scheduledFeeding.quantity_kg,
      feeding_time: actualCompletionTime.toISOString(), // Use actual feeding time
      feeding_mode: scheduledFeeding.feeding_mode,
      animal_count: scheduledFeeding.animal_count,
      consumption_batch_id: scheduledFeeding.consumption_batch_id,
      notes: completionNotes,
      recorded_by: actualFeedingTime 
        ? 'System (from schedule - actual time specified)' 
        : 'System (from schedule)',
      created_by: userId
    }

    const { data: feedingRecord, error: feedingError } = await supabase
      .from('feed_consumption')
      .insert(feedingData)
      .select()
      .single()

    if (feedingError) {
      console.error('Error creating feeding record:', feedingError)
      return { success: false, error: `Failed to create feeding record: ${feedingError.message}` }
    }

    // Link animals to the feeding record
    if (scheduledFeeding.scheduled_feeding_animals && scheduledFeeding.scheduled_feeding_animals.length > 0) {
      const animalRecords = scheduledFeeding.scheduled_feeding_animals.map((sa: any) => ({
        consumption_id: feedingRecord.id,
        animal_id: sa.animal_id
      }))

      const { error: animalLinkError } = await supabase
        .from('feed_consumption_animals')
        .insert(animalRecords)

      if (animalLinkError) {
        console.warn('Warning: Could not link animals to consumption record:', animalLinkError)
        // Continue execution - this is not critical
      }
    }

    // Update the scheduled feeding status with enhanced tracking
    const { error: updateError } = await supabase
      .from('scheduled_feedings')
      .update({
        status: 'completed',
        completed_at: now.toISOString(), // When it was recorded as complete
        completed_by: userId,
        late_by_minutes: wasActuallyLate ? lateByMinutes : null,
        late_reason: wasActuallyLate && lateReason ? lateReason : null,
        updated_at: now.toISOString(),
        // Add new fields to track the difference between actual and recorded time
        actual_feeding_time: actualCompletionTime.toISOString(),
        recording_delay_minutes: Math.floor((now.getTime() - actualCompletionTime.getTime()) / (1000 * 60))
      })
      .eq('id', scheduledFeedingId)

    if (updateError) {
      console.error('Error updating scheduled feeding:', updateError)
      // This is not critical, continue
    }

    // Update inventory
    try {
      await updateFeedInventory(scheduledFeeding.farm_id, scheduledFeeding.feed_type_id, -scheduledFeeding.quantity_kg)
    } catch (inventoryError) {
      console.warn('Warning: Could not update inventory:', inventoryError)
      // Continue - inventory update failure shouldn't fail the whole operation
    }

    return {
      success: true,
      data: {
        feedingRecord,
        lateByMinutes: wasActuallyLate ? lateByMinutes : 0,
        wasLate: wasActuallyLate,
        wasRecordedLate: now.getTime() - actualCompletionTime.getTime() > 30 * 60 * 1000, // More than 30 min delay
        lateReason: wasActuallyLate ? lateReason : null,
        actualFeedingTime: actualCompletionTime.toISOString(),
        recordedAt: now.toISOString()
      }
    }
  } catch (error) {
    console.error('Error completing scheduled feeding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete scheduled feeding'
    }
  }
}

// Cancel a scheduled feeding
export async function cancelScheduledFeeding(
    scheduledFeedingId: string,
    userId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerSupabaseClient()

    try {
        const { error } = await supabase
            .from('scheduled_feedings')
            .update({
                status: 'cancelled',
                notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', scheduledFeedingId)

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error('Error cancelling scheduled feeding:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to cancel scheduled feeding'
        }
    }
}

// Update overdue scheduled feedings
export async function updateOverdueScheduledFeedings(farmId: string): Promise<void> {
    const supabase = await createServerSupabaseClient()

    try {
        const now = new Date()

        // Mark feedings as overdue if they're 30 minutes past scheduled time and still pending
        await supabase
            .from('scheduled_feedings')
            .update({
                status: 'overdue',
                updated_at: now.toISOString()
            })
            .eq('farm_id', farmId)
            .eq('status', 'pending')
            .lt('scheduled_time', new Date(now.getTime() - 30 * 60 * 1000).toISOString())

    } catch (error) {
        console.error('Error updating overdue scheduled feedings:', error)
    }
}

// Helper function to update inventory (simplified version)
async function updateFeedInventory(farmId: string, feedTypeId: string, quantityChange: number): Promise<void> {
    const supabase = await createServerSupabaseClient()

    try {
        if (quantityChange >= 0) return // Only handle deductions

        const { data: inventoryItems } = await supabase
            .from('feed_inventory')
            .select('id, quantity_kg')
            .eq('farm_id', farmId)
            .eq('feed_type_id', feedTypeId)
            .gt('quantity_kg', 0)
            .order('expiry_date', { ascending: true })

        if (!inventoryItems || inventoryItems.length === 0) return

        let remainingToDeduct = Math.abs(quantityChange)

        for (const item of inventoryItems) {
            if (remainingToDeduct <= 0) break

            const deductFromThisItem = Math.min(remainingToDeduct, item.quantity_kg)
            const newQuantity = item.quantity_kg - deductFromThisItem

            await supabase
                .from('feed_inventory')
                .update({ quantity_kg: newQuantity })
                .eq('id', item.id)

            remainingToDeduct -= deductFromThisItem
        }
    } catch (error) {
        console.error('Error updating feed inventory:', error)
    }
}

export async function deleteScheduledFeeding(
  scheduledFeedingId: string,
  farmId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    // First verify the scheduled feeding exists and belongs to the farm
    const { data: scheduledFeeding, error: fetchError } = await supabase
      .from('scheduled_feedings')
      .select('id, status, farm_id, feed_type_id, quantity_kg')
      .eq('id', scheduledFeedingId)
      .eq('farm_id', farmId)
      .single()

    if (fetchError || !scheduledFeeding) {
      return { success: false, error: 'Scheduled feeding not found or access denied' }
    }

    // Don't allow deletion of completed feedings
    if (scheduledFeeding.status === 'completed') {
      return { success: false, error: 'Cannot delete completed scheduled feedings' }
    }

    // Delete associated animal records first (foreign key constraint)
    const { error: deleteAnimalsError } = await supabase
      .from('scheduled_feeding_animals')
      .delete()
      .eq('scheduled_feeding_id', scheduledFeedingId)

    if (deleteAnimalsError) {
      console.error('Error deleting scheduled feeding animals:', deleteAnimalsError)
      // Continue with deletion even if this fails
    }

    // Delete the scheduled feeding record
    const { error: deleteError } = await supabase
      .from('scheduled_feedings')
      .delete()
      .eq('id', scheduledFeedingId)
      .eq('farm_id', farmId)

    if (deleteError) {
      console.error('Error deleting scheduled feeding:', deleteError)
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteScheduledFeeding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete scheduled feeding'
    }
  }
}