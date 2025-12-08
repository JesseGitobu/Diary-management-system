import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Query the new table structure
    const { data: incompleteRecords, error } = await supabase
      .from('animals_requiring_health_attention')
      .select(`
        *,
        animals!animals_requiring_health_attention_animal_id_fkey (
          id,
          tag_number,
          name,
          breed,
          health_status
        ),
        animal_health_records!animals_requiring_health_attention_health_record_id_fkey (
          id,
          record_type,
          description,
          severity,
          completion_status,
          requires_record_type_selection,
          available_record_types,
          original_health_status
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .eq('health_record_completed', false)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching incomplete records:', error)
      return NextResponse.json({ error: 'Failed to fetch incomplete records' }, { status: 500 })
    }
    
    // Transform the data to match the expected format
    // Cast record to any to fix "Property 'health_record_id' does not exist on type 'never'"
    const transformedRecords = (incompleteRecords || []).map((record: any) => ({
      id: record.health_record_id || record.id,
      animal_id: record.animal_id,
      description: record.animal_health_records?.description || `Health attention needed for ${record.animals?.name || record.animals?.tag_number}`,
      severity: record.animal_health_records?.severity || 'medium',
      is_missing_record: true,
      animals: record.animals,
      animal: record.animals, // Backwards compatibility
      record_type: record.animal_health_records?.record_type || 'checkup',
      requires_record_type_selection: record.animal_health_records?.requires_record_type_selection || false,
      available_record_types: record.animal_health_records?.available_record_types || [],
      original_health_status: record.animal_health_records?.original_health_status
    }))
    
    return NextResponse.json({ 
      success: true, 
      records: transformedRecords 
    })
    
  } catch (error) {
    console.error('Error in incomplete records API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}