// src/app/api/farms/[farmId]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface FarmProfileData {
  name: string
  owner_name: string
  owner_phone: string
  owner_email: string
  farm_size_acres: number
  total_cows: number
  farm_type: 'Dairy Cattle' | 'Dairy Goat' | 'Mixed Dairy'
  county: string
  sub_county?: string
  village?: string
  preferred_currency: 'KSH' | 'USD'
  preferred_volume_unit: 'liters' | 'gallons'
  description?: string
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ farmId: string }> }
) {
  try {
    const params = await props.params
    const supabase = await createServerSupabaseClient()
    
    console.log('🔍 Processing farm profile update for farm:', params.farmId)
    
    // Get the current user
    const user = await getCurrentUser()
    
    if (!user) {
      console.error('❌ Unauthorized: No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 User:', user.id)

    const profileData: FarmProfileData = await request.json()

    // Validate required fields
    const validationError = validateProfileData(profileData)
    if (validationError) {
      console.error('❌ Validation error:', validationError)
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    console.log('✅ Data validated successfully')

    // 🎯 ENHANCED: Check if farm exists, if not create it
    const farmResult = await ensureFarmExists(supabase, params.farmId, user.id, profileData)
    
    if (!farmResult.success) {
      console.error('❌ Failed to ensure farm exists:', farmResult.error)
      return NextResponse.json({ 
        error: farmResult.error || 'Failed to process farm' 
      }, { status: 500 })
    }

    const actualFarmId = farmResult.farmId || params.farmId

    console.log('✅ Using farm ID:', actualFarmId)

    // Check if user has permission to edit farm profile
    const { data: roleResult, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type, farm_id')
      .eq('farm_id', actualFarmId)
      .eq('user_id', user.id)
      .single()

    // Cast to any to fix "Property 'role_type' does not exist on type 'never'"
    const userRole = roleResult as any

    if (roleError || !userRole) {
      console.error('❌ User role not found:', roleError)
      return NextResponse.json({ 
        error: 'Forbidden - User role not found' 
      }, { status: 403 })
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      console.error('❌ Insufficient permissions:', userRole.role_type)
      return NextResponse.json({ 
        error: 'Forbidden - Only farm owners and managers can edit profile' 
      }, { status: 403 })
    }

    console.log('✅ User has permission:', userRole.role_type)

    // Update farm profile across all tables
    const result = await updateFarmProfile(supabase, actualFarmId, user.id, profileData)

    if (!result.success) {
      console.error('❌ Failed to update farm profile:', result.error)
      return NextResponse.json({ 
        error: result.error || 'Failed to update farm profile' 
      }, { status: 500 })
    }

    console.log('✅ Farm profile updated successfully')

    return NextResponse.json({ 
      success: true,
      message: 'Farm profile updated successfully',
      farmId: actualFarmId,
      isNewFarm: farmResult.isNewFarm
    })
    
  } catch (error) {
    console.error('❌ Profile update error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// 🎯 NEW: Ensure farm exists, create if necessary
async function ensureFarmExists(
  supabase: any,
  farmId: string,
  userId: string,
  profileData: FarmProfileData
): Promise<{ success: boolean; farmId?: string; isNewFarm?: boolean; error?: string }> {
  try {
    console.log('🔍 Checking if farm exists:', farmId)

    // Check if the farmId is 'new' or similar placeholder
    const isPlaceholderFarmId = farmId === 'new' || farmId === 'create' || !farmId

    if (isPlaceholderFarmId) {
      console.log('🔍 Placeholder farm ID detected, creating new farm...')
      return await createNewFarm(supabase, userId, profileData)
    }

    // Check if farm exists in database
    const { data: existingFarm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .maybeSingle()

    if (farmError) {
      console.error('❌ Error checking farm existence:', farmError)
      // If farm doesn't exist, create it
      if (farmError.code === 'PGRST116') {
        console.log('🔍 Farm not found, creating new farm...')
        return await createNewFarm(supabase, userId, profileData)
      }
      throw farmError
    }

    if (!existingFarm) {
      console.log('🔍 Farm not found in database, creating new farm...')
      return await createNewFarm(supabase, userId, profileData)
    }

    console.log('✅ Farm exists:', farmId)
    return { success: true, farmId, isNewFarm: false }

  } catch (error) {
    console.error('❌ Error in ensureFarmExists:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 🎯 NEW: Create a new farm with all related records
async function createNewFarm(
  supabase: any,
  userId: string,
  profileData: FarmProfileData
): Promise<{ success: boolean; farmId?: string; isNewFarm: boolean; error?: string }> {
  try {
    console.log('🔍 Creating new farm for user:', userId)

    // 1. Create the farm
    const { data: newFarm, error: farmError } = await supabase
      .from('farms')
      .insert({
        name: profileData.name,
        location: `${profileData.village || ''}, ${profileData.sub_county || ''}, ${profileData.county}`.trim(),
        farm_type: profileData.farm_type.toLowerCase().replace(' ', '_'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (farmError) {
      console.error('❌ Error creating farm:', farmError)
      throw new Error(`Failed to create farm: ${farmError.message}`)
    }

    console.log('✅ Farm created:', newFarm.id)

    // 2. Create or update user role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingRole) {
      // Update existing role with new farm_id
      const { error: roleUpdateError } = await supabase
        .from('user_roles')
        .update({
          farm_id: newFarm.id,
          status: 'active'
        })
        .eq('user_id', userId)

      if (roleUpdateError) {
        console.error('❌ Error updating user role:', roleUpdateError)
        throw new Error(`Failed to update user role: ${roleUpdateError.message}`)
      }
      console.log('✅ User role updated with new farm_id')
    } else {
      // Create new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          farm_id: newFarm.id,
          role_type: 'farm_owner',
          status: 'active'
        })

      if (roleError) {
        console.error('❌ Error creating user role:', roleError)
        throw new Error(`Failed to create user role: ${roleError.message}`)
      }
      console.log('✅ User role created')
    }

    // 3. Create farm_profiles entry
    const { error: profileError } = await supabase
      .from('farm_profiles')
      .upsert({
        user_id: userId,
        farm_id: newFarm.id,
        farm_name: profileData.name,
        location: `${profileData.county}${profileData.sub_county ? ', ' + profileData.sub_county : ''}`,
        herd_size: profileData.total_cows,
        onboarding_completed: false,
        completion_percentage: 50, // 50% because they're filling profile
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('⚠️ Warning: Failed to create farm profile:', profileError)
      // Don't fail, continue
    } else {
      console.log('✅ Farm profile created')
    }

    // 4. Create farm_profile_settings entry
    const { error: settingsError } = await supabase
      .from('farm_profile_settings')
      .insert({
        farm_id: newFarm.id,
        user_id: userId,
        farm_name: profileData.name,
        farm_type: profileData.farm_type,
        description: profileData.description || null,
        owner_name: profileData.owner_name,
        owner_phone: profileData.owner_phone,
        owner_email: profileData.owner_email,
        farm_size_acres: profileData.farm_size_acres,
        total_cows: profileData.total_cows,
        county: profileData.county,
        sub_county: profileData.sub_county || null,
        village: profileData.village || null,
        preferred_currency: profileData.preferred_currency,
        preferred_volume_unit: profileData.preferred_volume_unit
      })

    if (settingsError) {
      console.error('⚠️ Warning: Failed to create farm profile settings:', settingsError)
      // Don't fail, continue
    } else {
      console.log('✅ Farm profile settings created')
    }

    return { 
      success: true, 
      farmId: newFarm.id,
      isNewFarm: true 
    }

  } catch (error) {
    console.error('❌ Error in createNewFarm:', error)
    return {
      success: false,
      isNewFarm: true,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Validation function
function validateProfileData(data: FarmProfileData): string | null {
  if (!data.name || data.name.trim().length === 0) {
    return 'Farm name is required'
  }

  if (!data.owner_name || data.owner_name.trim().length === 0) {
    return 'Owner name is required'
  }

  if (!data.owner_phone || data.owner_phone.trim().length === 0) {
    return 'Owner phone is required'
  }

  if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(data.owner_phone)) {
    return 'Invalid phone number format'
  }

  if (!data.owner_email || data.owner_email.trim().length === 0) {
    return 'Owner email is required'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.owner_email)) {
    return 'Invalid email format'
  }

  if (data.farm_size_acres < 0) {
    return 'Farm size cannot be negative'
  }

  if (data.total_cows < 0) {
    return 'Total cows cannot be negative'
  }

  if (!data.county || data.county.trim().length === 0) {
    return 'County is required'
  }

  if (!['Dairy Cattle', 'Dairy Goat', 'Mixed Dairy'].includes(data.farm_type)) {
    return 'Invalid farm type'
  }

  if (!['KSH', 'USD'].includes(data.preferred_currency)) {
    return 'Invalid currency'
  }

  if (!['liters', 'gallons'].includes(data.preferred_volume_unit)) {
    return 'Invalid volume unit'
  }

  return null
}

// Main update function that handles all tables
async function updateFarmProfile(
  supabase: any,
  farmId: string,
  userId: string,
  profileData: FarmProfileData
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update the farms table (basic farm info)
    console.log('🔄 Updating farms table...')
    const { error: farmsError } = await supabase
      .from('farms')
      .update({
        name: profileData.name,
        location: `${profileData.village || ''}, ${profileData.sub_county || ''}, ${profileData.county}`.trim(),
        farm_type: profileData.farm_type.toLowerCase().replace(' ', '_'),
        updated_at: new Date().toISOString()
      })
      .eq('id', farmId)

    if (farmsError) {
      console.error('❌ Error updating farms table:', farmsError)
      throw new Error(`Failed to update farms table: ${farmsError.message}`)
    }
    console.log('✅ Farms table updated')

    // 2. Upsert into farm_profile_settings (detailed settings)
    console.log('🔄 Upserting farm_profile_settings...')
    const { error: settingsError } = await supabase
      .from('farm_profile_settings')
      .upsert({
        farm_id: farmId,
        user_id: userId,
        farm_name: profileData.name,
        farm_type: profileData.farm_type,
        description: profileData.description || null,
        owner_name: profileData.owner_name,
        owner_phone: profileData.owner_phone,
        owner_email: profileData.owner_email,
        farm_size_acres: profileData.farm_size_acres,
        total_cows: profileData.total_cows,
        county: profileData.county,
        sub_county: profileData.sub_county || null,
        village: profileData.village || null,
        preferred_currency: profileData.preferred_currency,
        preferred_volume_unit: profileData.preferred_volume_unit,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'farm_id'
      })

    if (settingsError) {
      console.error('❌ Error upserting farm_profile_settings:', settingsError)
      throw new Error(`Failed to update profile settings: ${settingsError.message}`)
    }
    console.log('✅ Farm_profile_settings upserted')

    // 3. Update farm_profiles table (onboarding data)
    console.log('🔄 Updating farm_profiles...')
    const { error: profilesError } = await supabase
      .from('farm_profiles')
      .upsert({
        user_id: userId,
        farm_id: farmId,
        farm_name: profileData.name,
        location: `${profileData.county}${profileData.sub_county ? ', ' + profileData.sub_county : ''}`,
        herd_size: profileData.total_cows,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (profilesError) {
      console.error('❌ Error updating farm_profiles:', profilesError)
      // Don't throw here, farm_profiles might not exist for all users
      console.log('⚠️ Warning: Could not update farm_profiles (may not exist)')
    } else {
      console.log('✅ Farm_profiles updated')
    }

    return { success: true }
    
  } catch (error) {
    console.error('❌ Exception in updateFarmProfile:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

// GET endpoint to retrieve farm profile settings
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ farmId: string }> }
) {
  try {
    const params = await props.params
    const supabase = await createServerSupabaseClient()
    
    console.log('🔍 Fetching farm profile for farm:', params.farmId)
    
    // Get the current user
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this farm
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('farm_id', params.farmId)
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get farm profile settings
    const { data: settings, error: settingsError } = await supabase
      .from('farm_profile_settings')
      .select('*')
      .eq('farm_id', params.farmId)
      .single()

    if (settingsError) {
      console.error('❌ Error fetching farm profile settings:', settingsError)
      return NextResponse.json({ 
        error: 'Farm profile not found' 
      }, { status: 404 })
    }

    console.log('✅ Farm profile fetched successfully')

    return NextResponse.json({ 
      success: true,
      data: settings
    })
    
  } catch (error) {
    console.error('❌ Profile fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}