// src/app/api/animals/[id]/health-records/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    
    const { id: animalId } = await params
    const supabase = await createServerSupabaseClient()
    
    // First verify the animal belongs to the user's farm
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id, farm_id')
      .eq('id', animalId)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (animalError || !animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    // FIXED: Specify the exact relationship to avoid ambiguity
    const { data: records, error } = await supabase
      .from('animal_health_records')
      .select(`
        id,
        animal_id,
        record_date,
        record_type,
        description,
        veterinarian,
        cost,
        notes,
        next_due_date,
        medication,
        severity,
        symptoms,
        treatment,
        is_auto_generated,
        completion_status,
        created_at
      `)
      .eq('animal_id', animalId)
      .eq('farm_id', userRole.farm_id)
      .order('record_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching animal health records:', error)
      return NextResponse.json({ error: 'Failed to fetch health records' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      records: records || [],
      total: records?.length || 0
    })
    
  } catch (error) {
    console.error('Animal health records API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}