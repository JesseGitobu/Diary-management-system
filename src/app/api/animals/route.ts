import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createAnimal } from '@/lib/database/animals'

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
    
    console.log('🔍 [API] Creating animal with data:', animalData)
    const result = await createAnimal(userRole.farm_id, animalData)
    console.log('🔍 [API] Create animal result:', result)
    
    if (!result.success) {
      console.error('❌ [API] Failed to create animal:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    console.log('✅ [API] Animal created successfully')
    return NextResponse.json({ 
      success: true, 
      animal: result.data,
      message: 'Animal added successfully'
    })
    
  } catch (error) {
    console.error('❌ [API] Animals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] Animals GET request received')
    
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // You can add GET logic here later if needed
    return NextResponse.json({ message: 'Animals GET endpoint' })
    
  } catch (error) {
    console.error('❌ [API] Animals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}