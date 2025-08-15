// Health Records API Route
// src/app/api/health/records/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createHealthRecord } from '@/lib/database/health'

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
    
    const body = await request.json()
    const { 
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
      farm_id 
    } = body
    
    // Verify the animal belongs to the user's farm
    const result = await createHealthRecord({
      animal_id,
      record_date,
      record_type,
      description,
      veterinarian: veterinarian || null,
      cost: cost || 0,
      notes: notes || null,
      next_due_date: next_due_date || null,
      medication: medication || null,
      severity: severity || null,
      created_by: user.id,
      farm_id: userRole.farm_id
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      record: result.data,
      message: 'Health record added successfully'
    })
    
  } catch (error) {
    console.error('Health records API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    
    // First, get the animal IDs for the user's farm
    const { data: animalIdsData, error: animalIdsError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', userRole.farm_id);

    if (animalIdsError) {
      console.error('Error fetching animal IDs:', animalIdsError);
      return NextResponse.json({ error: 'Failed to fetch animal IDs' }, { status: 500 });
    }

    const animalIds = (animalIdsData ?? []).map((a: { id: string }) => a.id);

    const { data: healthRecords, error } = await supabase
      .from('animal_health_records')
      .select(`
        *,
        animals (
          id,
          name,
          tag_number
        )
      `)
      .in('animal_id', animalIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching health records:', error)
      return NextResponse.json({ error: 'Failed to fetch health records' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      healthRecords: healthRecords || [] 
    })
    
  } catch (error) {
    console.error('Health records API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
