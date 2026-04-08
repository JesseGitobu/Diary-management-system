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
    
    // Query the real-time animal_health_status_attention view
    const { data: incompleteRecords, error } = await supabase
      .from('animal_health_status_attention')
      .select(`
        id,
        farm_id,
        tag_number,
        name,
        health_status,
        production_status,
        last_health_check,
        attention_required,
        priority_rank
      `)
      .eq('farm_id', userRole.farm_id)
      .eq('attention_required', true)
      .lt('priority_rank', 4)
      .order('priority_rank', { ascending: true })
      .order('last_health_check', { ascending: true })
    
    if (error) {
      console.error('Error fetching incomplete records:', error)
      return NextResponse.json({ error: 'Failed to fetch incomplete records' }, { status: 500 })
    }
    
    // Transform the data to match the expected format
    const transformedRecords = (incompleteRecords || []).map((record: any) => ({
      id: record.id,
      animal_id: record.id,
      description: record.attention_required || `Health attention needed for ${record.name || record.tag_number}`,
      severity: record.priority_rank === 1 ? 'high' : record.priority_rank === 2 ? 'high' : 'medium',
      is_missing_record: true,
      animals: {
        id: record.id,
        tag_number: record.tag_number,
        name: record.name,
        health_status: record.health_status
      },
      animal: {
        id: record.id,
        tag_number: record.tag_number,
        name: record.name,
        health_status: record.health_status
      },
      record_type: 'health_check',
      priority_rank: record.priority_rank,
      last_health_check: record.last_health_check
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