// src/app/api/distribution/calf-feeding/adjustments/route.ts
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Fetch adjustments for the specified date
    const { data: adjustments, error } = await supabase
      .from('calf_feeding_adjustments')
      .select(`
        id,
        animal_id,
        adjustment_date,
        adjustments,
        created_at,
        created_by,
        animals (
          id,
          tag_number,
          name
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .eq('adjustment_date', date)

    if (error) {
      console.error('Error fetching adjustments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch adjustments' },
        { status: 500 }
      )
    }

    return NextResponse.json(adjustments || [])
  } catch (error) {
    console.error('Error fetching calf feeding adjustments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { date, adjustments } = body

    if (!date || !Array.isArray(adjustments)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // First, resolve calfIds to animal IDs
    const calfIds = adjustments.map((adj: any) => adj.calfId)
    
    const { data: animals, error: animalsError } = await supabase
      .from('animals')
      .select('id, tag_number')
      .eq('farm_id', userRole.farm_id)
      .in('id', calfIds)

    if (animalsError) {
      console.error('Error fetching animals:', animalsError)
      return NextResponse.json(
        { error: 'Failed to fetch animal records' },
        { status: 400 }
      )
    }

    // Create a map of calfId to animal ID (calfId should be the animal ID from the frontend)
    const animalMap = new Map((animals as any[]).map((a: any) => [a.id, a]))

    // Prepare adjustments for insertion
    const storedAdjustments = adjustments.map((adj: any) => ({
      farm_id: userRole.farm_id as string,
      animal_id: adj.calfId as string, // This should already be the animal ID from frontend
      adjustment_date: date as string,
      adjustments: adj.sessions as any, // Array of { sessionNumber, adjustedAmount }
      created_by: user.id as string
    }))

    // Insert adjustments into the table
    const { data: insertedAdjustments, error: insertError } = await supabase
      .from('calf_feeding_adjustments')
      .insert(storedAdjustments as any)
      .select()

    if (insertError) {
      console.error('Error saving calf feeding adjustments:', insertError)
      return NextResponse.json(
        { error: 'Failed to save adjustments to database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Feeding plan adjustments saved successfully',
      adjustmentsCount: adjustments.length,
      adjustments: insertedAdjustments
    })
  } catch (error) {
    console.error('Error saving calf feeding adjustments:', error)
    return NextResponse.json(
      { error: 'Failed to save adjustments' },
      { status: 500 }
    )
  }
}
