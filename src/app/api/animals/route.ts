// app/api/animals/route.ts - Updated with auto tag generation
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createAnimal } from '@/lib/database/animals'
import { createHealthRecord } from '@/lib/database/health'
import { getTaggingSettings } from '@/lib/database/tagging-settings'
import { generateAnimalTagNumber } from '@/lib/utils/tag-generator'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] Animals POST request received')
    
    const user = await getCurrentUser()
    console.log('🔍 [API] Current user:', user?.email || 'No user')
    
    if (!user) {
      console.error('❌ [API] Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    console.log('🔍 [API] User role:', userRole)
    
    if (!userRole?.farm_id) {
      console.error('❌ [API] No farm associated with user')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const body = await request.json()
    console.log('🔍 [API] Request body:', body)
    
    const { farm_id, ...animalData } = body
    
    // Verify user owns the farm
    if (farm_id !== userRole.farm_id) {
      console.error('❌ [API] Forbidden - farm ID mismatch')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get tagging settings for the farm
    console.log('🔍 [API] Fetching tagging settings for farm:', farm_id)
    const taggingSettings = await getTaggingSettings(farm_id)
    console.log('🔍 [API] Tagging settings:', taggingSettings)

    // Auto-generate tag number if not provided or if user wants auto-generation
    let finalTagNumber = animalData.tag_number
    
    if (!finalTagNumber || animalData.autoGenerateTag) {
      console.log('🔍 [API] Auto-generating tag number...')
      
      try {
        finalTagNumber = await generateAnimalTagNumber(
          farm_id, 
          taggingSettings, 
          {
            animalSource: animalData.animal_source,
            animalData: animalData,
            customAttributes: animalData.customAttributes || []
          }
        )
        console.log('✅ [API] Generated tag number:', finalTagNumber)
      } catch (tagError) {
        console.error('❌ [API] Tag generation failed:', tagError)
        return NextResponse.json({ 
          error: 'Failed to generate tag number: ' + (tagError instanceof Error ? tagError.message : 'Unknown error')
        }, { status: 400 })
      }
    }

    // Validate the tag number
    if (!finalTagNumber || finalTagNumber.trim().length === 0) {
      return NextResponse.json({ error: 'Tag number is required' }, { status: 400 })
    }

    // Prepare final animal data with generated/provided tag number
    const finalAnimalData = {
      ...animalData,
      tag_number: finalTagNumber.trim()
    }
    
    console.log('🔍 [API] Creating animal with final data:', finalAnimalData)
    const result = await createAnimal(userRole.farm_id, finalAnimalData)
    console.log('🔍 [API] Create animal result:', result)
    
    if (!result.success) {
      console.error('❌ [API] Failed to create animal:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const createdAnimal = result.data
    let healthRecordCreated = false
    let healthRecord = null
    
    // Check if health status requires immediate health record
    const concerningStatuses = ['sick', 'requires_attention', 'quarantined']
    
    // In the health record creation section:
if (animalData.health_status && concerningStatuses.includes(animalData.health_status)) {
  console.log('🔍 [API] Health status requires health record:', animalData.health_status)
  
  // The trigger should handle inserting into animals_requiring_health_attention
  // Now create the health record
  const healthRecordData = {
    animal_id: createdAnimal.id,
    farm_id: userRole.farm_id,
    record_date: new Date().toISOString().split('T')[0],
    record_type: getRecordTypeFromHealthStatus(animalData.health_status),
    description: generateHealthDescription(animalData.health_status, createdAnimal),
    severity: getSeverityFromHealthStatus(animalData.health_status),
    notes: animalData.notes ? `Animal notes: ${animalData.notes}` : null,
    created_by: user.id,
    is_auto_generated: true,
    completion_status: 'pending',
    original_health_status: animalData.health_status,
    requires_record_type_selection: needsUserRecordTypeChoice(animalData.health_status),
    available_record_types: needsUserRecordTypeChoice(animalData.health_status) 
      ? getRecordTypeChoices(animalData.health_status) 
      : undefined
  }
  
  const healthResult = await createHealthRecord(healthRecordData)
  
  if (healthResult.success) {
    healthRecordCreated = true
    healthRecord = healthResult.data
    
    // Update the tracking record with the health record ID
    const supabase = await createServerSupabaseClient()
    await supabase
      .from('animals_requiring_health_attention')
      .update({
        health_record_id: healthRecord?.id || null,
        health_record_created: true
      })
      .eq('animal_id', createdAnimal.id)
      .eq('farm_id', userRole.farm_id)
      
    console.log('✅ [API] Created health record and updated tracking')
  }
}
    
    console.log('✅ [API] Animal created successfully with tag:', finalTagNumber)
    return NextResponse.json({ 
      success: true, 
      animal: createdAnimal,
      healthRecordCreated,
      healthRecord,
      requiresHealthDetails: healthRecordCreated,
      generatedTagNumber: finalTagNumber !== animalData.tag_number ? finalTagNumber : undefined,
      message: healthRecordCreated 
        ? `Animal added successfully with tag ${finalTagNumber}. Health record created - please add additional details.`
        : `Animal added successfully with tag ${finalTagNumber}`
    })
    
  } catch (error) {
    console.error('❌ [API] Animals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions remain the same
function getRecordTypeFromHealthStatus(healthStatus: string): "treatment" | "vaccination" | "checkup" | "injury" | "illness" {
  switch (healthStatus) {
    case 'sick':
      return 'illness'
    case 'requires_attention':
      return 'checkup'  // Changed from pending_selection
    case 'quarantined':
      return 'checkup'  // Changed from pending_selection
    default:
      return 'checkup'
  }
}

function getRecordTypeChoices(healthStatus: string): string[] {
  switch (healthStatus) {
    case 'requires_attention':
      return ['injury', 'checkup']
    case 'quarantined':
      return ['checkup', 'vaccination', 'illness', 'treatment']
    default:
      return []
  }
}

function needsUserRecordTypeChoice(healthStatus: string): boolean {
  return ['requires_attention', 'quarantined'].includes(healthStatus)
}

function getSeverityFromHealthStatus(healthStatus: string): 'low' | 'medium' | 'high' {
  switch (healthStatus) {
    case 'sick':
      return 'medium'
    case 'requires_attention':
      return 'low'
    case 'quarantined':
      return 'high'
    default:
      return 'low'
  }
}

function generateHealthDescription(healthStatus: string, animal: any): string {
  const animalName = animal.name || `Animal ${animal.tag_number}`
  
  switch (healthStatus) {
    case 'sick':
      return `${animalName} registered with sick status - requires medical evaluation`
    case 'requires_attention':
      return `${animalName} requires health attention - needs assessment`
    case 'quarantined':
      return `${animalName} placed in quarantine - potential health concern`
    default:
      return `Health status assessment needed for ${animalName}`
  }
}