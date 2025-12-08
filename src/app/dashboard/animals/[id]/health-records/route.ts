import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
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
    
    const params = await props.params
    const supabase = await createServerSupabaseClient()
    
    // Verify animal belongs to user's farm
    const { data: animalResult, error: animalError } = await supabase
      .from('animals')
      .select('farm_id')
      .eq('id', params.id)
      .single()
    
    // Cast to any to fix "Property 'farm_id' does not exist on type 'never'"
    const animal = animalResult as any

    if (animalError || !animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    if (animal.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Get health records
    const { data: records, error: recordsError } = await supabase
      .from('animal_health_records')
      .select('*')
      .eq('animal_id', params.id)
      .order('record_date', { ascending: false })
    
    if (recordsError) {
      console.error('Error fetching health records:', recordsError)
      return NextResponse.json({ error: 'Failed to fetch health records' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      records: records || []
    })
    
  } catch (error) {
    console.error('Health records GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
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
    
    // Check permissions - farm owners, managers, and workers can add health records
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { record_date, record_type, description, veterinarian, cost, notes } = body
    
    // Validate required fields
    if (!record_date || !record_type || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: record_date, record_type, description' 
      }, { status: 400 })
    }
    
    // Validate record_type
    const validRecordTypes = ['vaccination', 'treatment', 'checkup', 'injury', 'illness']
    if (!validRecordTypes.includes(record_type)) {
      return NextResponse.json({ 
        error: 'Invalid record_type. Must be one of: ' + validRecordTypes.join(', ')
      }, { status: 400 })
    }
    
    const params = await props.params
    const supabase = await createServerSupabaseClient()
    
    // Verify animal belongs to user's farm
    const { data: animalResult, error: animalError } = await supabase
      .from('animals')
      .select('farm_id')
      .eq('id', params.id)
      .single()
    
    // Cast to any here as well
    const animal = animalResult as any

    if (animalError || !animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    if (animal.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Create health record
    // Cast supabase to any to prevent insert type error
    const { data: record, error: recordError } = await (supabase as any)
      .from('animal_health_records')
      .insert({
        animal_id: params.id,
        record_date,
        record_type,
        description,
        veterinarian: veterinarian || null,
        cost: cost ? parseFloat(cost) : null,
        notes: notes || null,
      })
      .select()
      .single()
    
    if (recordError) {
      console.error('Error creating health record:', recordError)
      return NextResponse.json({ 
        error: 'Failed to create health record: ' + recordError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      record,
      message: 'Health record added successfully'
    })
    
  } catch (error) {
    console.error('Create health record API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}