// app/api/settings/feed-management/animal-categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getAnimalCategories, 
  createAnimalCategory 
} from '@/lib/database/feedManagementSettings'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const categories = await getAnimalCategories(userRole.farm_id)
    
    return NextResponse.json({ 
      success: true, 
      data: categories 
    })
    
  } catch (error) {
    console.error('Animal categories GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    
    const result = await createAnimalCategory(userRole.farm_id, body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Animal category created successfully'
    })
    
  } catch (error) {
    console.error('Animal categories POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}