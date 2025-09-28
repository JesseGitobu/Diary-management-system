// /app/api/animals/[id]/health-attention/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 [API] Animals Requiring Health Attention GET request received')
    
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const { id: animalId } = await params
    const supabase = await createServerSupabaseClient()
    
    // Check if this animal is in the animals_requiring_health_attention view
    const { data: attentionRecord, error } = await supabase
      .from('animals_requiring_health_attention')
      .select(`
        id,
        tag_number,
        name,
        breed,
        health_status,
        requires_health_record,
        health_record_created,
        health_record_completed,
        health_concern_notes,
        auto_health_record_id,
        health_record_id,
        record_type,
        health_record_description,
        severity,
        completion_status,
        is_auto_generated,
        health_record_created_at
      `)
      .eq('id', animalId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking animals requiring health attention:', error)
      return NextResponse.json({ error: 'Failed to check health attention status' }, { status: 500 })
    }
    
    // If no record found, animal doesn't require attention
    if (!attentionRecord) {
      return NextResponse.json({ 
        requiresAttention: false,
        record: null
      })
    }
    
    console.log(`Animal ${animalId} requires health attention:`, attentionRecord)
    
    return NextResponse.json({ 
      requiresAttention: true,
      record: attentionRecord
    })
    
  } catch (error) {
    console.error('❌ [API] Animals Requiring Health Attention error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}