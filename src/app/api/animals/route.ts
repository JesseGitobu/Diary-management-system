// app/api/animals/route.ts - Updated with auto tag generation
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createAnimal } from '@/lib/database/animals'
import { createHealthRecord } from '@/lib/database/health'
import { getTaggingSettings } from '@/lib/database/tagging-settings'
import { generateAnimalTagNumber } from '@/lib/utils/tag-generator'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] Animals POST request received')
    
    const user = await getCurrentUser()
    if (!user) {
      console.error('❌ [API] Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id) {
      console.error('❌ [API] No farm associated with user')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const body = await request.json()
    console.log('🔍 [API] Request body received:', {
      ...body,
      tag_number: body.tag_number,
      autoGenerateTag: body.autoGenerateTag,
      animal_source: body.animal_source
    })
    
    const { farm_id, ...animalData } = body
    
    // Verify user owns the farm
    if (farm_id !== userRole.farm_id) {
      console.error('❌ [API] Forbidden - farm ID mismatch')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get tagging settings for the farm
    console.log('🔍 [API] Fetching tagging settings for farm:', farm_id)
    const taggingSettings = await getTaggingSettings(farm_id)

    // Auto-generate tag number if requested or if no tag provided
    let finalTagNumber = animalData.tag_number?.trim()
    
    if (!finalTagNumber || animalData.autoGenerateTag) {
      console.log('🔍 [API] Auto-generating tag number...', { 
        hasExistingTag: !!finalTagNumber,
        autoGenerateRequested: animalData.autoGenerateTag
      })
      
      try {
        const generationContext = {
          animalSource: animalData.animal_source || 'purchased_animal',
          animalData: {
            breed: animalData.breed,
            gender: animalData.gender,
            production_status: animalData.production_status,
            health_status: animalData.health_status,
            purchase_date: animalData.purchase_date,
            seller_info: animalData.seller_info
          },
          customAttributes: animalData.customAttributes || []
        }
        
        console.log('🔍 [API] Generation context:', generationContext)
        
        finalTagNumber = await generateAnimalTagNumber(
          farm_id, 
          taggingSettings, 
          generationContext
        )
        console.log('✅ [API] Generated tag number:', finalTagNumber)
      } catch (tagError) {
        console.error('❌ [API] Tag generation failed:', tagError)
        return NextResponse.json({ 
          error: 'Failed to generate tag number: ' + (tagError instanceof Error ? tagError.message : 'Unknown error')
        }, { status: 400 })
      }
    }

    // Validate the final tag number
    if (!finalTagNumber || finalTagNumber.trim().length === 0) {
      console.error('❌ [API] No valid tag number after generation/validation')
      return NextResponse.json({ error: 'Tag number is required' }, { status: 400 })
    }

    console.log('🔍 [API] Using final tag number:', finalTagNumber)

    // Prepare final animal data
    const finalAnimalData = {
      ...animalData,
      tag_number: finalTagNumber.trim()
    }
    
    // Remove the autoGenerateTag flag as it's not needed in database
    delete finalAnimalData.autoGenerateTag
    delete finalAnimalData.customAttributes
    
    console.log('🔍 [API] Final animal data for database:', finalAnimalData)
    
    const result = await createAnimal(userRole.farm_id, finalAnimalData)
    console.log('🔍 [API] Database result:', result)
    
    if (!result.success) {
      console.error('❌ [API] Failed to create animal:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const createdAnimal = result.data
    
    // Handle health record creation if needed...
    // (existing health record logic remains the same)
    
    console.log('✅ [API] Animal created successfully with tag:', finalTagNumber)
    return NextResponse.json({ 
      success: true, 
      animal: createdAnimal,
      generatedTagNumber: finalTagNumber !== animalData.tag_number ? finalTagNumber : undefined,
      message: `Animal added successfully with tag ${finalTagNumber}`
    })
    
  } catch (error) {
    console.error('❌ [API] Animals API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

// Helper functions remain the same
function getRecordTypeFromHealthStatus(healthStatus: string): "treatment" | "vaccination" | "checkup" | "injury" | "illness" {
  switch (healthStatus) {
    case 'sick':
      return 'illness'
    case 'requires_attention':
      return 'checkup'
    case 'quarantined':
      return 'illness'
    default:
      return 'checkup'
  }
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