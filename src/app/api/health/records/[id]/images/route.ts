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
      console.error('Health record not found error:', recordError)
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 })
    }
    
    // Fetch images for this record - select all available columns
    // Cast to 'any' because health_record_images table type not yet generated in Supabase schema
    const { data: images, error: imagesError } = await (supabase as any)
      .from('health_record_images')
      .select('id, image_url, image_title, image_description, image_size, mime_type, storage_path, uploaded_by, uploaded_at, created_at')
      .eq('health_record_id', id)
      .eq('farm_id', userRole.farm_id)
      .order('uploaded_at', { ascending: false })
    
    if (imagesError) {
      console.error('Error fetching health record images:', imagesError)
      console.error('Error details:', {
        message: imagesError.message,
        code: imagesError.code,
        details: imagesError.details,
        hint: imagesError.hint
      })
      return NextResponse.json({ 
        error: 'Failed to fetch images',
        details: imagesError.message
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      images: images || [],
      count: images?.length || 0
    })
    
  } catch (error) {
    console.error('Health record images GET API error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
}

// POST - Add image record to health record (metadata only, image upload is separate)
export async function POST(
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
    const body = await request.json()
    
    const {
      image_url,
      image_title,
      image_description,
      image_size,
      mime_type,
      storage_path
    } = body
    
    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Verify record exists and belongs to this farm
    const { data: record, error: recordError } = await supabase
      .from('animal_health_records')
      .select('id, farm_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (recordError || !record) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 })
    }
    
    // Insert image record - Cast to 'any' because health_record_images table type not yet generated
    const { data: imageRecord, error: insertError } = await (supabase as any)
      .from('health_record_images')
      .insert({
        health_record_id: id,
        farm_id: userRole.farm_id,
        image_url,
        image_title: image_title || null,
        image_description: image_description || null,
        image_size: image_size || null,
        mime_type: mime_type || null,
        storage_path: storage_path || null,
        uploaded_by: user.id
      })
      .select('id, image_url, image_title, image_description, image_size, mime_type, storage_path, uploaded_by, uploaded_at, created_at')
      .single()
    
    if (insertError) {
      console.error('Error inserting health record image:', insertError)
      return NextResponse.json({
        error: 'Failed to insert image record',
        details: insertError.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      image: imageRecord
    }, { status: 201 })
    
  } catch (error) {
    console.error('Health record images POST API error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
}
