// api/farms/[farmId]/animals/[id]/nutrition-targets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getAnimalNutritionTargets,
  upsertAnimalNutritionTargets,
  deleteAnimalNutritionTargets
} from '@/lib/database/animalFeedingRecords'

// GET nutrition targets for a specific animal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Await params before accessing properties
    const { farmId, id: animalId } = await params

    // Verify farm access
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied to this farm' }, { status: 403 })
    }
    
    // Get nutrition targets
    const targetsResult = await getAnimalNutritionTargets(
      farmId,
      animalId
    )
    
    if (!targetsResult.success) {
      return NextResponse.json({ error: targetsResult.error }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      targets: targetsResult.data
    })
    
  } catch (error) {
    console.error('Nutrition targets GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST/PUT nutrition targets for a specific animal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Await params before accessing properties
    const { farmId, id: animalId } = await params

    // Verify farm access
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied to this farm' }, { status: 403 })
    }

    // Only farm owners, managers, and workers can set nutrition targets
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.daily_dry_matter_kg || !body.daily_protein_kg || !body.daily_energy_mj) {
      return NextResponse.json({ 
        error: 'Missing required fields: daily_dry_matter_kg, daily_protein_kg, daily_energy_mj' 
      }, { status: 400 })
    }

    // Validate numeric values
    if (body.daily_dry_matter_kg <= 0 || body.daily_protein_kg <= 0 || body.daily_energy_mj <= 0) {
      return NextResponse.json({ 
        error: 'All nutritional values must be positive numbers' 
      }, { status: 400 })
    }
    
    // Upsert nutrition targets
    const targetsResult = await upsertAnimalNutritionTargets(
      farmId,
      animalId,
      {
        daily_dry_matter_kg: parseFloat(body.daily_dry_matter_kg),
        daily_protein_kg: parseFloat(body.daily_protein_kg),
        daily_energy_mj: parseFloat(body.daily_energy_mj),
        target_weight_gain_kg_per_day: body.target_weight_gain_kg_per_day ? parseFloat(body.target_weight_gain_kg_per_day) : undefined,
        milk_production_target_liters: body.milk_production_target_liters ? parseFloat(body.milk_production_target_liters) : undefined
      }
    )
    
    if (!targetsResult.success) {
      return NextResponse.json({ error: targetsResult.error }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      targets: targetsResult.data,
      message: 'Nutrition targets saved successfully'
    })
    
  } catch (error) {
    console.error('Nutrition targets POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE nutrition targets for a specific animal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Await params before accessing properties
    const { farmId, id: animalId } = await params

    // Verify farm access
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied to this farm' }, { status: 403 })
    }

    // Only farm owners and managers can delete nutrition targets
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Delete nutrition targets
    const result = await deleteAnimalNutritionTargets(
      farmId,
      animalId
    )
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Nutrition targets deleted successfully'
    })
    
  } catch (error) {
    console.error('Nutrition targets DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}