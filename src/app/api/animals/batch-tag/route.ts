// app/api/animals/batch-tag/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { applyBatchTags, validateBatchTagOperation } from '@/lib/database/animal-tags'
import { getTaggingSettings } from '@/lib/database/tagging-settings'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { farmId, animalIds, tags, operation } = body

    // Validate required fields
    if (!farmId || !animalIds || !Array.isArray(animalIds) || animalIds.length === 0) {
      return NextResponse.json({ 
        error: 'Farm ID and animal IDs are required' 
      }, { status: 400 })
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ 
        error: 'Tags are required' 
      }, { status: 400 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check permissions
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get tagging settings to check if batch tagging is enabled
    const taggingSettings = await getTaggingSettings(farmId)
    if (!taggingSettings.enableBatchTagging) {
      return NextResponse.json({ 
        error: 'Batch tagging is not enabled for this farm' 
      }, { status: 400 })
    }

    // Validate the batch tag operation
    const validation = await validateBatchTagOperation(farmId, animalIds, tags, operation)
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid batch tag operation',
        details: validation.errors
      }, { status: 400 })
    }

    // Apply batch tags
    const result = await applyBatchTags({
      farmId,
      animalIds,
      tags,
      operation: operation || 'add', // 'add', 'remove', 'replace'
      appliedBy: user.id
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${operation || 'applied'} tags to ${result.affectedCount} animals`,
      affectedCount: result.affectedCount,
      tags: tags
    })

  } catch (error) {
    console.error('Error in batch tagging operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get available tags for the farm (from custom attributes and predefined tags)
    const taggingSettings = await getTaggingSettings(farmId)
    
    const availableTags = []

    // Add custom attributes as available tags
    if (taggingSettings.customAttributes) {
      taggingSettings.customAttributes.forEach(attr => {
        attr.values.forEach(value => {
          availableTags.push({
            type: 'custom_attribute',
            key: attr.name,
            value: value,
            category: 'Custom Attributes'
          })
        })
      })
    }

    // Add color coding tags
    if (taggingSettings.enableColorCoding && taggingSettings.colorCoding) {
      taggingSettings.colorCoding.forEach(color => {
        availableTags.push({
          type: 'color_code',
          key: 'status_color',
          value: color.value,
          display: color.name,
          color: color.color,
          category: 'Status Colors'
        })
      })
    }

    // Add predefined status tags
    const statusTags = [
      { type: 'status', key: 'health_status', value: 'healthy', display: 'Healthy', category: 'Health Status' },
      { type: 'status', key: 'health_status', value: 'sick', display: 'Sick', category: 'Health Status' },
      { type: 'status', key: 'health_status', value: 'observation', display: 'Under Observation', category: 'Health Status' },
      { type: 'status', key: 'production_status', value: 'lactating', display: 'Lactating', category: 'Production Status' },
      { type: 'status', key: 'production_status', value: 'dry', display: 'Dry', category: 'Production Status' },
      { type: 'status', key: 'production_status', value: 'pregnant', display: 'Pregnant', category: 'Production Status' }
    ]

    availableTags.push(...statusTags)

    return NextResponse.json({
      success: true,
      availableTags,
      batchTaggingEnabled: taggingSettings.enableBatchTagging
    })

  } catch (error) {
    console.error('Error fetching available tags:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}