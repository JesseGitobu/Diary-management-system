// Generate signed URLs for private storage access
// src/app/api/health/records/images/signed-url/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

export async function POST(request: NextRequest) {
  const operationId = `SIGN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`
  
  try {
    console.log(`\n🔐 ========== SIGNED URL REQUEST ==========`)
    console.log(`🔐 Operation ID: ${operationId}`)
    
    const user = await getCurrentUser()
    
    if (!user) {
      console.log(`❌ ${operationId}: No authenticated user`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log(`✅ ${operationId}: User authenticated: ${user.id}`)
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      console.log(`❌ ${operationId}: No farm associated`)
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    console.log(`✅ ${operationId}: Farm ID: ${userRole.farm_id}`)

    const { imageId } = await request.json()
    
    if (!imageId) {
      console.log(`❌ ${operationId}: No imageId provided`)
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      )
    }
    console.log(`🔐 ${operationId}: Image ID: ${imageId}`)

    const supabase = await createServerSupabaseClient()
    
    // Verify the image exists and belongs to the user's farm
    console.log(`🔍 ${operationId}: Verifying image access...`)
    const { data: image, error: imageError } = await (supabase as any)
      .from('health_record_images')
      .select('id, storage_path, farm_id, health_record_id')
      .eq('id', imageId)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (imageError || !image) {
      console.log(`❌ ${operationId}: Image not found or access denied`)
      return NextResponse.json(
        { error: 'Image not found or access denied' },
        { status: 404 }
      )
    }
    console.log(`✅ ${operationId}: Image verified - storage_path: ${image.storage_path}`)

    // Generate signed URL (valid for 1 hour)
    console.log(`🔐 ${operationId}: Generating signed URL (expires in 3600 seconds)...`)
    const { data: signedUrlData, error: signedUrlError } = await (supabase
      .storage
      .from('farm-documents') as any)
      .createSignedUrl(image.storage_path, 3600)
    
    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(`❌ ${operationId}: Failed to generate signed URL:`, signedUrlError)
      return NextResponse.json(
        { error: 'Failed to generate image URL' },
        { status: 500 }
      )
    }
    
    const signedUrl = signedUrlData.signedUrl
    console.log(`✅ ${operationId}: Signed URL generated successfully`)
    console.log(`🔐 ${operationId}: URL expires in 1 hour (3600 seconds)`)

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn: 3600,
      imageId,
      operationId
    })

  } catch (error) {
    console.error(`\n❌ ${operationId}: ========== ERROR ==========`)
    console.error(`❌ ${operationId}:`, error)
    return NextResponse.json(
      { error: 'Internal server error', operationId },
      { status: 500 }
    )
  }
}
