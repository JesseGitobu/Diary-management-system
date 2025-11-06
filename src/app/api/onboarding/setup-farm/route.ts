// src/app/api/onboarding/setup-farm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole || userRole.role_type !== 'farm_owner') {
      return NextResponse.json({ error: 'Invalid user state' }, { status: 400 })
    }
    
    const body = await request.json()
    const { data } = body
    
    console.log('🔍 Setting up farm for user:', user.id, 'with data:', data)
    
    // Create or update farm
    const result = await setupFarmForUser(user.id, userRole, data)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      farm: result.farm,
      message: 'Farm setup completed'
    })
    
  } catch (error) {
    console.error('Setup farm API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function setupFarmForUser(userId: string, userRole: any, farmData: any) {
  const supabase = await createServerSupabaseClient()
  
  try {
    let farm;
    
    // Check if farm already exists
    if (userRole.farm_id) {
      console.log('🔍 Updating existing farm:', userRole.farm_id)
      
      // Update existing farm
      const { data: updatedFarm, error: farmError } = await supabase
        .from('farms')
        .update({
          name: farmData.farm_name,
          location: farmData.location,
          farm_type: farmData.farm_type,
        })
        .eq('id', userRole.farm_id)
        .select()
        .single()

      if (farmError) {
        console.error('❌ Error updating farm:', farmError)
        throw farmError
      }
      
      farm = updatedFarm
    } else {
      console.log('🔍 Creating new farm for user:', userId)
      
      // Create new farm
      const { data: newFarm, error: farmError } = await supabase
        .from('farms')
        .insert({
          name: farmData.farm_name,
          location: farmData.location,
          farm_type: farmData.farm_type,
        })
        .select()
        .single()

      if (farmError) {
        console.error('❌ Error creating farm:', farmError)
        throw farmError
      }

      console.log('✅ Farm created:', newFarm.id)

      // Update user role with farm_id
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({
          farm_id: newFarm.id,
        })
        .eq('user_id', userId)
        .eq('role_type', 'farm_owner')

      if (roleError) {
        console.error('❌ Error updating user role:', roleError)
        throw roleError
      }

      console.log('✅ User role updated with farm_id')
      farm = newFarm
    }

    // Create or update farm profile
    const { error: profileError } = await supabase
      .from('farm_profiles')
      .upsert({
        user_id: userId,
        farm_id: farm.id,
        farm_name: farmData.farm_name,
        location: farmData.location,
        herd_size: farmData.herd_size,
        onboarding_completed: false,
        completion_percentage: 25, // First step complete
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('❌ Error upserting farm profile:', profileError)
      throw profileError
    }

    console.log('✅ Farm profile upserted')

    return { success: true, farm }
    
  } catch (error) {
    console.error('Error setting up farm for user:', error)
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return { success: false, error: errorMessage }
  }
}