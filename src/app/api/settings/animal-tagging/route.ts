// app/api/settings/animal-tagging/route.ts - Improved version
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getTaggingSettings, updateTaggingSettings, validateTaggingSettings } from '@/lib/database/tagging-settings'

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

    const userRole = await getUserRole(user.id)
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only farm_owner and farm_manager can access settings
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const settings = await getTaggingSettings(farmId)

    return NextResponse.json({ 
      success: true, 
      settings 
    })

  } catch (error) {
    console.error('Error fetching tagging settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Starting tagging settings update...')
    
    const user = await getCurrentUser()
    if (!user) {
      console.log('❌ No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { farmId, settings } = body

    console.log('📝 Request data:', { farmId, settingsKeys: Object.keys(settings || {}) })

    if (!farmId || !settings) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Farm ID and settings are required' }, { status: 400 })
    }

    const userRole = await getUserRole(user.id)
    if (!userRole || userRole.farm_id !== farmId) {
      console.log('❌ Access denied for user:', user.id, 'farm:', farmId)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only farm_owner and farm_manager can update settings
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      console.log('❌ Insufficient permissions for role:', userRole.role_type)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    console.log('✅ Authorization passed for user:', user.id, 'role:', userRole.role_type)

    // Validate settings
    const validationResult = validateTaggingSettings(settings)
    if (!validationResult.isValid) {
      console.log('❌ Settings validation failed:', validationResult.errors)
      return NextResponse.json({ 
        error: 'Invalid settings', 
        details: validationResult.errors 
      }, { status: 400 })
    }

    console.log('✅ Settings validation passed')

    // Update settings with detailed error handling
    const result = await updateTaggingSettings(farmId, settings, user.id)
    
    if (!result.success) {
      console.error('❌ Database update failed:', result.error)
      
      // Provide more specific error messages based on common issues
      let userFriendlyError = result.error
      
      if (result.error?.includes('unique constraint')) {
        userFriendlyError = 'Settings record conflict. Please refresh and try again.'
      } else if (result.error?.includes('foreign key')) {
        userFriendlyError = 'Invalid farm reference. Please check your permissions.'
      } else if (result.error?.includes('not null')) {
        userFriendlyError = 'Missing required field. Please check all settings.'
      }
      
      return NextResponse.json({ 
        error: userFriendlyError,
        technical_error: result.error // Include technical error for debugging
      }, { status: 400 })
    }

    console.log('✅ Settings updated successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Tagging settings updated successfully',
      settings: result.data
    })

  } catch (error) {
    console.error('❌ Unexpected error updating tagging settings:', error)
    
    // Provide more detailed error information in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return NextResponse.json({ 
      error: 'Internal server error',
      ...(isDevelopment && { technical_error: errorMessage, stack: error instanceof Error ? error.stack : undefined })
    }, { status: 500 })
  }
}