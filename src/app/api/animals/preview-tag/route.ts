// app/api/animals/preview-tag/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getTaggingSettings } from '@/lib/database/tagging-settings'
import { previewTagGeneration } from '@/lib/utils/tag-generator'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const body = await request.json()
    const { farmId, animalData, customAttributes } = body

    // Verify user owns the farm
    if (farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get tagging settings
    const taggingSettings = await getTaggingSettings(farmId)

    // Create generation context from animal data and custom attributes
    const context = {
      animalSource: animalData.animal_source || 'newborn_calf',
      animalData: {
        breed: animalData.breed,
        gender: animalData.gender,
        mother_id: animalData.mother_id,
        birth_date: animalData.birth_date,
        production_status: animalData.production_status,
        health_status: animalData.health_status,
        purchase_date: animalData.purchase_date,
        seller_info: animalData.seller_info
      },
      customAttributes: customAttributes || []
    }

    // Generate preview tag using the enhanced preview function
    const previewTag = previewTagGeneration(
      taggingSettings,
      context,
      taggingSettings.nextNumber
    )

    // Create additional preview examples
    const examples = []
    for (let i = 0; i < 3; i++) {
      examples.push(previewTagGeneration(
        taggingSettings,
        context,
        taggingSettings.nextNumber + i
      ))
    }

    return NextResponse.json({
      success: true,
      previewTag,
      examples,
      settings: {
        method: taggingSettings.method,
        numberingSystem: taggingSettings.numberingSystem,
        tagPrefix: taggingSettings.tagPrefix,
        customFormat: taggingSettings.customFormat,
        nextNumber: taggingSettings.nextNumber
      },
      context: {
        animalSource: context.animalSource,
        breed: context.animalData.breed,
        gender: context.animalData.gender,
        customAttributes: context.customAttributes
      }
    })

  } catch (error) {
    console.error('Error generating tag preview:', error)
    return NextResponse.json({ 
      error: 'Failed to generate tag preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Optional: Add a GET endpoint to fetch current tagging settings
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId || farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Invalid farm ID' }, { status: 403 })
    }

    const taggingSettings = await getTaggingSettings(farmId)

    return NextResponse.json({
      success: true,
      settings: {
        method: taggingSettings.method,
        numberingSystem: taggingSettings.numberingSystem,
        tagPrefix: taggingSettings.tagPrefix,
        customFormat: taggingSettings.customFormat,
        nextNumber: taggingSettings.nextNumber,
        enableAutoGeneration: true
      }
    })

  } catch (error) {
    console.error('Error fetching tagging settings:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch tagging settings'
    }, { status: 500 })
  }
}