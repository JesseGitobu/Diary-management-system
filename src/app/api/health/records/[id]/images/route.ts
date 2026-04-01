// Health Record Images API Route
// src/app/api/health/records/[id]/images/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

// GET images for a specific health record
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
    
    const { id } = await params
    
    const supabase = await createServerSupabaseClient()
    
    // First verify the record belongs to this farm and user has access
    const { data: record, error: recordError } = await supabase
      .from('animal_health_records')
      .select('id, farm_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (recordError || !record) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 })
    }
    
    // Fetch images for this record
    const { data: images, error: imagesError } = await supabase
      .from('health_record_images')
      .select('id, image_url, image_title, image_description, uploaded_at, created_at')
      .eq('health_record_id', id)
      .eq('farm_id', userRole.farm_id)
      .order('uploaded_at', { ascending: false })
    
    if (imagesError) {
      console.error('Error fetching health record images:', imagesError)
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      images: images || [],
      count: images?.length || 0
    })
    
  } catch (error) {
    console.error('Health record images GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
