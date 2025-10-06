import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { releaseAnimal, getAnimalById, getAnimalReleaseInfo } from '@/lib/database/animals'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Only farm owners and managers can release animals
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const animalId = params.id
    
    // Validate required fields
    if (!body.release_reason || !body.release_date || !body.notes) {
      return NextResponse.json({ 
        error: 'Missing required fields: release_reason, release_date, notes' 
      }, { status: 400 })
    }
    
    // Validate release reason
    const validReasons = ['sold', 'died', 'transferred', 'culled', 'other']
    if (!validReasons.includes(body.release_reason)) {
      return NextResponse.json({ 
        error: 'Invalid release reason. Must be one of: ' + validReasons.join(', ')
      }, { status: 400 })
    }
    
    // Validate date
    const releaseDate = new Date(body.release_date)
    const today = new Date()
    if (releaseDate > today) {
      return NextResponse.json({ 
        error: 'Release date cannot be in the future' 
      }, { status: 400 })
    }
    
    // Check if animal exists and belongs to farm
    const existingAnimal = await getAnimalById(animalId)
    if (!existingAnimal) {
      return NextResponse.json({ 
        error: 'Animal not found or does not belong to your farm' 
      }, { status: 404 })
    }
    
    // Check if animal is already released
    if (existingAnimal.status === 'released') {
      return NextResponse.json({ 
        error: 'Animal has already been released' 
      }, { status: 400 })
    }
    
    // Validate conditional fields based on release reason
    if (body.release_reason === 'sold') {
      if (body.sale_price && (isNaN(body.sale_price) || body.sale_price < 0)) {
        return NextResponse.json({ 
          error: 'Sale price must be a valid positive number' 
        }, { status: 400 })
      }
    }
    
    if (body.release_reason === 'died' && !body.death_cause) {
      return NextResponse.json({ 
        error: 'Death cause is required when release reason is "died"' 
      }, { status: 400 })
    }
    
    if (body.release_reason === 'transferred' && !body.transfer_location) {
      return NextResponse.json({ 
        error: 'Transfer location is required when release reason is "transferred"' 
      }, { status: 400 })
    }
    
    const result = await releaseAnimal(animalId, userRole.farm_id, body, user.id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Animal successfully released. Reason: ${body.release_reason}`,
      release_id: (result as any).releaseId ?? null
    })
    
  } catch (error) {
    console.error('Release animal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET release information for an animal
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const animalId = context.params.id
    const releaseInfo = await getAnimalReleaseInfo(animalId, userRole.farm_id)
    
    if (!releaseInfo) {
      return NextResponse.json({ 
        error: 'No release information found for this animal' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      release_info: releaseInfo 
    })
    
  } catch (error) {
    console.error('Get release info API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}